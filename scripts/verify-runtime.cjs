const { chromium } = require('playwright')

const endpoint = process.argv[2] || 'http://127.0.0.1:3747'
const launchOptions = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {}

async function main() {
  const browser = await chromium.launch({ ...launchOptions, headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.goto(endpoint, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)

    await page.keyboard.press('F1')
    await page.locator('#dsh-element-inspector-root .dei-badge').waitFor({ timeout: 10_000 })
    const pickerVisible = await page.locator('#dsh-element-inspector-root .dei-mask').isVisible()
    await page.keyboard.press('Escape')

    await page.keyboard.press('F1')
    await page.keyboard.press('F1')
    const settings = page.getByRole('dialog', { name: '设置' })
    await settings.waitFor({ timeout: 10_000 })
    const settingsVisible = await settings.isVisible()

    console.log(JSON.stringify({ pickerVisible, settingsVisible }))
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
