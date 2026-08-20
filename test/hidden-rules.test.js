import test from 'node:test'
import assert from 'node:assert/strict'
import { createHiddenRule, matchesHiddenInfo, resolveUniqueHiddenMatches } from '../src/hidden-rules.js'

function node(overrides = {}) {
  return { tag: 'div', id: '', classes: '', attrs: {}, text: '', nth: 1, ancestors: [], ...overrides }
}

test('keeps a text-based hidden rule working when generated classes change after restart', () => {
  const ancestry = [node({ tag: 'section', nth: 1 }), node({ tag: 'main', nth: 1 })]
  const rule = createHiddenRule(node({ classes: 'css-a91c0b7 panel-v1', text: '探索未至之境', nth: 2, ancestors: ancestry }))
  const restarted = node({ classes: 'css-f71d29a panel-v2', text: '探索未至之境', nth: 2, ancestors: ancestry })
  assert.equal(matchesHiddenInfo(restarted, rule), true)
})

test('keeps a class-based hidden rule working when dynamic text changes', () => {
  const ancestors = [node({ classes: 'usage-panel' })]
  const rule = createHiddenRule(node({ classes: 'usage-summary-control', text: '12 items', nth: 2, ancestors }))
  const restarted = node({ classes: 'usage-summary-control', text: '13 items', nth: 2, ancestors })
  assert.equal(matchesHiddenInfo(restarted, rule), true)
})

test('uses stable attributes without requiring matching text or classes', () => {
  const rule = createHiddenRule(node({ attrs: { 'data-view-id': 'summary-panel' }, classes: 'layout-a', text: 'Before' }))
  const restarted = node({ attrs: { 'data-view-id': 'summary-panel' }, classes: 'layout-b', text: 'After' })
  assert.equal(matchesHiddenInfo(restarted, rule), true)
})

test('does not hide an unrelated element that only shares a tag and position', () => {
  const rule = createHiddenRule(node({ text: 'First section', nth: 2 }))
  assert.equal(matchesHiddenInfo(node({ text: 'Other section', nth: 2 }), rule), false)
})

test('uses stable nested ancestor evidence to preserve a rule through one local marker change', () => {
  const rule = createHiddenRule(node({
    classes: 'target-action stable-target',
    text: 'Action',
    nth: 2,
    ancestors: [node({ classes: 'settings-extension-slot' })],
  }))
  const restarted = node({
    classes: 'target-action',
    text: 'Changed action',
    nth: 2,
    ancestors: [node({ classes: 'settings-extension-slot' })],
  })
  assert.equal(matchesHiddenInfo(restarted, rule), true)
})

test('continues matching legacy rules without structural fields', () => {
  const legacy = { tag: 'button', id: '', classes: ['stable-action'], attrs: {}, text: 'Run' }
  assert.equal(matchesHiddenInfo(node({ tag: 'button', classes: 'stable-action changed', text: 'Run' }), legacy), true)
  assert.equal(matchesHiddenInfo(node({ tag: 'button', classes: 'stable-action changed', text: 'Updated' }), legacy), false)
})

test('never lets one shared navigation class hide sibling settings entries', () => {
  const legacy = { tag: 'button', id: '', classes: ['shared-settings-entry'], attrs: {}, text: 'Extension panel' }
  assert.equal(matchesHiddenInfo(node({ tag: 'button', classes: 'shared-settings-entry', text: 'Extension panel' }), legacy), true)
  assert.equal(matchesHiddenInfo(node({ tag: 'button', classes: 'shared-settings-entry', text: 'General' }), legacy), false)
})

test('refuses to hide when a shared attribute leaves more than one candidate', () => {
  const rule = createHiddenRule(node({ tag: 'button', attrs: { role: 'button' }, text: 'Original' }))
  const candidates = [
    node({ tag: 'button', attrs: { role: 'button' }, text: 'First' }),
    node({ tag: 'button', attrs: { role: 'button' }, text: 'Second' }),
  ]
  assert.deepEqual([...resolveUniqueHiddenMatches(candidates, [rule])], [])
})

test('keeps hiding a uniquely identified element', () => {
  const rule = createHiddenRule(node({ attrs: { 'data-view-id': 'summary-panel' }, text: 'Before' }))
  const target = node({ attrs: { 'data-view-id': 'summary-panel' }, text: 'After' })
  const unrelated = node({ attrs: { 'data-view-id': 'other-panel' }, text: 'After' })
  assert.deepEqual([...resolveUniqueHiddenMatches([target, unrelated], [rule])], [target])
})

test('resolves only the intended sibling when navigation classes are shared', () => {
  const rule = { tag: 'button', id: '', classes: ['shared-settings-entry'], attrs: {}, text: 'Extension panel' }
  const target = node({ tag: 'button', classes: 'shared-settings-entry', text: 'Extension panel' })
  const sibling = node({ tag: 'button', classes: 'shared-settings-entry', text: 'General' })
  assert.deepEqual([...resolveUniqueHiddenMatches([target, sibling], [rule])], [target])
})
