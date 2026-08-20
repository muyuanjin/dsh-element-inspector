import { spawn as nodeSpawn } from 'node:child_process'
import { readFile, realpath } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_NAME = /^@?[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)?$/i

export function validatePackageName(packageName) {
  if (!PACKAGE_NAME.test(packageName)) throw new Error('invalid package name')
  return packageName
}

export function profileDirectoryFromBaseUrl(baseUrl) {
  if (typeof baseUrl !== 'string' && !(baseUrl instanceof URL)) {
    throw new Error('DSH did not provide a profile base URL')
  }
  const url = new URL(baseUrl.toString())
  if (url.protocol !== 'file:') throw new Error(`unsupported DSH profile URL protocol: ${url.protocol}`)
  return resolve(fileURLToPath(url))
}

export async function resolveInstalledPackage(profileDir, packageName) {
  validatePackageName(packageName)
  const require = createRequire(join(profileDir, 'package.json'))
  for (const searchPath of require.resolve.paths(packageName) ?? []) {
    const candidate = join(searchPath, ...packageName.split('/'))
    try {
      await readFile(join(candidate, 'package.json'), 'utf8')
      return await realpath(candidate)
    } catch {}
  }
  throw new Error(`installed package cannot be resolved: ${packageName}`)
}

export function externalOpenCommands(platform = process.platform) {
  if (platform === 'win32') return [{ command: 'explorer.exe', prefixArgs: [] }]
  if (platform === 'darwin') return [{ command: 'open', prefixArgs: [] }]
  return [
    { command: 'xdg-open', prefixArgs: [] },
    { command: 'gio', prefixArgs: ['open'] },
  ]
}

function spawnDetached(command, args, spawnImpl) {
  return new Promise((resolvePromise, reject) => {
    const child = spawnImpl(command, args, {
      detached: true,
      shell: false,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolvePromise()
    })
  })
}

export async function openExternal(target, options = {}) {
  const value = typeof target === 'string' ? target : ''
  if (!value) throw new Error('open target is empty')
  const spawnImpl = options.spawnImpl ?? nodeSpawn
  let lastError
  for (const candidate of externalOpenCommands(options.platform)) {
    try {
      await spawnDetached(candidate.command, [...candidate.prefixArgs, value], spawnImpl)
      return
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(`no system opener is available on ${options.platform ?? process.platform}`, { cause: lastError })
}

export async function revealDirectory(target, options = {}) {
  const value = typeof target === 'string' ? target : ''
  if (!value) throw new Error('open target is empty')
  let electron = options.electron
  if (electron === undefined) {
    try { electron = await import('electron') } catch {}
  }
  if (typeof electron?.shell?.showItemInFolder === 'function') {
    electron.shell.showItemInFolder(join(value, 'package.json'))
    return
  }
  await openExternal(value, options)
}
