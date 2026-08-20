const GENERIC_MARKERS = new Set([
  'active', 'button', 'container', 'content', 'disabled', 'footer', 'header', 'hidden',
  'icon', 'input', 'item', 'label', 'link', 'loading', 'main', 'menu', 'modal', 'open',
  'panel', 'root', 'row', 'selected', 'sidebar', 'text', 'title', 'wrapper',
])

function clean(value, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function looksGenerated(value) {
  return /^(?:css-|sc-|jsx-|ng-|ant-|el-)/i.test(value)
    || /^[a-f0-9]{8,}$/i.test(value)
    || /(?:^|[-_])[a-f0-9]{7,}(?:$|[-_])/i.test(value)
}

function stableMarker(value, minimum = 4) {
  const marker = clean(value)
  if (marker.length < minimum || marker.length > 160 || looksGenerated(marker)) return ''
  if (GENERIC_MARKERS.has(marker.toLowerCase())) return ''
  return marker
}

function classMarkers(value) {
  return [...new Set(clean(value).split(/\s+/).map(token => stableMarker(token, 5)).filter(Boolean))].slice(0, 12)
}

function addSignal(signals, seen, signal) {
  const key = `${signal.kind}\0${signal.name ?? ''}\0${signal.value}`
  const previous = seen.get(key)
  if (previous !== undefined && previous <= signal.depth) return
  if (previous !== undefined) {
    const index = signals.findIndex(item => `${item.kind}\0${item.name ?? ''}\0${item.value}` === key)
    if (index !== -1) signals.splice(index, 1)
  }
  seen.set(key, signal.depth)
  signals.push(signal)
}

export function extractSignals(query) {
  const signals = []
  const seen = new Map()
  const rows = [query, ...(Array.isArray(query?.ancestors) ? query.ancestors : [])]

  rows.forEach((row, depth) => {
    const id = stableMarker(row?.id, 4)
    if (id) addSignal(signals, seen, { kind: 'id', value: id, depth, strong: true, weight: 120, label: `id="${id}"` })

    for (const value of classMarkers(row?.classes)) {
      addSignal(signals, seen, { kind: 'class', value, depth, strong: true, weight: 90, label: `class="${value}"` })
    }

    for (const [rawName, rawValue] of Object.entries(row?.attrs ?? {})) {
      const name = clean(rawName, 80).toLowerCase()
      const value = stableMarker(rawValue, 3)
      if (!name.startsWith('data-') || !value) continue
      const weight = /^(?:data-plugin|data-testid|data-test-id)$/.test(name) ? 145 : 130
      addSignal(signals, seen, { kind: 'data', name, value, depth, strong: true, weight, label: `${name}="${value}"` })
    }
  })

  const owner = stableMarker(query?.owner, 3)
  if (owner) addSignal(signals, seen, { kind: 'owner', value: owner, depth: 0, strong: false, weight: 28, label: `组件 ${owner}` })
  const aria = stableMarker(query?.aria || query?.attrs?.['aria-label'], 4)
  if (aria) addSignal(signals, seen, { kind: 'aria', value: aria, depth: 0, strong: false, weight: 18, label: `aria-label="${aria}"` })
  const text = clean(query?.text, 120)
  if (text.length >= 4) addSignal(signals, seen, { kind: 'text', value: text, depth: 0, strong: false, weight: 12, label: `文本“${text}”` })
  return signals
}

function sourceMatches(source, signal) {
  const index = source.indexOf(signal.value)
  if (index === -1) return false
  const before = index === 0 ? '' : source[index - 1]
  const after = index + signal.value.length >= source.length ? '' : source[index + signal.value.length]
  const identifier = /[\p{L}\p{N}_-]/u
  if ((before && identifier.test(before)) || (after && identifier.test(after))) return false
  return signal.kind !== 'data' || source.includes(signal.name)
}

function depthWeight(signal) {
  return Math.max(0.38, 1 - signal.depth * 0.16)
}

export function scorePackages(packages, signals) {
  const matches = new Map()
  for (const signal of signals) {
    const packageFiles = new Map()
    for (const candidate of packages) {
      const files = candidate.files.filter(file => sourceMatches(file.source, signal)).map(file => file.file)
      if (files.length) packageFiles.set(candidate.packageName, files)
    }
    matches.set(signal, packageFiles)
  }

  const results = []
  for (const candidate of packages) {
    let score = 0
    let markerScore = 0
    const matchedMarkers = []
    const exclusiveStrong = []
    const fileMap = new Map()

    for (const signal of signals) {
      const packageFiles = matches.get(signal).get(candidate.packageName)
      if (!packageFiles) continue
      const exclusive = matches.get(signal).size === 1
      let contribution = signal.weight * depthWeight(signal)
      if (signal.strong) {
        contribution *= exclusive ? 1.4 : 0.22
        markerScore += contribution
        if (exclusive) exclusiveStrong.push(signal)
      }
      score += contribution
      matchedMarkers.push({ kind: signal.kind, label: signal.label, depth: signal.depth, strong: signal.strong, exclusive })
      for (const file of packageFiles.slice(0, 3)) {
        const current = fileMap.get(file) ?? { file, score: 0, evidence: [] }
        current.score += Math.round(contribution)
        if (!current.evidence.includes(signal.label)) current.evidence.push(signal.label)
        fileMap.set(file, current)
      }
    }

    if (score === 0) continue
    const files = [...fileMap.values()].sort((a, b) => b.score - a.score).slice(0, 5)
    results.push({
      packageName: candidate.packageName,
      version: candidate.version,
      repositoryUrl: candidate.repositoryUrl,
      score: Math.round(score),
      markerScore: Math.round(markerScore),
      nearestExclusiveDepth: exclusiveStrong.length ? Math.min(...exclusiveStrong.map(signal => signal.depth)) : undefined,
      matchedMarkers,
      files,
    })
  }

  results.sort((a, b) => {
    const aDepth = a.nearestExclusiveDepth ?? Number.POSITIVE_INFINITY
    const bDepth = b.nearestExclusiveDepth ?? Number.POSITIVE_INFINITY
    return aDepth - bDepth || b.score - a.score || a.packageName.localeCompare(b.packageName)
  })

  const top = results[0]
  let certainty = 'candidate'
  const reasons = []
  if (!top) {
    reasons.push('没有源码命中当前元素的稳定标记')
  } else if (top.nearestExclusiveDepth === undefined) {
    reasons.push('命中证据均为共享标记或辅助信息')
  } else {
    const sameOrNearerOwners = results.slice(1).filter(result => result.nearestExclusiveDepth !== undefined && result.nearestExclusiveDepth <= top.nearestExclusiveDepth)
    const strongestPeer = sameOrNearerOwners.reduce((best, result) => Math.max(best, result.score), 0)
    const margin = top.score - strongestPeer
    const sameOrNearerOwner = sameOrNearerOwners[0]
    if (sameOrNearerOwner) reasons.push('同一或更近的 DOM 层级存在其他插件的独占强标记')
    if (margin < 30) reasons.push('首选候选与次选候选分差不足')
    if (top.markerScore < 100) reasons.push('独占标记强度不足以确认')
    if (!sameOrNearerOwner && margin >= 30 && top.markerScore >= 100) {
      certainty = 'confirmed'
      reasons.push(`最近的独占强标记位于所选元素向上第 ${top.nearestExclusiveDepth} 层`)
      reasons.push('该标记只在一个已安装插件的源码中出现')
    }
  }

  return { certainty, reasons, results }
}

export function scoreEvidence(packages, query) {
  return scorePackages(packages, extractSignals(query))
}
