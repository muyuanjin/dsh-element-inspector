import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import {
  apply as applyConnection,
  inject as connectionInject,
  name as connectionName,
} from '@deepseek-ai/dsh-client-connection'
import { Config, apply, inject, name } from '../index.js'

function fakeWebServer(routes) {
  return {
    register(route) {
      routes.push(route)
      return () => {
        const index = routes.indexOf(route)
        if (index >= 0) routes.splice(index, 1)
      }
    },
  }
}

function request(headers, body = '', method = 'POST') {
  const req = Readable.from(body ? [Buffer.from(body)] : [])
  req.method = method
  req.url = '/dsh-element-inspector/resolve'
  req.headers = headers
  return req
}

function response() {
  const res = new EventEmitter()
  const state = { status: 0, headers: {}, body: '' }
  res.headersSent = false
  res.writableEnded = false
  res.writeHead = (status, headers = {}) => {
    state.status = status
    state.headers = headers
    res.headersSent = true
  }
  res.write = chunk => {
    state.body += Buffer.from(chunk).toString()
    return true
  }
  res.end = chunk => {
    if (chunk) state.body += Buffer.from(chunk).toString()
    res.writableEnded = true
  }
  return { res, state }
}

function envelope(payload) {
  return JSON.stringify({
    type: 'client-request',
    rpcId: 'inspector-test',
    method: 'resolve',
    payload,
  })
}

async function fixture() {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-inspector-host-'))
  const root = join(temp, 'active-ui')
  const bundle = join(root, 'lib', 'client.js')
  await mkdir(join(root, 'lib'), { recursive: true })
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'active-ui', version: '1.2.3' }))
  await writeFile(bundle, 'const marker = "active-control-marker"')
  const state = {
    graph: { rev: 'graph-a', entries: [{ id: 'active-ui', rev: 'entry-a' }] },
    paths: new Map([['active-ui', bundle]]),
  }
  const modules = { graph: () => state.graph, clientPath: id => state.paths.get(id) }
  return { temp, bundle, state, modules }
}

test('exports the RC function-plugin contract and registers one loopback RPC channel', async () => {
  const registered = []
  const namespaces = []
  const ctx = {
    clientModules: { graph: () => ({ rev: 'empty', entries: [] }), clientPath: () => undefined },
    connection: {
      rpc: {
        handle(channel, handler, options) {
          registered.push({ channel, handler, options })
          return () => {}
        },
      },
    },
    inject(dependencies, callback) {
      if (dependencies.includes('settings')) callback({ settings: { register: ns => namespaces.push(ns) } })
    },
    effect(setup) { return setup() },
  }

  apply(ctx)
  assert.equal(name, 'dsh-element-inspector')
  assert.deepEqual(inject, ['connection', 'clientModules'])
  assert.equal(typeof Config, 'function')
  assert.deepEqual(registered.map(item => [item.channel, item.options]), [
    ['/dsh-element-inspector', { authority: 'loopback' }],
  ])
  assert.deepEqual(namespaces, ['dsh-element-inspector'])
})

test('composes with the real Connection route and inherits its browser trust and body fences', async () => {
  const data = await fixture()
  const routes = []
  const ctx = new Context()
  ctx.provide('webServer', fakeWebServer(routes))
  ctx.provide('clientModules', data.modules)
  const connectionFiber = ctx.plugin({ name: connectionName, inject: [...connectionInject], apply: applyConnection })
  await connectionFiber.await()
  const inspectorFiber = ctx.plugin({ name, inject: [...inject], Config, apply })
  await inspectorFiber.await()
  const route = routes.find(candidate => candidate.path === '/dsh-element-inspector')
  assert.ok(route)

  const cases = [
    [{ host: 'attacker.example', 'content-type': 'application/json' }, 403],
    [{ host: '127.0.0.1:3080', origin: 'https://attacker.example', 'content-type': 'application/json' }, 403],
    [{ host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080', 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' }, 403],
    [{ host: '127.0.0.1:3080', 'content-type': 'text/plain' }, 415],
  ]
  for (const [headers, status] of cases) {
    const output = response()
    await route.handler(request(headers, envelope({ classes: 'active-control-marker' })), output.res)
    assert.equal(output.state.status, status)
  }

  const oversized = response()
  await route.handler(request({
    host: '127.0.0.1:3080',
    'content-type': 'application/json',
    'content-length': String(160 * 1024 * 1024 + 1),
  }), oversized.res)
  assert.equal(oversized.state.status, 413)

  const accepted = response()
  await route.handler(request({
    host: '127.0.0.1:3080',
    origin: 'http://127.0.0.1:3080',
    'sec-fetch-site': 'same-origin',
    'content-type': 'application/json; charset=utf-8',
  }, envelope({ classes: 'active-control-marker', clientEntries: ['forged-ui'] })), accepted.res)
  assert.equal(accepted.state.status, 200)
  const message = JSON.parse(accepted.state.body)
  assert.equal(message.result.ok, true)
  assert.equal(message.result.value.results[0].packageName, 'active-ui')
  assert.equal('clientEntries' in message.result.value.query, false)

  await inspectorFiber.dispose()
  await connectionFiber.dispose()
  await rm(data.temp, { recursive: true, force: true })
})

test('invalidates inspected bundle source when the graph revision changes', async () => {
  const data = await fixture()
  let handler
  const ctx = {
    clientModules: data.modules,
    connection: { rpc: { handle(_channel, value) { handler = value; return () => {} } } },
    inject() {},
    effect(setup) { return setup() },
  }
  apply(ctx)

  const first = await handler('resolve', { classes: 'active-control-marker' })
  assert.equal(first.value.results[0].packageName, 'active-ui')
  await writeFile(data.bundle, 'const marker = "rebuilt-control-marker"')
  data.state.graph = { rev: 'graph-b', entries: [{ id: 'active-ui', rev: 'entry-b' }] }
  const rebuilt = await handler('resolve', { classes: 'rebuilt-control-marker' })
  assert.equal(rebuilt.value.results[0].packageName, 'active-ui')

  await rm(data.temp, { recursive: true, force: true })
})
