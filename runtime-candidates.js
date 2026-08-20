import { readFile, realpath, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolveInstalledPackage } from './portability.js'

const CLIENT_ENTRY_FALLBACKS = ['./client.js', './lib/client.js', './client/client.js']
const MAX_PACKAGE_PARENT_LEVELS = 32

function clean(value, max = 400) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function withoutQuery(value) {
  return clean(value).replace(/[?#].*$/, '')
}

function fileUrlForDirectory(directory) {
  return pathToFileURL(resolve(directory) + '/').href
}

export function packageNameFromSpecifier(value) {
  const specifier = withoutQuery(value)
  if (!specifier || specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('\\') || /^[a-z]+:/i.test(specifier)) return ''
  const parts = specifier.split('/')
  if (specifier.startsWith('@')) return parts.length >= 2 ? parts.slice(0, 2).join('/') : ''
  return parts[0] || ''
}

function exportTarget(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const result = exportTarget(candidate)
      if (result) return result
    }
    return ''
  }
  if (!value || typeof value !== 'object') return ''
  for (const key of ['default', 'browser', 'import', 'require', 'node']) {
    const result = exportTarget(value[key])
    if (result) return result
  }
  return ''
}

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch { return undefined }
}

async function packageRootFromPath(path) {
  let current = resolve(path)
  try {
    if (!(await stat(current)).isDirectory()) current = dirname(current)
  } catch {
    current = dirname(current)
  }
  for (let level = 0; level < MAX_PACKAGE_PARENT_LEVELS; level += 1) {
    if (await readJson(join(current, 'package.json'))) return await realpath(current)
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return undefined
}

function localPath(specifier, baseUrl) {
  const value = withoutQuery(specifier)
  try {
    if (value.startsWith('file:')) return fileURLToPath(value)
    if (value.startsWith('.') || value.startsWith('/')) return fileURLToPath(new URL(value, baseUrl))
    if (/^[a-z]:[\\/]/i.test(value)) return value
  } catch {}
  return ''
}

function isInside(root, path) {
  const relativePath = relative(root, path)
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
}

function manifestClientTargets(manifest, pluginManifest) {
  const targets = []
  const entrypoint = pluginManifest?.entrypoints?.client
  if (typeof entrypoint === 'string') targets.push(entrypoint)
  const exported = manifest?.exports?.['./client']
  const exportPath = exportTarget(exported)
  if (exportPath) targets.push(exportPath)
  if (manifest?.dsh?.client && !targets.length) targets.push(...CLIENT_ENTRY_FALLBACKS)
  return [...new Set(targets)]
}

async function clientFiles(root, manifest) {
  const pluginManifest = await readJson(join(root, 'dsh-plugin.json'))
  const targets = manifestClientTargets(manifest, pluginManifest)
  if (!targets.length) return []
  const files = []
  for (const target of targets) {
    if (!target || target.startsWith('http:') || target.startsWith('https:')) continue
    const path = resolve(root, target)
    if (!isInside(root, path)) continue
    try {
      if ((await stat(path)).isFile()) files.push(path)
    } catch {}
  }
  // CSS is a client surface even when the JavaScript bundle imports it indirectly.
  // It is deliberately limited to the package root and never includes host JS files.
  const cssCandidates = [join(root, 'client.css'), join(root, 'lib', 'client.css'), join(root, 'client', 'client.css')]
  for (const path of cssCandidates) {
    try {
      if ((await stat(path)).isFile()) files.push(path)
    } catch {}
  }
  return [...new Set(files)]
}

async function candidateFromRoot(root, specifier, source) {
  const manifest = await readJson(join(root, 'package.json'))
  if (!manifest?.name) return undefined
  const files = await clientFiles(root, manifest)
  if (!files.length) return undefined
  return { packageName: manifest.name, root, manifest, files, moduleName: clean(specifier), source }
}

async function candidateFromSpecifier(profileDir, specifier, baseUrl, source) {
  const packageName = packageNameFromSpecifier(specifier)
  if (packageName) {
    try {
      const root = await resolveInstalledPackage(profileDir, packageName)
      return await candidateFromRoot(root, specifier, source)
    } catch {}
  }
  const path = localPath(specifier, baseUrl)
  if (!path) return undefined
  const root = await packageRootFromPath(path)
  return root ? await candidateFromRoot(root, specifier, source) : undefined
}

function entryBaseUrl(entry, profileDir) {
  const value = entry?.baseUrl || entry?.treeBaseUrl
  if (value) return value
  return fileUrlForDirectory(profileDir)
}

function activeLoaderEntries(loaderEntries) {
  return (Array.isArray(loaderEntries) ? loaderEntries : []).filter(entry => {
    if (!entry?.name || entry.disabled || entry.group) return false
    return entry.fiberState === 2 || entry.active === true
  })
}

export async function discoverRuntimeCandidates(profileDir, options = {}) {
  const requests = []
  for (const value of Array.isArray(options.clientEntries) ? options.clientEntries : []) {
    if (typeof value === 'string' && value.length <= 400 && packageNameFromSpecifier(value)) {
      requests.push({ specifier: value, baseUrl: fileUrlForDirectory(profileDir), source: 'client' })
    }
  }
  for (const entry of activeLoaderEntries(options.loaderEntries)) {
    requests.push({ specifier: clean(entry.name), baseUrl: entryBaseUrl(entry, profileDir), source: 'loader' })
  }

  const seen = new Map()
  for (const request of requests) {
    if (!request.specifier || request.specifier.startsWith('cordis:')) continue
    const candidate = await candidateFromSpecifier(profileDir, request.specifier, request.baseUrl, request.source)
    if (!candidate || candidate.packageName === options.inspectorName) continue
    const key = candidate.root
    const current = seen.get(key)
    if (!current || (request.source === 'loader' && current.source !== 'loader')) seen.set(key, candidate)
  }
  return [...seen.values()]
}

export function loaderEntriesFromContext(ctx) {
  let entries
  try {
    const loader = ctx?.root?.loader ?? ctx?.loader
    entries = loader?.entries?.()
  } catch {}
  if (!entries) return []
  const result = []
  for (const entry of entries) {
    result.push({
      name: entry?.options?.name,
      disabled: Boolean(entry?.disabled),
      group: Boolean(entry?.options?.group),
      fiberState: entry?.fiber?.state,
      baseUrl: entry?.parent?.tree?.ctx?.baseUrl ?? entry?.ctx?.baseUrl,
    })
  }
  return result
}
