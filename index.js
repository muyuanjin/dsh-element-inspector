import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { extractSignals, scorePackages } from './scoring.js'
import { openExternal, profileDirectoryFromBaseUrl, resolveInstalledPackage, validatePackageName } from './portability.js'

export const name = 'dsh-element-inspector'
export const inject = ['webServer']

const PATH = '/__dsh-element-inspector/resolve'
const OPEN_FOLDER_PATH = '/__dsh-element-inspector/open-folder'
const OPEN_REPOSITORY_PATH = '/__dsh-element-inspector/open-repository'
const MAX_FILES_PER_PACKAGE = 260
const MAX_FILE_BYTES = 1_000_000
const MAX_RESULTS = 8
const NON_RUNTIME_DIRECTORIES = new Set(['assets', 'docs', 'examples', 'marketplace', 'scripts', 'test', 'tests', 'tools'])
const SETTINGS_NAMESPACE = settingsNamespace(name)
const HiddenRuleSchema = z.object({
  id: z.string().default(''),
  classes: z.array(z.string()).default([]),
  attrs: z.dict(z.string()).default({}),
  text: z.string().default(''),
  tag: z.string().default(''),
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

async function filesUnder(root, out = [], dir = root) {
  if (out.length >= MAX_FILES_PER_PACKAGE) return out
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const entry of entries) {
    if (out.length >= MAX_FILES_PER_PACKAGE) break
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || NON_RUNTIME_DIRECTORIES.has(entry.name.toLowerCase())) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await filesUnder(root, out, path)
    else if (/\.(?:[cm]?[jt]sx?|css)$/i.test(entry.name) && !/\.d\.[cm]?ts$/i.test(entry.name)) out.push(path)
  }
  return out
}

async function packageNames(profileDir) {
  const manifest = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8'))
  return Object.keys(manifest.dependencies ?? {}).filter(packageName => packageName !== name)
}

function repositoryUrl(manifest) {
  const value = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url
  const candidate = string(value, 500) || string(manifest.homepage, 500)
  if (!candidate) return ''
  const normalized = candidate.replace(/^git\+/, '').replace(/^git@github\.com:/, 'https://github.com/')
  return /^https?:\/\//i.test(normalized) ? normalized : ''
}

async function packageDetails(profileDir, packageName) {
  validatePackageName(packageName)
  const names = await packageNames(profileDir)
  if (!names.includes(packageName)) throw new Error('package is not installed in the active profile')
  const root = await resolveInstalledPackage(profileDir, packageName)
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  return { root, repositoryUrl: repositoryUrl(manifest) }
}

async function inspectPackage(profileDir, packageName) {
  let root
  try { root = await resolveInstalledPackage(profileDir, packageName) } catch { return undefined }
  let manifest
  try { manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) } catch { return undefined }
  const files = []
  for (const file of await filesUnder(root)) {
    let source
    try {
      const info = await stat(file)
      if (info.size > MAX_FILE_BYTES) continue
      source = await readFile(file, 'utf8')
    } catch { continue }
    files.push({ file: relative(root, file), source })
  }
  return {
    packageName,
    version: manifest.version ?? 'unknown',
    repositoryUrl: repositoryUrl(manifest),
    files,
  }
}

async function resolve(profileDir, query) {
  const names = await packageNames(profileDir)
  const packages = (await Promise.all(names.map(packageName => inspectPackage(profileDir, packageName)))).filter(Boolean)
  const outcome = scorePackages(packages, extractSignals(query))
  return { query, certainty: outcome.certainty, reasons: outcome.reasons, results: outcome.results.slice(0, MAX_RESULTS) }
}

async function activeProfileDirectory(baseUrl) {
  const candidate = profileDirectoryFromBaseUrl(baseUrl)
  const manifest = JSON.parse(await readFile(join(candidate, 'package.json'), 'utf8'))
  if (manifest.dsh?.profile?.bundles?.includes(name) || manifest.dependencies?.[name] !== undefined) return candidate
  throw new Error('the active DSH profile does not declare this plugin')
}

export function apply(ctx) {
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
        return json(res, 200, await resolve(profileDir, query))
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
        const details = await packageDetails(profileDir, string(query.packageName, 200))
        await openExternal(details.root)
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
        const details = await packageDetails(profileDir, string(query.packageName, 200))
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
