import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { discoverRuntimeCandidates, runtimeCandidateByName } from '../runtime-candidates.js'

async function createPackage(root, packageName, bundle = 'lib/client.js') {
  await mkdir(join(root, 'lib'), { recursive: true })
  await writeFile(join(root, 'package.json'), JSON.stringify({
    name: packageName,
    version: '1.0.0',
    repository: `https://example.test/${packageName}`,
  }))
  const path = join(root, bundle)
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageName)} })`)
  return path
}

function registry(state) {
  return {
    graph: () => state.graph,
    clientPath: id => state.paths.get(id),
  }
}

test('uses only the server graph and ignores a forged browser candidate list', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-graph-'))
  try {
    const activePath = await createPackage(join(temp, 'active-ui'), 'active-ui')
    await createPackage(join(temp, 'installed-unused'), 'installed-unused')
    const state = {
      graph: { rev: 'graph-a', entries: [{ id: 'active-ui', rev: 'active-a' }] },
      paths: new Map([['active-ui', activePath]]),
    }
    const candidates = await discoverRuntimeCandidates(registry(state), {
      inspectorName: 'dsh-element-inspector',
      clientEntries: ['installed-unused'],
    })

    assert.deepEqual(candidates.map(candidate => candidate.packageName), ['active-ui'])
    assert.equal(candidates[0].source, 'client-modules')
    assert.equal(candidates[0].graphRev, 'graph-a')
    assert.equal(candidates[0].rev, 'active-a')
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('scans exactly clientPath and never adds unused alternate JS or conventional CSS', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-path-'))
  try {
    const root = join(temp, 'conditional-ui')
    const served = await createPackage(root, 'conditional-ui', 'lib/default.js')
    await writeFile(join(root, 'lib', 'browser.js'), 'const marker = "unused-browser-build"')
    await writeFile(join(root, 'client.css'), '.unused-conventional-css {}')
    const state = {
      graph: { rev: 'graph-a', entries: [{ id: 'conditional-ui', rev: 'entry-a' }] },
      paths: new Map([['conditional-ui', served]]),
    }

    const [candidate] = await discoverRuntimeCandidates(registry(state))
    assert.deepEqual(candidate.files, [await realpath(served)])
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('excludes host-only, disabled, CSS-only, and inspector packages absent from the graph', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-host-only-'))
  try {
    const activePath = await createPackage(join(temp, 'active-ui'), 'active-ui')
    const inspectorPath = await createPackage(join(temp, 'inspector'), 'dsh-element-inspector')
    const hostRoot = join(temp, 'host-only')
    await mkdir(hostRoot, { recursive: true })
    await writeFile(join(hostRoot, 'package.json'), JSON.stringify({ name: 'host-only' }))
    await writeFile(join(hostRoot, 'client.css'), '.host-only {}')
    const state = {
      graph: {
        rev: 'graph-a',
        entries: [
          { id: 'active-ui', rev: 'active-a' },
          { id: 'dsh-element-inspector', rev: 'self-a' },
        ],
      },
      paths: new Map([
        ['active-ui', activePath],
        ['dsh-element-inspector', inspectorPath],
      ]),
    }

    const candidates = await discoverRuntimeCandidates(registry(state), { inspectorName: 'dsh-element-inspector' })
    assert.deepEqual(candidates.map(candidate => candidate.packageName), ['active-ui'])
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('follows linked package roots from the authoritative bundle path', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-linked-'))
  try {
    const source = join(temp, 'source-package')
    await createPackage(source, 'linked-ui')
    const linked = join(temp, 'profile', 'node_modules', 'linked-ui')
    await mkdir(join(linked, '..'), { recursive: true })
    await symlink(source, linked, 'dir')
    const linkedBundle = join(linked, 'lib', 'client.js')
    const state = {
      graph: { rev: 'graph-a', entries: [{ id: 'linked-ui', rev: 'entry-a' }] },
      paths: new Map([['linked-ui', linkedBundle]]),
    }

    const [candidate] = await discoverRuntimeCandidates(registry(state))
    assert.equal(candidate.root, await realpath(source))
    assert.deepEqual(candidate.files, [await realpath(join(source, 'lib', 'client.js'))])
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('continues past an unrelated nested manifest to the graph entry package root', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-nested-manifest-'))
  try {
    const root = join(temp, 'active-ui')
    const bundle = await createPackage(root, 'active-ui', 'lib/generated/client.js')
    await writeFile(join(root, 'lib', 'package.json'), JSON.stringify({ name: 'build-output' }))
    const state = {
      graph: { rev: 'graph-a', entries: [{ id: 'active-ui', rev: 'entry-a' }] },
      paths: new Map([['active-ui', bundle]]),
    }

    const [candidate] = await discoverRuntimeCandidates(registry(state))
    assert.equal(candidate.root, await realpath(root))
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('authorizes actions against the current graph and matching manifest identity', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-current-graph-'))
  try {
    const bundle = await createPackage(join(temp, 'active-ui'), 'active-ui')
    const state = {
      graph: { rev: 'graph-a', entries: [{ id: 'active-ui', rev: 'entry-a' }] },
      paths: new Map([['active-ui', bundle]]),
    }
    const modules = registry(state)
    assert.equal((await runtimeCandidateByName(modules, 'active-ui')).graphRev, 'graph-a')

    state.graph = { rev: 'graph-b', entries: [] }
    await assert.rejects(runtimeCandidateByName(modules, 'active-ui'), /not an active UI candidate/)

    state.graph = { rev: 'graph-c', entries: [{ id: 'forged-name', rev: 'entry-c' }] }
    state.paths.set('forged-name', bundle)
    await assert.rejects(runtimeCandidateByName(modules, 'forged-name'), /does not match/)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('surfaces graph and entry revisions for source-cache invalidation', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-revision-'))
  try {
    const bundle = await createPackage(join(temp, 'active-ui'), 'active-ui')
    const state = {
      graph: { rev: 'graph-a', entries: [{ id: 'active-ui', rev: 'entry-a' }] },
      paths: new Map([['active-ui', bundle]]),
    }
    const modules = registry(state)
    const first = await runtimeCandidateByName(modules, 'active-ui')
    state.graph = { rev: 'graph-b', entries: [{ id: 'active-ui', rev: 'entry-b' }] }
    const rebuilt = await runtimeCandidateByName(modules, 'active-ui')
    assert.deepEqual([first.graphRev, first.rev], ['graph-a', 'entry-a'])
    assert.deepEqual([rebuilt.graphRev, rebuilt.rev], ['graph-b', 'entry-b'])
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('reuses candidate discovery until the client graph revision changes', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-cache-'))
  try {
    const bundle = await createPackage(join(temp, 'active-ui'), 'active-ui')
    const state = {
      graph: { rev: 'graph-a', entries: [{ id: 'active-ui', rev: 'entry-a' }] },
      paths: new Map([['active-ui', bundle]]),
    }
    let pathReads = 0
    const modules = {
      graph: () => state.graph,
      clientPath(id) {
        pathReads += 1
        return state.paths.get(id)
      },
    }

    await discoverRuntimeCandidates(modules)
    await discoverRuntimeCandidates(modules)
    assert.equal(pathReads, 1)

    state.graph = { rev: 'graph-b', entries: [{ id: 'active-ui', rev: 'entry-b' }] }
    await discoverRuntimeCandidates(modules)
    assert.equal(pathReads, 2)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})
