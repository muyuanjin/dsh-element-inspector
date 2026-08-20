import { toBlob } from 'html-to-image'
import TurndownService from 'turndown'
import { gfm } from '@joplin/turndown-plugin-gfm'

const MAX_TEXT_LENGTH = 2_000_000
const MAX_CAPTURE_EDGE = 8_192
const MAX_CAPTURE_PIXELS = 24_000_000
const MIN_CAPTURE_RATIO = 0.2

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})
turndown.use(gfm)
turndown.remove(['script', 'style', 'noscript', 'template'])

function requireElement(element) {
  if (!(element instanceof Element) || !element.isConnected) throw new Error('所选元素已不在页面中，请重新选择')
  return element
}

function cloneWithoutInspector(element, inspectorRootId) {
  const clone = requireElement(element).cloneNode(true)
  if (clone instanceof Element && clone.id === inspectorRootId) throw new Error('不能导出元素检查器自身界面')
  clone.querySelectorAll?.('[id]').forEach(node => {
    if (node.id === inspectorRootId) node.remove()
  })
  return clone
}

function boundedText(value, kind) {
  const text = String(value)
  if (text.length > MAX_TEXT_LENGTH) throw new Error(`元素${kind}超过 200 万字符，请选择更小的范围`)
  return text
}

function parseCssColor(value) {
  if (value === 'transparent') return { red: 0, green: 0, blue: 0, alpha: 0 }
  if (!/^rgba?\(/i.test(value)) return undefined
  const numbers = value.match(/[\d.]+/g)?.map(Number)
  if (!numbers || numbers.length < 3 || numbers.some(number => !Number.isFinite(number))) return undefined
  return {
    red: Math.max(0, Math.min(numbers[0], 255)),
    green: Math.max(0, Math.min(numbers[1], 255)),
    blue: Math.max(0, Math.min(numbers[2], 255)),
    alpha: Math.max(0, Math.min(numbers[3] ?? 1, 1)),
  }
}

function overlay(foreground, background) {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha)
  if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 }
  const channel = key => (foreground[key] * foreground.alpha + background[key] * background.alpha * (1 - foreground.alpha)) / alpha
  return { red: channel('red'), green: channel('green'), blue: channel('blue'), alpha }
}

export function compositeCssColors(colors, fallback = 'rgb(255, 255, 255)') {
  let result = parseCssColor(fallback) ?? { red: 255, green: 255, blue: 255, alpha: 1 }
  for (const value of colors) {
    const color = parseCssColor(value)
    if (color) result = overlay(color, result)
  }
  return `rgb(${Math.round(result.red)}, ${Math.round(result.green)}, ${Math.round(result.blue)})`
}

function elementBackdrop(element) {
  const colors = []
  for (let node = element.parentElement; node; node = node.parentElement) {
    const value = getComputedStyle(node).backgroundColor
    const color = parseCssColor(value)
    if (!color || color.alpha === 0) continue
    colors.unshift(value)
    if (color.alpha >= 0.999) break
  }
  return compositeCssColors(colors)
}

export function serializeElement(element, inspectorRootId) {
  return boundedText(cloneWithoutInspector(element, inspectorRootId).outerHTML, ' HTML')
}

export function htmlToMarkdown(html) {
  return boundedText(turndown.turndown(boundedText(html, ' HTML')).trim(), ' Markdown')
}

export function elementToMarkdown(element, inspectorRootId) {
  return htmlToMarkdown(serializeElement(element, inspectorRootId))
}

export async function captureElementPng(element, inspectorRootId, requestedPixelRatio) {
  const target = requireElement(element)
  const rect = target.getBoundingClientRect()
  const width = Math.ceil(rect.width)
  const height = Math.ceil(rect.height)
  if (width < 1 || height < 1) throw new Error('所选元素没有可截图的可见尺寸')

  const preferredRatio = Math.max(1, Math.min(Number(requestedPixelRatio) || 1, 2))
  const pixelRatio = Math.min(
    preferredRatio,
    MAX_CAPTURE_EDGE / width,
    MAX_CAPTURE_EDGE / height,
    Math.sqrt(MAX_CAPTURE_PIXELS / (width * height)),
  )
  if (!Number.isFinite(pixelRatio) || pixelRatio < MIN_CAPTURE_RATIO) throw new Error('所选元素过大，请选择更小的范围')

  const blob = await toBlob(target, {
    backgroundColor: elementBackdrop(target),
    width,
    height,
    style: { overflow: 'hidden' },
    pixelRatio,
    skipFonts: true,
    filter: node => !(node instanceof Element) || node.id !== inspectorRootId,
  })
  if (!blob) throw new Error('浏览器未能生成截图')
  return blob
}
