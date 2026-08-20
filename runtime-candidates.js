import { readFile, realpath, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { validatePackageName } from './portability.js'

const MAX_PACKAGE_PARENT_LEVELS = 32
const discoveryCache = new WeakMap()

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch { return undefined }
}

async function packageRootFromBundle(bundlePath, packageName) {
  const bundle = await realpath(resolve(bundlePath))
  if (!(await stat(bundle)).isFile()) return undefined
  let current = dirname(bundle)
  for (let level = 0; level < MAX_PACKAGE_PARENT_LEVELS; level += 1) {
    const manifest = await readJson(join(current, 'package.json'))
    if (manifest?.name === packageName) return { root: await realpath(current), manifest, bundle }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return undefined
}

function graphRows(clientModules) {
  const graph = clientModules?.graph?.()
  if (!graph || typeof graph.rev !== 'string' || !Array.isArray(graph.entries)) {
    throw new Error('DSH client module graph is unavailable')
  }
  return { graph, rows: graph.entries.filter(row => row && typeof row.id === 'string' && typeof row.rev === 'string') }
}

async function candidateFromRow(clientModules, graphRev, row) {
  const clientPath = clientModules.clientPath(row.id)
  if (typeof clientPath !== 'string' || !clientPath) return undefined
  const located = await packageRootFromBundle(clientPath, row.id)
  if (!located) return undefined
  return {
    packageName: row.id,
    moduleName: row.id,
    root: located.root,
    manifest: located.manifest,
    files: [located.bundle],
    source: 'client-modules',
    graphRev,
    rev: row.rev,
  }
}

export async function discoverRuntimeCandidates(clientModules, options = {}) {
  const { graph, rows } = graphRows(clientModules)
  const cacheKey = options.inspectorName ?? ''
  let cache = discoveryCache.get(clientModules)
  if (!cache) {
    cache = new Map()
    discoveryCache.set(clientModules, cache)
  }
  const cached = cache.get(cacheKey)
  if (cached?.graphRev === graph.rev) return cached.candidates

  const candidates = Promise.all(rows
    .filter(row => row.id !== options.inspectorName)
    .map(async row => {
      try { return await candidateFromRow(clientModules, graph.rev, row) } catch { return undefined }
    }))
    .then(values => values.filter(Boolean))
  cache.set(cacheKey, { graphRev: graph.rev, candidates })
  return candidates
}

export async function runtimeCandidateByName(clientModules, packageName, options = {}) {
  validatePackageName(packageName)
  if (packageName === options.inspectorName) throw new Error('package is not an active UI candidate')
  const { graph, rows } = graphRows(clientModules)
  const row = rows.find(entry => entry.id === packageName)
  if (!row) throw new Error('package is not an active UI candidate')
  const candidate = await candidateFromRow(clientModules, graph.rev, row)
  if (!candidate) throw new Error('active client bundle does not match its package manifest')
  return candidate
}
