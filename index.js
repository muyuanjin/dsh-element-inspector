import { readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { isDshPackage } from './dsh-metadata.js'
import { discoverRuntimeCandidates, loaderEntriesFromContext } from './runtime-candidates.js'
import { extractSignals, scorePackages } from './scoring.js'
import { openExternal, profileDirectoryFromBaseUrl, revealDirectory, validatePackageName } from './portability.js'

export const name = 'dsh-element-inspector'
export const inject = ['webServer']

const PATH = '/__dsh-element-inspector/resolve'
const OPEN_FOLDER_PATH = '/__dsh-element-inspector/open-folder'
const OPEN_REPOSITORY_PATH = '/__dsh-element-inspector/open-repository'
const MAX_FILE_BYTES = 1_000_000
const MAX_RESULTS = 8
const SOURCE_CACHE_TTL = 5_000
const SETTINGS_NAMESPACE = settingsNamespace(name)
const sourceCache = new Map()
const HiddenNodeSchema = z.object({
  id: z.string().default(''),
  classes: z.array(z.string()).default([]),
  attrs: z.dict(z.string()).default({}),
  tag: z.string().default(''),
  nth: z.number().default(0),
})
const HiddenRuleSchema = z.object({
  ...HiddenNodeSchema.dict,
  text: z.string().default(''),
  version: z.number().default(1),
  ancestors: z.array(HiddenNodeSchema).default([]),
})
const SettingsSchema = z.object({
  hotkey: z.string().default('F1'),
  hidden: z.array(HiddenRuleSchema).default([]),
})

function json(res, status, value) {
  const body = JSON.stringify(value)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

async function bodyOf(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  if (Buffer.concat(chunks).length > 32_000) throw new Error('request is too large')
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function string(value, max = 180) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function repositoryUrl(manifest) {
  const value = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url
  const candidate = string(value, 500) || string(manifest.homepage, 500)
  if (!candidate) return ''
  const normalized = candidate.replace(/^git\+/, '').replace(/^git@github\.com:/, 'https://github.com/')
  return /^https?:\/\//i.test(normalized) ? normalized : ''
}

function clientEntries(query) {
  const values = Array.isArray(query?.clientEntries) ? query.clientEntries : []
  return [...new Set(values.filter(value => typeof value === 'string' && value.length <= 400))].slice(0, 160)
}

async function packageDetails(authorizedPackages, packageName) {
  validatePackageName(packageName)
  const candidate = authorizedPackages.get(packageName)
  if (!candidate || candidate.ownerType !== 'plugin') throw new Error('package is not an active UI candidate')
  return candidate
}

async function inspectPackage(candidate) {
  const cached = sourceCache.get(candidate.root)
  if (cached && Date.now() - cached.createdAt < SOURCE_CACHE_TTL) return cached.value
  const files = []
  for (const file of candidate.files) {
    let source
    try {
      const info = await stat(file)
      if (info.size > MAX_FILE_BYTES) continue
      source = await readFile(file, 'utf8')
    } catch { continue }
    files.push({ file: relative(candidate.root, file), source })
  }
  const value = {
    packageName: candidate.packageName,
    ownerType: isDshPackage(candidate.packageName) ? 'dsh' : 'plugin',
    version: candidate.manifest.version ?? 'unknown',
    repositoryUrl: repositoryUrl(candidate.manifest),
    files,
  }
  sourceCache.set(candidate.root, { createdAt: Date.now(), value })
  return value
}

async function runtimePackages(ctx, profileDir, query) {
  return discoverRuntimeCandidates(profileDir, {
    clientEntries: clientEntries(query),
    loaderEntries: loaderEntriesFromContext(ctx),
    inspectorName: name,
  })
}

async function resolveOwnership(ctx, profileDir, query, authorizedPackages) {
  const candidates = await runtimePackages(ctx, profileDir, query)
  const packages = await Promise.all(candidates.map(inspectPackage))
  authorizedPackages.clear()
  for (const candidate of candidates) {
    if (isDshPackage(candidate.packageName)) continue
    authorizedPackages.set(candidate.packageName, {
      ownerType: 'plugin',
      root: candidate.root,
      repositoryUrl: repositoryUrl(candidate.manifest),
    })
  }
  const outcome = scorePackages(packages, extractSignals(query))
  return { query: { ...query, clientEntries: undefined, runtimeRegistrations: undefined }, certainty: outcome.certainty, reasons: outcome.reasons, results: outcome.results.slice(0, MAX_RESULTS) }
}

async function activeProfileDirectory(baseUrl) {
  const candidate = profileDirectoryFromBaseUrl(baseUrl)
  const manifest = JSON.parse(await readFile(join(candidate, 'package.json'), 'utf8'))
  if (manifest.dsh?.profile?.bundles?.includes(name) || manifest.dependencies?.[name] !== undefined) return candidate
  throw new Error('the active DSH profile does not declare this plugin')
}

export function apply(ctx) {
  const authorizedPackages = new Map()
  ctx.inject(['settings'], settingsCtx => {
    settingsCtx.settings.register(SETTINGS_NAMESPACE, SettingsSchema)
  })
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: PATH,
    handler: async (req, res) => {
      if (req.method !== 'POST') return json(res, 405, { error: 'method-not-allowed' })
      try {
        const query = await bodyOf(req)
        const profileDir = await activeProfileDirectory(ctx.baseUrl)
        return json(res, 200, await resolveOwnership(ctx, profileDir, query, authorizedPackages))
      } catch (error) {
        ctx.logger?.warn?.(`[${name}] resolve failed: ${String(error)}`)
        return json(res, 400, { error: 'resolve-failed', message: error instanceof Error ? error.message : String(error) })
      }
    },
  }), `${name}: source lookup route`)
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: OPEN_FOLDER_PATH,
    handler: async (req, res) => {
      if (req.method !== 'POST') return json(res, 405, { error: 'method-not-allowed' })
      try {
        const query = await bodyOf(req)
        const profileDir = await activeProfileDirectory(ctx.baseUrl)
        const details = await packageDetails(authorizedPackages, string(query.packageName, 200))
        await revealDirectory(details.root)
        return json(res, 200, { ok: true })
      } catch (error) {
        ctx.logger?.warn?.(`[${name}] open folder failed: ${String(error)}`)
        return json(res, 400, { error: 'open-folder-failed', message: error instanceof Error ? error.message : String(error) })
      }
    },
  }), `${name}: open plugin folder route`)
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: OPEN_REPOSITORY_PATH,
    handler: async (req, res) => {
      if (req.method !== 'POST') return json(res, 405, { error: 'method-not-allowed' })
      try {
        const query = await bodyOf(req)
        const profileDir = await activeProfileDirectory(ctx.baseUrl)
        const details = await packageDetails(authorizedPackages, string(query.packageName, 200))
        if (!details.repositoryUrl) return json(res, 404, { error: 'repository-not-found', message: '插件没有可用的源仓库网页地址' })
        await openExternal(details.repositoryUrl)
        return json(res, 200, { ok: true, url: details.repositoryUrl })
      } catch (error) {
        ctx.logger?.warn?.(`[${name}] open repository failed: ${String(error)}`)
        return json(res, 400, { error: 'open-repository-failed', message: error instanceof Error ? error.message : String(error) })
      }
    },
  }), `${name}: open repository route`)
}
