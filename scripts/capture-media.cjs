const { spawn } = require('node:child_process')
const { copyFile, mkdir } = require('node:fs/promises')
const { resolve } = require('node:path')
const { chromium } = require('playwright')
const { findInspectableTarget, installPrivacyMasks } = require('./live-target.cjs')

const endpoint = process.argv[2] || 'http://127.0.0.1:8391'
const assets = resolve(__dirname, '..', 'assets')
const videoDir = resolve(__dirname, '..', '.media-video')
const resultImage = resolve(assets, 'dsh-element-inspector-result.png')
const settingsImage = resolve(assets, 'dsh-element-inspector-settings.png')
const sourceVideo = resolve(videoDir, 'dsh-element-inspector-demo.webm')
const demoGif = resolve(assets, 'dsh-element-inspector-demo.gif')
const launchOptions = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk })
    child.once('error', reject)
    child.once('close', code => code === 0
      ? resolvePromise()
      : reject(new Error(`${command} exited with ${code}: ${stderr.slice(-2000)}`)))
  })
}

async function ready(page) {
  await page.goto(endpoint, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const inspected = await findInspectableTarget(page)
  await installPrivacyMasks(page, inspected.target)
  return inspected
}

async function beginSelection(page, target, pause = 700) {
  const box = await target.boundingBox()
  if (!box) throw new Error('Media target disappeared before selection')
  await page.keyboard.press('F1')
  await page.locator('.dei-badge').waitFor({ state: 'visible' })
  await page.mouse.move(24, 80)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 })
  const mask = page.locator('.dei-mask')
  await mask.waitFor({ state: 'visible' })
  await page.waitForFunction(() => {
    const node = document.querySelector('.dei-mask')
    const rect = node?.getBoundingClientRect()
    return Boolean(rect && rect.width > 2 && rect.height > 2 && getComputedStyle(node).borderTopWidth !== '0px')
  })
  await page.waitForTimeout(pause)
  return box
}

async function inspect(page, target) {
  const box = await beginSelection(page, target)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.locator('.dei-panel').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.dei-pill-confirmed').waitFor()
  await page.getByRole('button', { name: '复制 HTML' }).waitFor()
}

async function redactSettingsRows(page) {
  await page.locator('.dei-rule-row .dei-row-main').evaluateAll(nodes => {
    for (const node of nodes) {
      const lines = [node.querySelector('.dei-row-title'), node.querySelector('.dei-row-description')].filter(Boolean)
      lines.forEach((line, index) => {
        line.textContent = ''
        Object.assign(line.style, {
          width: index === 0 ? '68%' : '46%',
          height: index === 0 ? '12px' : '9px',
          borderRadius: '4px',
          background: 'var(--dsw-alias-bg-module-platform,#e6e8eb)',
        })
      })
    }
  })
}

async function convertVideoToGif() {
  const filter = 'trim=start=1.5,setpts=PTS-STARTPTS,fps=10,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4'
  await run('ffmpeg', ['-y', '-i', sourceVideo, '-vf', filter, '-loop', '0', demoGif])
}

async function main() {
  await mkdir(assets, { recursive: true })
  await mkdir(videoDir, { recursive: true })

  const browser = await chromium.launch({ ...launchOptions, headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 })
  const screenshotTarget = await ready(page)
  await inspect(page, screenshotTarget.target)
  await page.locator('.dei-panel').screenshot({ path: resultImage })

  const resultBox = await page.locator('.dei-panel').boundingBox()
  await page.getByRole('button', { name: '插件设置' }).click()
  await page.getByRole('dialog', { name: '设置' }).waitFor()
  await redactSettingsRows(page)
  await page.locator('.dei-panel').screenshot({ path: settingsImage })

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

  const videoBrowser = await chromium.launch({ ...launchOptions, headless: true })
  const context = await videoBrowser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['clipboard-read', 'clipboard-write'],
    recordVideo: { dir: videoDir, size: { width: 960, height: 600 } },
  })
  const videoPage = await context.newPage()
  const videoTarget = await ready(videoPage)
  await videoPage.waitForTimeout(900)
  const targetBox = await beginSelection(videoPage, videoTarget.target, 1600)
  const highlightBox = await videoPage.locator('.dei-mask').boundingBox()
  await videoPage.mouse.click(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2)
  await videoPage.locator('.dei-pill-confirmed').waitFor({ timeout: 20_000 })
  await videoPage.getByRole('button', { name: '复制 HTML' }).waitFor()
  await videoPage.waitForTimeout(1800)
  await videoPage.getByRole('button', { name: '复制 HTML' }).click()
  await videoPage.getByText('元素 HTML 已复制').waitFor()
  await videoPage.waitForTimeout(1500)
  const video = videoPage.video()
  await context.close()
  await copyFile(await video.path(), sourceVideo)
  await videoBrowser.close()
  await convertVideoToGif()

  console.log(JSON.stringify({ resultBox, narrowBox, narrowScroll, darkColors, highlightBox, demoGif }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
