import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { discoverRuntimeCandidates, loaderEntriesFromContext, packageNameFromSpecifier } from '../runtime-candidates.js'

async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value), 'utf8')
}

async function createPackage(root, packageName, options = {}) {
  await mkdir(root, { recursive: true })
  const client = options.client ?? './lib/client.js'
  const manifest = {
    name: packageName,
    version: '1.0.0',
    type: 'module',
    main: './lib/index.js',
    ...(options.ui === false ? {} : { exports: { '.': './lib/index.js', './client': client }, dsh: { client: { platform: 'web' } } }),
  }
  await writeJson(join(root, 'package.json'), manifest)
  await mkdir(join(root, 'lib'), { recursive: true })
  await writeFile(join(root, 'lib', 'index.js'), 'export default function host() {}', 'utf8')
  if (options.ui !== false) {
    const target = join(root, client)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, `export const marker = '${packageName}-client'`, 'utf8')
  }
}

test('extracts package names only from bare module specifiers', () => {
  assert.equal(packageNameFromSpecifier('@scope/plugin/client?v=2'), '@scope/plugin')
  assert.equal(packageNameFromSpecifier('plain-plugin/client'), 'plain-plugin')
  assert.equal(packageNameFromSpecifier('./plugins/local.js?v=7'), '')
  assert.equal(packageNameFromSpecifier('file:///tmp/local.js'), '')
  assert.equal(packageNameFromSpecifier('cordis:loader'), '')
})

test('discovers loaded client packages, active dynamic entries, and excludes host-only or inactive entries', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-candidates-'))
  try {
    const profile = join(temp, 'profiles', 'web')
    const hoisted = join(temp, 'profiles', 'node_modules', 'host-ui')
    const loaded = join(profile, 'node_modules', 'loaded-ui')
    const disabled = join(profile, 'node_modules', 'disabled-ui')
    const dynamic = join(temp, 'dynamic-ui')
    const fileUrlDynamic = join(temp, 'file-url-ui')
    const hostOnly = join(temp, 'host-only')
    await mkdir(join(profile, 'node_modules'), { recursive: true })
    await writeJson(join(profile, 'package.json'), { name: 'profile', private: true })
    await createPackage(hoisted, 'host-ui')
    await createPackage(loaded, 'loaded-ui')
    await createPackage(disabled, 'disabled-ui')
    await createPackage(dynamic, 'dynamic-ui')
    await createPackage(fileUrlDynamic, 'file-url-ui')
    await createPackage(hostOnly, 'host-only', { ui: false })

    const baseUrl = pathToFileURL(join(profile, 'cordis.yml')).href
    const candidates = await discoverRuntimeCandidates(profile, {
      inspectorName: 'inspector-self',
      clientEntries: ['host-ui', 'loaded-ui', 'loaded-ui/client'],
      loaderEntries: [
        { name: 'disabled-ui', disabled: true, fiberState: 2, baseUrl },
        { name: '../../dynamic-ui/lib/index.js?v=4', fiberState: 2, baseUrl },
        { name: `${pathToFileURL(join(fileUrlDynamic, 'lib', 'index.js')).href}?v=9`, fiberState: 2, baseUrl },
        { name: '../../host-only/lib/index.js', fiberState: 2, baseUrl },
        { name: 'cordis:loader', fiberState: 2, baseUrl },
        { name: 'disabled-ui', fiberState: 1, baseUrl },
      ],
    })

    assert.deepEqual(candidates.map(candidate => candidate.packageName).sort(), ['dynamic-ui', 'file-url-ui', 'host-ui', 'loaded-ui'])
    assert.equal(candidates.filter(candidate => candidate.packageName === 'loaded-ui').length, 1)
    assert.equal(candidates.find(candidate => candidate.packageName === 'dynamic-ui').source, 'loader')
    assert.equal(candidates.every(candidate => candidate.files.every(file => file.endsWith('client.js'))), true)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('does not accept local file paths from the browser boot list', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-client-path-'))
  try {
    const profile = join(temp, 'profile')
    const source = join(temp, 'local-ui')
    await mkdir(profile, { recursive: true })
    await writeJson(join(profile, 'package.json'), { name: 'profile', private: true })
    await createPackage(source, 'local-ui')
    const candidates = await discoverRuntimeCandidates(profile, {
      clientEntries: [pathToFileURL(join(source, 'lib', 'index.js')).href, '../local-ui/lib/index.js'],
    })
    assert.deepEqual(candidates, [])
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('uses the default client export selected by DSH instead of a browser alternative', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-default-export-'))
  try {
    const profile = join(temp, 'profile')
    const source = join(profile, 'node_modules', 'conditional-ui')
    await mkdir(join(source, 'lib'), { recursive: true })
    await writeJson(join(profile, 'package.json'), { name: 'profile', private: true })
    await writeJson(join(source, 'package.json'), {
      name: 'conditional-ui',
      version: '1.0.0',
      exports: {
        '.': './lib/index.js',
        './client': { browser: './lib/browser.js', default: './lib/client.js' },
      },
      dsh: { client: { platform: 'web' } },
    })
    await writeFile(join(source, 'lib', 'index.js'), 'export default function host() {}', 'utf8')
    await writeFile(join(source, 'lib', 'browser.js'), 'export const unused = true', 'utf8')
    await writeFile(join(source, 'lib', 'client.js'), 'export const loaded = true', 'utf8')

    const [candidate] = await discoverRuntimeCandidates(profile, { clientEntries: ['conditional-ui'] })
    assert.deepEqual(candidate.files.map(file => file.slice(source.length + 1)), [join('lib', 'client.js')])
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('does not create a UI candidate from conventional CSS in a host-only package', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-host-css-'))
  try {
    const profile = join(temp, 'profile')
    const source = join(profile, 'node_modules', 'host-with-css')
    await mkdir(join(profile, 'node_modules'), { recursive: true })
    await writeJson(join(profile, 'package.json'), { name: 'profile', private: true })
    await createPackage(source, 'host-with-css', { ui: false })
    await writeFile(join(source, 'client.css'), '.unused-host-marker {}', 'utf8')

    const candidates = await discoverRuntimeCandidates(profile, {
      loaderEntries: [{ name: 'host-with-css', fiberState: 2 }],
    })
    assert.deepEqual(candidates, [])
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('resolves linked client packages through Node resolution paths', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-linked-'))
  try {
    const profile = join(temp, 'profile')
    const source = join(temp, 'source-package')
    await mkdir(join(profile, 'node_modules'), { recursive: true })
    await writeJson(join(profile, 'package.json'), { name: 'profile', private: true })
    await createPackage(source, 'linked-ui')
    await symlink(source, join(profile, 'node_modules', 'linked-ui'), 'dir')

    const [candidate] = await discoverRuntimeCandidates(profile, { clientEntries: ['linked-ui'] })
    assert.equal(candidate.packageName, 'linked-ui')
    assert.equal(candidate.root, await realpath(source))
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('reads active Loader entry metadata without relying on private package names', () => {
  const entries = loaderEntriesFromContext({
    root: {
      loader: {
        * entries() {
          yield { options: { name: './plugin.js' }, disabled: false, fiber: { state: 2 }, parent: { tree: { ctx: { baseUrl: 'file:///profile/' } } } }
        },
      },
    },
  })
  assert.deepEqual(entries, [{ name: './plugin.js', disabled: false, group: false, fiberState: 2, baseUrl: 'file:///profile/' }])
})
