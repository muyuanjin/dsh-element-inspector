import test from 'node:test'
import assert from 'node:assert/strict'
import { extractSignals, scoreEvidence } from '../scoring.js'

const pkg = (packageName, source, file = 'client.js') => ({
  packageName,
  version: '1.0.0',
  repositoryUrl: '',
  files: [{ file, source }],
})

const dsh = (packageName, source, file = 'client.js') => ({
  ...pkg(packageName, source, file),
  ownerType: 'dsh',
})

test('confirms one package from two unique class markers', () => {
  const outcome = scoreEvidence([
    pkg('plugin-alpha', '<button class="alpha-toolbar-action alpha-toolbar-button">'),
    pkg('plugin-beta', '<div class="beta-panel">'),
  ], { classes: 'alpha-toolbar-action alpha-toolbar-button', text: '操作' })
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
    pkg('inner-plugin', 'inner-slot-control inner-slot-action'),
  ], {
    classes: 'inner-slot-control inner-slot-action',
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
  const signals = extractSignals({ classes: 'button active css-a81f9e2d uV2eYG_input hHd-Xa_settingsArea useful-control-group' })
  assert.deepEqual(signals.filter(signal => signal.kind === 'class').map(signal => signal.value), ['useful-control-group'])
})

test('filters generated mixed-case IDs and React useId values', () => {
  const signals = extractSignals({ id: 'uV2eYG_input', classes: 'qDHVXG_searchInput', attrs: { 'data-control': ':r19:' } })
  assert.deepEqual(signals, [])
})

test('keeps one unique class as a candidate instead of confirming it', () => {
  const outcome = scoreEvidence([pkg('plugin-alpha', 'alpha-toolbar-action')], { classes: 'alpha-toolbar-action' })
  assert.equal(outcome.certainty, 'candidate')
  assert.match(outcome.reasons.join(' '), /单个 class/)
})

test('uses a descriptive empty data attribute as a nearest plugin boundary', () => {
  const outcome = scoreEvidence([
    pkg('dsh-better-sidebar', 'const marker = "data-dsh-better-sidebar-settings-nav"; const label = "侧边卡片"'),
    dsh('@deepseek-ai/dsh-client-ui-settings-general', 'data-slot="sidebar.settings"'),
    dsh('@deepseek-ai/dsh-client-ui-sidebar', 'hHd-Xa_settingsArea hHd-Xa_footArea'),
  ], {
    text: '侧边卡片',
    classes: 'VOzbGW_navCell',
    attrs: { 'data-dsh-better-sidebar-settings-nav': '' },
    ancestors: [
      { classes: 'VOzbGW_navList' },
      { classes: 'VOzbGW_nav' },
      { classes: 'VOzbGW_panel' },
      { classes: 'VOzbGW_overlay' },
      { attrs: { 'data-slot': 'sidebar.settings' } },
      { classes: 'hHd-Xa_settingsArea' },
      { classes: 'hHd-Xa_footArea' },
    ],
  })

  assert.equal(outcome.certainty, 'confirmed')
  assert.equal(outcome.results[0].packageName, 'dsh-better-sidebar')
  assert.equal(outcome.results[0].nearestExclusiveDepth, 0)
  assert.equal(outcome.results[0].matchedMarkers[0].kind, 'data-name')
})

test('attributes a shell-rendered navigation row through its runtime slot registration', () => {
  const componentSource = 'function CostSection(props) { const cost = props.useCost(state => state); return createElement("section", null, cost.total) }'
  const outcome = scoreEvidence([
    pkg('dsh-cost-meter', `const section = "cost-meter-zh"; ${componentSource}`),
    dsh('@deepseek-ai/dsh-client-ui-settings', 'data-slot="sidebar.settings"'),
  ], {
    text: '费用',
    classes: 'generated-settings-row',
    ancestors: [{}, {}, {}, {}, { attrs: { 'data-slot': 'sidebar.settings' } }],
    runtimeRegistrations: [{
      slot: 'settings.section',
      key: 'cost-meter-zh',
      depth: 0,
      sources: [componentSource],
    }],
  })

  assert.equal(outcome.certainty, 'confirmed')
  assert.equal(outcome.results[0].packageName, 'dsh-cost-meter')
  assert.equal(outcome.results[0].matchedMarkers[0].kind, 'runtime-source')
})

