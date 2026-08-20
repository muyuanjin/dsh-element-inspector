import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('uses official client services without sending a browser-owned module list', async () => {
  const source = await readFile(new URL('../src/client.js', import.meta.url), 'utf8')
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.match(source, /ctx\.connection\.rpc\.call\('\/dsh-element-inspector'/)
  assert.doesNotMatch(source, /__DSH_BOOT__|clientEntries|fetch\('\/__dsh-element-inspector/)
  assert.deepEqual(manifest.dsh.client.external, ['react'])
})

test('binds the overlay and official settings card to the same namespace', async () => {
  const source = await readFile(new URL('../src/client.js', import.meta.url), 'utf8')
  assert.match(source, /const SETTINGS_NAMESPACE = 'dsh-element-inspector'/)
  assert.match(source, /settingsScope\.bind\(\{ namespace: SETTINGS_NAMESPACE \}\)/)
  assert.match(source, /name: 'settings\.plugin\.item',[\s\S]*key: SETTINGS_NAMESPACE/)
})
