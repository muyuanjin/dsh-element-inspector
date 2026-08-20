const { chromium } = require('playwright')
const { findInspectableTarget } = require('./live-target.cjs')

const endpoint = process.argv[2] || 'http://127.0.0.1:3747'

async function main() {
  const browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {}),
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(endpoint, { waitUntil: 'domcontentloaded' })
  const { target } = await findInspectableTarget(page, 'plugin')
  await page.keyboard.press('F1')
  await target.hover()
  await target.click()
  const button = page.getByRole('button', { name: '打开插件文件夹' })
  await button.waitFor({ state: 'visible', timeout: 20_000 })
  await button.click()
  const notice = page.getByRole('status')
  await notice.waitFor({ state: 'visible', timeout: 10_000 })
  console.log(await notice.textContent())
  await browser.close()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
