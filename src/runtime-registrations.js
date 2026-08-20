function functionSource(value) {
  if (typeof value !== 'function') return ''
  try { return Function.prototype.toString.call(value) } catch { return '' }
}

function sourceSamples(value) {
  const source = functionSource(value).trim()
  if (source.length < 80 || source.includes('[native code]')) return []
  if (source.length <= 900) return [source]
  const width = 320
  return [...new Set([0, Math.floor((source.length - width) / 2), source.length - width].map(start => source.slice(start, start + width)))].filter(Boolean)
}

function slotNames(slots) {
  let roots
  try { roots = slots.snapshot() } catch { return [] }
  const names = new Set()
  const visit = node => {
    if (!node || typeof node !== 'object') return
    if (typeof node.name === 'string') names.add(node.name)
    for (const child of Array.isArray(node.children) ? node.children : []) visit(child)
  }
  for (const root of Array.isArray(roots) ? roots : []) visit(root)
  return [...names]
}

function quotedInSource(source, value) {
  return [`"${value}"`, `'${value}'`, `\`${value}\``].some(quoted => source.includes(quoted))
}

function slotsReferencedByFiber(fiber, names) {
  const direct = [fiber?.memoizedProps?.slotKey, fiber?.memoizedProps?.['data-slot']].filter(value => names.includes(value))
  const sources = [...new Set([functionSource(fiber?.type), functionSource(fiber?.elementType)].filter(Boolean))]
  return [...new Set([...direct, ...names.filter(name => sources.some(source => quotedInSource(source, name)))])]
}

function nearestProjectedSlots(fibers, names) {
  for (const fiber of fibers) {
    if (typeof fiber.type === 'string' && !fiber.key) continue
    const referenced = slotsReferencedByFiber(fiber, names)
    if (referenced.length) return new Set(referenced)
  }
  return new Set()
}

function collectEntries(slots, names) {
  const entries = []
  for (const slot of names) {
    let slotEntries
    try { slotEntries = slots.entries(slot) } catch { continue }
    for (const entry of Array.isArray(slotEntries) ? slotEntries : []) entries.push({ slot, entry })
  }
  return entries
}

export function runtimeRegistrations(target, slots) {
  const fiberKey = Object.keys(target).find(key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$'))
  let fiber = fiberKey ? target[fiberKey] : undefined
  const fibers = []
  for (let depth = 0; fiber && depth < 32; depth += 1, fiber = fiber.return) {
    fibers.push({ depth, key: typeof fiber.key === 'string' ? fiber.key : fiber.key == null ? '' : String(fiber.key), type: fiber.type, elementType: fiber.elementType, memoizedProps: fiber.memoizedProps })
  }
  if (!fibers.length) return []

  const names = slotNames(slots)
  const entries = collectEntries(slots, names)
  const projectedSlots = nearestProjectedSlots(fibers, names)
  const projectedKeyMatches = new Map()
  for (const { slot, entry } of entries) {
    if (!projectedSlots.has(slot)) continue
    const optionKey = entry?.options?.id ?? entry?.options?.key
    if (optionKey === undefined) continue
    for (const row of fibers) {
      if (typeof row.type !== 'string' || row.key !== String(optionKey)) continue
      const key = `${row.depth}\0${row.key}`
      const current = projectedKeyMatches.get(key) ?? []
      current.push({ slot, entry, depth: row.depth })
      projectedKeyMatches.set(key, current)
    }
  }

  const matches = []
  for (const { slot, entry } of entries) {
    const optionKey = entry?.options?.id ?? entry?.options?.key
    let depth = Number.POSITIVE_INFINITY
    for (const row of fibers) {
      if (typeof row.type === 'function' && (row.type === entry.component || row.elementType === entry.component)) depth = Math.min(depth, row.depth)
      if (optionKey === undefined || typeof row.type !== 'string' || row.key !== String(optionKey)) continue
      const keyMatches = projectedKeyMatches.get(`${row.depth}\0${row.key}`) ?? []
      if (keyMatches.length === 1 && keyMatches[0].slot === slot && keyMatches[0].entry === entry) depth = Math.min(depth, row.depth)
    }
    if (!Number.isFinite(depth)) continue
    const sources = [...new Set([...sourceSamples(entry.component), ...sourceSamples(entry.inject)])].slice(0, 4)
    if (!sources.length) continue
    matches.push({
      slot: slot.slice(0, 160),
      key: optionKey === undefined ? '' : String(optionKey).slice(0, 160),
      depth,
      sources,
    })
  }
  return matches.sort((a, b) => a.depth - b.depth || a.slot.localeCompare(b.slot)).slice(0, 8)
}
