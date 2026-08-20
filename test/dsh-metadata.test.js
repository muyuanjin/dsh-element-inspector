import test from 'node:test'
import assert from 'node:assert/strict'
import { isDshPackage } from '../dsh-metadata.js'

test('recognizes DSH packages without classifying third-party plugins', () => {
  assert.equal(isDshPackage('@deepseek-ai/dsh-client-ui-shell'), true)
  assert.equal(isDshPackage('@deepseek-ai/dsh'), true)
  assert.equal(isDshPackage('deepseek-harness'), true)
  assert.equal(isDshPackage('dsh-plugin-example'), false)
  assert.equal(isDshPackage('@third-party/dsh-client-ui-shell'), false)
})
