import test from 'node:test'
import assert from 'node:assert/strict'
import { runtimeRegistrations } from '../src/runtime-registrations.js'

function settingsComponent() {
  const identity = 'settings-owner-component-with-enough-source-to-be-used-as-runtime-attribution-evidence'
  return identity
}

function toolbarComponent() {
  const identity = 'toolbar-owner-component-with-enough-source-to-be-used-as-runtime-attribution-evidence'
  return identity
}

function targetWithFibers(parent) {
  return {
    '__reactFiber$test': {
      key: 'shared-entry',
      type: 'button',
      elementType: 'button',
      memoizedProps: {},
      return: parent,
    },
  }
}

function slotsFor(entries) {
  return {
    snapshot: () => [
      { name: 'settings.section', children: [] },
      { name: 'toolbar.action', children: [] },
    ],
    entries: slot => entries[slot] ?? [],
  }
}

test('scopes a projected React key to the slot referenced by its nearest shell', () => {
  function SettingsShellWithEnoughSourceForInspection() {
    const projectedSlot = 'settings.section'
    return projectedSlot
  }
  const target = targetWithFibers({
    key: null,
    type: SettingsShellWithEnoughSourceForInspection,
    elementType: SettingsShellWithEnoughSourceForInspection,
    memoizedProps: {},
    return: null,
  })
  const results = runtimeRegistrations(target, slotsFor({
    'settings.section': [{ options: { id: 'shared-entry' }, component: settingsComponent }],
    'toolbar.action': [{ options: { id: 'shared-entry' }, component: toolbarComponent }],
  }))

  assert.equal(results.length, 1)
  assert.equal(results[0].slot, 'settings.section')
  assert.equal(results[0].key, 'shared-entry')
  assert.match(results[0].sources[0], /settings-owner-component/)
})

test('drops projected key evidence when the nearest shell references colliding slots', () => {
  function AmbiguousShellWithEnoughSourceForInspection() {
    const projectedSlots = ['settings.section', 'toolbar.action']
    return projectedSlots
  }
  const target = targetWithFibers({
    key: null,
    type: AmbiguousShellWithEnoughSourceForInspection,
    elementType: AmbiguousShellWithEnoughSourceForInspection,
    memoizedProps: {},
    return: null,
  })
  const results = runtimeRegistrations(target, slotsFor({
    'settings.section': [{ options: { id: 'shared-entry' }, component: settingsComponent }],
    'toolbar.action': [{ options: { id: 'shared-entry' }, component: toolbarComponent }],
  }))

  assert.deepEqual(results, [])
})
