import test from 'node:test'
import assert from 'node:assert/strict'
import { extractSignals, scoreEvidence } from '../scoring.js'

const pkg = (packageName, source, file = 'client.js') => ({
  packageName,
  version: '1.0.0',
  repositoryUrl: '',
  files: [{ file, source }],
})

test('confirms one package from a unique strong marker', () => {
  const outcome = scoreEvidence([
    pkg('plugin-alpha', '<button class="alpha-toolbar-action">'),
    pkg('plugin-beta', '<div class="beta-panel">'),
  ], { classes: 'alpha-toolbar-action', text: '操作' })
  assert.equal(outcome.certainty, 'confirmed')
  assert.equal(outcome.results[0].packageName, 'plugin-alpha')
})

test('keeps a shared strong marker as a candidate', () => {
  const outcome = scoreEvidence([
    pkg('plugin-alpha', '<button class="shared-toolbar-action">'),
    pkg('plugin-beta', '<button class="shared-toolbar-action">'),
  ], { classes: 'shared-toolbar-action' })
  assert.equal(outcome.certainty, 'candidate')
  assert.equal(outcome.results.length, 2)
})

test('text and React owner can rank but never confirm alone', () => {
  const outcome = scoreEvidence([
    pkg('plugin-alpha', 'function StatusWidget(){ return "共享文案" }'),
    pkg('plugin-beta', 'const copy = "共享文案"'),
  ], { owner: 'StatusWidget', text: '共享文案' })
  assert.equal(outcome.certainty, 'candidate')
  assert.equal(outcome.results[0].packageName, 'plugin-alpha')
})

test('keeps close competing evidence as a candidate', () => {
  const outcome = scoreEvidence([
    pkg('plugin-alpha', 'const id = "alpha-settings-pane"'),
    pkg('plugin-beta', 'const id = "beta-settings-pane"'),
  ], { id: 'alpha-settings-pane', classes: 'beta-settings-pane' })
  assert.equal(outcome.certainty, 'candidate')
})

test('attributes nested UI to the nearest plugin boundary', () => {
  const outcome = scoreEvidence([
    pkg('outer-plugin', 'className="outer-settings-section"'),
    pkg('inner-plugin', 'data-testid="inner-provider-control"'),
    pkg('unrelated-plugin', 'className="unrelated-widget"'),
  ], {
    text: '启用',
    ancestors: [
      { attrs: { 'data-testid': 'inner-provider-control' } },
      { classes: 'layout-row' },
      { classes: 'outer-settings-section' },
    ],
  })
  assert.equal(outcome.certainty, 'confirmed')
  assert.equal(outcome.results[0].packageName, 'inner-plugin')
  assert.equal(outcome.results[0].nearestExclusiveDepth, 1)
})

test('does not let many outer markers outweigh one nearest nested boundary', () => {
  const outcome = scoreEvidence([
    pkg('outer-plugin', 'outer-settings-root outer-settings-panel outer-settings-row outer-settings-section outer-settings-content'),
    pkg('inner-plugin', 'inner-slot-control'),
  ], {
    classes: 'inner-slot-control',
    ancestors: [
      { classes: 'layout-row' },
      { classes: 'outer-settings-root outer-settings-panel outer-settings-row outer-settings-section outer-settings-content' },
    ],
  })
  assert.equal(outcome.certainty, 'confirmed')
  assert.equal(outcome.results[0].packageName, 'inner-plugin')
})

test('does not confirm two plugin boundaries at the same nesting depth', () => {
  const outcome = scoreEvidence([
    pkg('plugin-alpha', 'data-zone="alpha-control-zone"'),
    pkg('plugin-beta', 'className="beta-control-zone"'),
  ], {
    attrs: { 'data-zone': 'alpha-control-zone' },
    classes: 'beta-control-zone',
  })
  assert.equal(outcome.certainty, 'candidate')
})

test('filters generic and generated class names before scanning', () => {
  const signals = extractSignals({ classes: 'button active css-a81f9e2d useful-control-group' })
  assert.deepEqual(signals.filter(signal => signal.kind === 'class').map(signal => signal.value), ['useful-control-group'])
})

test('explains why weak exclusive evidence remains a candidate', () => {
  const outcome = scoreEvidence([pkg('plugin-alpha', 'weak-owner')], { owner: 'weak-owner' })
  assert.equal(outcome.certainty, 'candidate')
  assert.match(outcome.reasons.join(' '), /辅助信息/)
})

test('does not treat a marker substring as an exact source match', () => {
  const outcome = scoreEvidence([pkg('plugin-alpha', 'className="alpha-control-extra"')], { classes: 'alpha-control' })
  assert.equal(outcome.results.length, 0)
})
