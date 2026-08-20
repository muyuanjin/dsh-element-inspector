import { readFile, stat } from 'node:fs/promises'
import { relative } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { isDshPackage } from './dsh-metadata.js'
import { discoverRuntimeCandidates, runtimeCandidateByName } from './runtime-candidates.js'
import { extractSignals, scorePackages } from './scoring.js'
import { openExternal, revealDirectory } from './portability.js'

export const name = 'dsh-element-inspector'
export const inject = ['connection', 'clientModules']
export const Config = z.object({})

const RPC_CHANNEL = '/dsh-element-inspector'
const MAX_FILE_BYTES = 1_000_000
const MAX_RESULTS = 8
const SOURCE_CACHE_IDLE_MS = 3 * 60_000
const SETTINGS_NAMESPACE = settingsNamespace(name)
const sourceCache = new Map()
let sourceCacheGraphRev = ''
let sourceCacheTimer

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

function clearSourceCache() {
  sourceCache.clear()
  sourceCacheGraphRev = ''
  if (sourceCacheTimer) clearTimeout(sourceCacheTimer)
  sourceCacheTimer = undefined
}

function releaseSourceCacheWhenIdle() {
  if (sourceCacheTimer) clearTimeout(sourceCacheTimer)
  sourceCacheTimer = setTimeout(clearSourceCache, SOURCE_CACHE_IDLE_MS)
  sourceCacheTimer.unref?.()
}

async function inspectPackage(candidate) {
  if (sourceCacheGraphRev !== candidate.graphRev) {
    sourceCache.clear()
    sourceCacheGraphRev = candidate.graphRev
  }
  const key = `${candidate.packageName}\0${candidate.rev}\0${candidate.files.join('\0')}`
  const cached = sourceCache.get(key)
  if (cached) return cached
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
  sourceCache.set(key, value)
  return value
}

async function resolveOwnership(ctx, query) {
  const candidates = await discoverRuntimeCandidates(ctx.clientModules, { inspectorName: name })
  const packages = await Promise.all(candidates.map(inspectPackage))
  releaseSourceCacheWhenIdle()
  const outcome = scorePackages(packages, extractSignals(query))
  const sanitizedQuery = { ...query }
  delete sanitizedQuery.clientEntries
  delete sanitizedQuery.runtimeRegistrations
  return {
    query: sanitizedQuery,
    certainty: outcome.certainty,
    reasons: outcome.reasons,
    results: outcome.results.slice(0, MAX_RESULTS),
  }
}

async function activePlugin(ctx, packageName) {
  const candidate = await runtimeCandidateByName(ctx.clientModules, packageName, { inspectorName: name })
  if (isDshPackage(candidate.packageName)) throw new Error('DSH packages cannot be opened through the plugin inspector')
  return {
    root: candidate.root,
    repositoryUrl: repositoryUrl(candidate.manifest),
  }
}

function failure(error) {
  return {
    ok: false,
    error: {
      code: 'bad-request',
      message: error instanceof Error ? error.message : String(error),
    },
  }
}

async function handleRpc(ctx, endpoint, payload) {
  try {
    if (endpoint === 'resolve') {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('invalid resolve request')
      return { ok: true, value: await resolveOwnership(ctx, payload) }
    }
    if (endpoint === 'open-folder') {
      const details = await activePlugin(ctx, string(payload?.packageName, 200))
      await revealDirectory(details.root)
      return { ok: true, value: { ok: true } }
    }
    if (endpoint === 'open-repository') {
      const details = await activePlugin(ctx, string(payload?.packageName, 200))
      if (!details.repositoryUrl) throw new Error('插件没有可用的源仓库网页地址')
      await openExternal(details.repositoryUrl)
      return { ok: true, value: { ok: true, url: details.repositoryUrl } }
    }
    throw new Error(`unknown inspector endpoint: ${endpoint}`)
  } catch (error) {
    ctx.logger?.warn?.(`[${name}] ${endpoint} failed: ${String(error)}`)
    return failure(error)
  }
}

export function apply(ctx) {
  ctx.inject(['settings'], settingsCtx => {
    settingsCtx.settings.register(SETTINGS_NAMESPACE, SettingsSchema)
  })
  ctx.effect(
    () => ctx.connection.rpc.handle(
      RPC_CHANNEL,
      (endpoint, payload) => handleRpc(ctx, endpoint, payload),
      { authority: 'loopback' },
    ),
    `${name}: loopback RPC`,
  )
  ctx.effect(() => clearSourceCache, `${name}: source cache`)
}
