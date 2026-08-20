import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  externalOpenCommands,
  openExternal,
  profileDirectoryFromBaseUrl,
  resolveInstalledPackage,
  validatePackageName,
} from '../portability.js'

async function packageAt(root, packageName) {
  const directory = join(root, 'node_modules', ...packageName.split('/'))
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: packageName, version: '1.0.0' }))
  return directory
}

async function fixture(label, run) {
  const root = await mkdtemp(join(tmpdir(), `element-radar-${label}-`))
  try { return await run(root) } finally { await rm(root, { recursive: true, force: true }) }
}

test('derives a profile directory from the DSH file base URL with spaces and Unicode', async () => {
  await fixture('profile path', async root => {
    const profile = join(root, 'profiles', 'web 用户')
    await mkdir(profile, { recursive: true })
    const actual = profileDirectoryFromBaseUrl(`${pathToFileURL(profile).href}/`)
    assert.equal(actual, profile)
  })
})

test('rejects missing and non-file DSH profile URLs instead of guessing a local path', () => {
  assert.throws(() => profileDirectoryFromBaseUrl(undefined), /profile base URL/)
  assert.throws(() => profileDirectoryFromBaseUrl('https://example.invalid/profile/'), /unsupported.*protocol/)
})

test('resolves normal and scoped packages from a profile node_modules directory', async () => {
  await fixture('direct', async root => {
    const profile = join(root, 'profile')
    await mkdir(profile, { recursive: true })
    await writeFile(join(profile, 'package.json'), '{}')
    const plain = await packageAt(profile, 'plugin-alpha')
    const scoped = await packageAt(profile, '@scope/plugin-beta')
    assert.equal(await resolveInstalledPackage(profile, 'plugin-alpha'), await realpath(plain))
    assert.equal(await resolveInstalledPackage(profile, '@scope/plugin-beta'), await realpath(scoped))
  })
})

test('follows source links without assuming their real directory is inside the profile', async () => {
  await fixture('source-link', async root => {
    const profile = join(root, 'profile')
    const source = join(root, 'source checkout')
    await mkdir(join(profile, 'node_modules'), { recursive: true })
    await mkdir(source, { recursive: true })
    await writeFile(join(profile, 'package.json'), '{}')
    await writeFile(join(source, 'package.json'), JSON.stringify({ name: 'linked-plugin' }))
    await symlink(source, join(profile, 'node_modules', 'linked-plugin'), process.platform === 'win32' ? 'junction' : 'dir')
    assert.equal(await resolveInstalledPackage(profile, 'linked-plugin'), await realpath(source))
  })
})

test('uses Node resolution paths for npm workspace-hoisted packages', async () => {
  await fixture('hoisted', async root => {
    const profile = join(root, 'workspace', 'packages', 'web-profile')
    await mkdir(profile, { recursive: true })
    await writeFile(join(profile, 'package.json'), '{}')
    const hoisted = await packageAt(join(root, 'workspace'), 'hoisted-plugin')
    assert.equal(await resolveInstalledPackage(profile, 'hoisted-plugin'), await realpath(hoisted))
  })
})

test('rejects package names that could escape a module search directory', () => {
  assert.throws(() => validatePackageName('../outside'), /invalid package name/)
  assert.throws(() => validatePackageName('@scope/../../outside'), /invalid package name/)
})

test('maps each supported operating system to a shell-free native opener', () => {
  assert.deepEqual(externalOpenCommands('win32'), [{ command: 'explorer.exe', prefixArgs: [] }])
  assert.deepEqual(externalOpenCommands('darwin'), [{ command: 'open', prefixArgs: [] }])
  assert.deepEqual(externalOpenCommands('linux'), [
    { command: 'xdg-open', prefixArgs: [] },
    { command: 'gio', prefixArgs: ['open'] },
  ])
})

test('passes special paths as one argument and falls back to gio when xdg-open is absent', async () => {
  const calls = []
  const spawnImpl = (command, args, options) => {
    calls.push({ command, args, options })
    const child = new EventEmitter()
    child.unref = () => {}
    queueMicrotask(() => {
      if (command === 'xdg-open') child.emit('error', Object.assign(new Error('missing'), { code: 'ENOENT' }))
      else child.emit('spawn')
    })
    return child
  }
  const target = '/home/user name/插件/source folder'
  await openExternal(target, { platform: 'linux', spawnImpl })
  assert.deepEqual(calls.map(call => [call.command, call.args]), [
    ['xdg-open', [target]],
    ['gio', ['open', target]],
  ])
  assert.equal(calls[1].options.shell, false)
})
