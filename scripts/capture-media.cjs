const { copyFile, mkdir } = require('node:fs/promises')
const { resolve } = require('node:path')
const { chromium } = require('playwright')
const { findInspectableTarget, installPrivacyMasks } = require('./live-target.cjs')

const endpoint = process.argv[2] || 'http://127.0.0.1:3747'
const assets = resolve(__dirname, '..', 'assets')
const videoDir = resolve(__dirname, '..', '.media-video')
const launchOptions = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {}

async function ready(page) {
  await page.goto(endpoint, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const inspected = await findInspectableTarget(page)
  await installPrivacyMasks(page, inspected.target)
  return inspected
}

async function inspect(page, target) {
  await page.keyboard.press('F1')
  await target.hover()
  await page.waitForTimeout(500)
  await target.click()
  await page.locator('.dei-panel').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.dei-pill-confirmed').waitFor()
}

async function main() {
  console.log('stage: prepare')
  await mkdir(assets, { recursive: true })
  await mkdir(videoDir, { recursive: true })
  const browser = await chromium.launch({ ...launchOptions, headless: true })
  console.log('stage: screenshot browser launched')
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 })
  const screenshotTarget = await ready(page)
  console.log('stage: page ready')
  await inspect(page, screenshotTarget.target)
  console.log('stage: result visible')
  await page.locator('.dei-panel').screenshot({ path: resolve(assets, 'element-radar-result.png') })

  const resultBox = await page.locator('.dei-panel').boundingBox()
  await page.getByRole('button', { name: '插件设置' }).click()
  await page.getByRole('dialog', { name: '设置' }).waitFor()
  await page.locator('.dei-panel').screenshot({ path: resolve(assets, 'element-radar-settings.png') })
  console.log('stage: screenshots saved')

  await page.setViewportSize({ width: 390, height: 760 })
  const narrowBox = await page.locator('.dei-panel').boundingBox()
  const narrowScroll = await page.locator('.dei-panel').evaluate(node => ({
    width: node.scrollWidth,
    clientWidth: node.clientWidth,
    height: node.scrollHeight,
    clientHeight: node.clientHeight,
  }))
  await page.locator('body').evaluate(node => node.toggleAttribute('data-ds-dark-theme', true))
  const darkColors = await page.locator('.dei-panel').evaluate(node => {
    const style = getComputedStyle(node)
    return { background: style.backgroundColor, color: style.color }
  })
  await browser.close()
  console.log('stage: screenshot browser closed')

  const videoBrowser = await chromium.launch({ ...launchOptions, headless: true })
  console.log('stage: video browser launched')
  const context = await videoBrowser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
  })
  const videoPage = await context.newPage()
  const videoTarget = await ready(videoPage)
  console.log('stage: video page ready')
  await videoPage.waitForTimeout(600)
  await videoPage.keyboard.press('F1')
  await videoTarget.target.hover()
  await videoPage.waitForTimeout(900)
  await videoTarget.target.click()
  await videoPage.locator('.dei-panel').waitFor({ state: 'visible', timeout: 20_000 })
  console.log('stage: video result visible')
  await videoPage.waitForTimeout(1500)
  await videoPage.getByRole('button', { name: '插件设置' }).click()
  await videoPage.waitForTimeout(1300)
  await videoPage.getByRole('button', { name: '更改' }).click()
  await videoPage.waitForTimeout(900)
  await videoPage.keyboard.press('Escape')
  await videoPage.waitForTimeout(800)
  await videoPage.getByRole('button', { name: '返回' }).click()
  await videoPage.waitForTimeout(1100)
  const video = videoPage.video()
  await context.close()
  console.log('stage: video context closed')
  const sourceVideo = await video.path()
  await copyFile(sourceVideo, resolve(videoDir, 'element-radar-demo.webm'))
  await videoBrowser.close()
  console.log('stage: video saved')

  console.log(JSON.stringify({ resultBox, narrowBox, narrowScroll, darkColors }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
