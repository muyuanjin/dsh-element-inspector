const { chromium } = require('playwright')
const { findInspectableTarget } = require('./live-target.cjs')

const endpoint = process.argv[2] || 'http://127.0.0.1:6894'
const launchOptions = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {}

async function clipboardPng(page) {
  return page.evaluate(async () => {
    const items = await navigator.clipboard.read()
    const item = items.find(candidate => candidate.types.includes('image/png'))
    if (!item) throw new Error('Clipboard does not contain image/png')
    const blob = await item.getType('image/png')
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(bitmap, 0, 0)
    const points = [[0, 0], [bitmap.width - 1, 0], [0, bitmap.height - 1], [bitmap.width - 1, bitmap.height - 1]]
    const pixels = points.map(([x, y]) => [...context.getImageData(x, y, 1, 1).data])
    return { type: blob.type, size: blob.size, width: bitmap.width, height: bitmap.height, pixels }
  })
}

async function main() {
  const browser = await chromium.launch({ ...launchOptions, headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const page = await context.newPage()
  await page.goto(endpoint, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const { target } = await findInspectableTarget(page)
  const targetBox = await target.boundingBox()
  if (!targetBox) throw new Error('Selected export target is not visible')
  await page.keyboard.press('F1')
  await target.hover()
  await target.click()
  await page.locator('.dei-pill-confirmed').waitFor({ timeout: 20_000 })

  await page.getByRole('button', { name: '截图' }).click()
  await page.getByText('元素截图已复制到剪贴板').waitFor()
  const png = await clipboardPng(page)
  if (png.width !== Math.ceil(targetBox.width) || png.height !== Math.ceil(targetBox.height)) {
    throw new Error(`Screenshot expanded beyond visible bounds: ${png.width}x${png.height}, expected ${Math.ceil(targetBox.width)}x${Math.ceil(targetBox.height)}`)
  }
  if (png.pixels.some(pixel => pixel[3] !== 255)) throw new Error(`Screenshot contains transparency: ${JSON.stringify(png.pixels)}`)
  if (png.pixels.every(pixel => pixel[0] < 8 && pixel[1] < 8 && pixel[2] < 8)) throw new Error(`Screenshot background is black: ${JSON.stringify(png.pixels)}`)

  await page.getByRole('button', { name: '复制 HTML' }).click()
  await page.getByText('元素 HTML 已复制').waitFor()
  const html = await page.evaluate(() => navigator.clipboard.readText())
  if (!/^<[^>]+>/.test(html)) throw new Error('Copied HTML is not an element outerHTML')

  await page.getByRole('button', { name: '复制 Markdown' }).click()
  await page.getByText('元素 Markdown 已复制').waitFor()
  const markdown = await page.evaluate(() => navigator.clipboard.readText())
  if (!markdown.trim()) throw new Error('Copied Markdown is empty')
  if ((await page.locator('.dei-panel').innerText()).includes('永久隐藏')) throw new Error('Legacy permanent-hide wording is still visible')

  console.log(JSON.stringify({ png, htmlLength: html.length, markdownLength: markdown.length }, null, 2))
  await context.close()
  await browser.close()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
