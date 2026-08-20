function targetInfo(target) {
  const attrs = {}
  for (const attr of target.attributes ?? []) if (/^(data-|aria-|role$)/.test(attr.name)) attrs[attr.name] = attr.value
  const ancestors = []
  let node = target.parentElement
  for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
    const ancestorAttrs = {}
    for (const attr of node.attributes ?? []) if (/^(data-|aria-|role$)/.test(attr.name)) ancestorAttrs[attr.name] = attr.value
    ancestors.push({ id: node.id || '', classes: typeof node.className === 'string' ? node.className.slice(0, 240) : '', attrs: ancestorAttrs })
  }
  return {
    text: String(target.innerText || target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180),
    aria: target.getAttribute('aria-label') || '', id: target.id || '',
    classes: typeof target.className === 'string' ? target.className.slice(0, 240) : '',
    attrs, ancestors, tag: target.tagName || '',
  }
}

async function findInspectableTarget(page, requiredOwnerType) {
  const candidates = page.locator('button,[role="button"]')
  const count = Math.min(await candidates.count(), 80)
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index)
    if (!await candidate.isVisible()) continue
    const evaluation = await candidate.evaluate(async (element, { serialize, requiredOwnerType }) => {
      if (element.closest('#dsh-element-inspector-root')) return undefined
      const query = Function(`return (${serialize})`)()(element)
      if (!query.text && !query.aria) return undefined
      const rpcId = crypto.randomUUID()
      const response = await fetch('/dsh-element-inspector/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId, method: 'resolve', payload: query }),
      })
      const envelope = await response.json()
      if (!response.ok || envelope.rpcId !== rpcId || !envelope.result?.ok) return undefined
      const result = envelope.result.value
      const owner = result.results?.[0]
      if (result.certainty !== 'confirmed' || (requiredOwnerType && owner?.ownerType !== requiredOwnerType)) return undefined
      return { query, ownerType: owner?.ownerType, ownerName: owner?.ownerName, packageName: owner?.packageName }
    }, { serialize: targetInfo.toString(), requiredOwnerType })
    if (evaluation) return { target: candidate, ...evaluation }
  }
  throw new Error('No privacy-safe element with exclusive runtime evidence was found')
}

async function installPrivacyMasks(page, target) {
  const box = await target.boundingBox()
  if (!box) throw new Error('Selected media target is not visible')
  await page.evaluate((rect) => {
    document.querySelectorAll('[data-element-radar-redaction]').forEach(element => element.remove())
    const regions = [
      [0, 0, window.innerWidth, rect.y],
      [0, rect.y, rect.x, rect.height],
      [rect.x + rect.width, rect.y, window.innerWidth - rect.x - rect.width, rect.height],
      [0, rect.y + rect.height, window.innerWidth, window.innerHeight - rect.y - rect.height],
    ]
    for (const [left, top, width, height] of regions) {
      if (width <= 0 || height <= 0) continue
      const mask = document.createElement('div')
      mask.dataset.elementRadarRedaction = '1'
      Object.assign(mask.style, {
        position: 'fixed', left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`,
        zIndex: '2147483000', pointerEvents: 'none', background: '#f7f8fa',
      })
      document.body.append(mask)
    }
  }, box)
}

module.exports = { findInspectableTarget, installPrivacyMasks }