test('does not call a child official when only a distant DSH container matches', () => {
  const outcome = scoreEvidence([
    dsh('@deepseek-ai/dsh-client-ui-settings', 'data-slot="sidebar.settings"'),
  ], {
    text: 'External section',
    ancestors: [{}, {}, {}, {}, { attrs: { 'data-slot': 'sidebar.settings' } }],
  })

  assert.equal(outcome.certainty, 'candidate')
  assert.deepEqual(outcome.results, [])
  assert.match(outcome.reasons.join(' '), /不能据此判定.*官方界面/)
})

test('requires namespace-like specificity for an empty data attribute boundary', () => {
  const signals = extractSignals({ attrs: { 'data-state': '', 'data-slot': '', 'data-testid': '', 'data-test-id': '', 'data-foo-bar': '' } })
  assert.deepEqual(signals, [])
})

test('matches an empty data attribute name as a whole source token', () => {
  const outcome = scoreEvidence([
    pkg('plugin-alpha', 'data-plugin-control-extra'),
    pkg('plugin-beta', 'data-plugin-control'),
  ], { attrs: { 'data-plugin-control': '' } })

  assert.equal(outcome.certainty, 'confirmed')
  assert.equal(outcome.results[0].packageName, 'plugin-beta')
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

test('finds a later exact source match after an earlier substring', () => {
  const outcome = scoreEvidence([pkg('plugin-alpha', 'alpha-control-extra alpha-control')], { id: 'alpha-control' })
  assert.equal(outcome.certainty, 'confirmed')
})

test('identifies DSH core sources as the host instead of a plugin', () => {
  const outcome = scoreEvidence([
    dsh('@deepseek-ai/dsh-client-ui-chat', 'data-testid="dsh-chat-composer"'),
    pkg('third-party-tools', 'className="third-party-panel"'),
  ], { attrs: { 'data-testid': 'dsh-chat-composer' } })

  assert.equal(outcome.certainty, 'confirmed')
  assert.equal(outcome.results[0].ownerType, 'dsh')
  assert.equal(outcome.results[0].ownerName, 'DSH 官方界面')
  assert.equal(outcome.results[0].packageName, undefined)
})

test('groups all DSH packages as one owner when calculating exclusivity', () => {
  const outcome = scoreEvidence([
    dsh('@deepseek-ai/dsh-client-ui-shell', 'data-testid="dsh-main-toolbar"'),
    dsh('@deepseek-ai/dsh-client-ui-chat', 'data-testid="dsh-main-toolbar"'),
    pkg('third-party-tools', 'className="third-party-panel"'),
  ], { attrs: { 'data-testid': 'dsh-main-toolbar' } })

  assert.equal(outcome.certainty, 'confirmed')
  assert.equal(outcome.results.length, 1)
  assert.deepEqual(outcome.results[0].sourcePackages, [
    '@deepseek-ai/dsh-client-ui-shell',
    '@deepseek-ai/dsh-client-ui-chat',
  ])
})

test('keeps DSH and a plugin ambiguous when both own markers at the same depth', () => {
  const outcome = scoreEvidence([
    dsh('@deepseek-ai/dsh-client-ui-shell', 'className="dsh-toolbar-zone"'),
    pkg('third-party-tools', 'className="plugin-toolbar-zone"'),
  ], { classes: 'dsh-toolbar-zone plugin-toolbar-zone' })

  assert.equal(outcome.certainty, 'candidate')
  assert.match(outcome.reasons.join(' '), /其他归属来源/)
})
