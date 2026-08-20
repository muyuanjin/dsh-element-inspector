import test from 'node:test'
import assert from 'node:assert/strict'
import { compositeCssColors, htmlToMarkdown } from '../src/selection-actions.js'

test('converts common HTML structures to GitHub Flavored Markdown', () => {
  const markdown = htmlToMarkdown(`
    <article>
      <h2>Heading</h2>
      <p>A <a href="https://example.com">link</a>.</p>
      <ul><li>first</li><li>second</li></ul>
      <table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>alpha</td><td>1</td></tr></tbody></table>
      <pre><code class="language-js">const value = 1</code></pre>
    </article>
  `)
  assert.match(markdown, /^## Heading/m)
  assert.match(markdown, /\[link\]\(https:\/\/example\.com\)/)
  assert.match(markdown, /-\s+first/)
  assert.match(markdown, /\| Name\s+\| Value\s+\|/)
  assert.match(markdown, /```js\s+const value = 1\s+```/)
})

test('removes executable and presentation-only nodes from Markdown', () => {
  const markdown = htmlToMarkdown('<section><script>alert(1)</script><style>b{color:red}</style><template>hidden</template><p>Visible</p></section>')
  assert.equal(markdown, 'Visible')
})

test('composites transparent element ancestors over the page background', () => {
  assert.equal(compositeCssColors([
    'rgb(240, 242, 245)',
    'rgba(0, 0, 0, 0.1)',
  ]), 'rgb(216, 218, 221)')
  assert.equal(compositeCssColors([]), 'rgb(255, 255, 255)')
})
