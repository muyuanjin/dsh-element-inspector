import { DSH_OWNER } from './dsh-metadata.js'

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
    || /^:r[\w-]*:$/i.test(value)
    || /^[a-f0-9]{8,}$/i.test(value)
    || /(?:^|[-_])[a-f0-9]{7,}(?:$|[-_])/i.test(value)
    || /^(?=[A-Za-z0-9]{6}[-_])(?=[A-Za-z0-9]*[a-z])(?=(?:[A-Za-z0-9]*[A-Z]){2})[A-Za-z0-9]+[-_]/.test(value)
    || /^(?=[A-Za-z0-9-]{6,12}_)(?=[A-Za-z0-9-]*[a-z])(?=(?:[A-Za-z0-9-]*[A-Z]){2})[A-Za-z0-9-]+_/.test(value)
    || /^(?=[A-Za-z0-9]{6,12}[-_])(?=[A-Za-z0-9]*[a-z])(?=[A-Za-z0-9]*[A-Z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]+[-_]/.test(value)
    || /(?:^|[_-])(?=[A-Za-z0-9]{7,12}$)(?=[A-Za-z0-9]*[A-Z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]+$/.test(value)
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

function descriptiveDataAttributeName(value) {
  const name = clean(value, 80).toLowerCase()
  if (!/^data-[a-z0-9][a-z0-9_.:-]*(?:-[a-z0-9][a-z0-9_.:-]*)+$/.test(name)) return ''
  const semanticParts = name.slice(5).split(/[-_.:]+/).filter(Boolean)
  if (semanticParts.length < 2 || semanticParts.join('').length < 10) return ''
  return name
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
      if (!name.startsWith('data-')) continue
      const value = stableMarker(rawValue, 3)
      if (!value) {
        const attributeName = descriptiveDataAttributeName(name)
        if (rawValue === '' && attributeName) {
          addSignal(signals, seen, { kind: 'data-name', name: attributeName, value: attributeName, depth, strong: true, weight: 155, label: attributeName })
        }
        continue
      }
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

  const registrations = Array.isArray(query?.runtimeRegistrations) ? query.runtimeRegistrations.slice(0, 8) : []
  for (const registration of registrations) {
    const slot = clean(registration?.slot, 160)
    const key = clean(registration?.key, 160)
    const depth = Number.isInteger(registration?.depth) ? Math.max(0, Math.min(registration.depth, 32)) : 0
    const sources = Array.isArray(registration?.sources) ? registration.sources.slice(0, 4) : []
    for (const rawSource of sources) {
      const source = typeof rawSource === 'string' ? rawSource.trim().slice(0, 1_200) : ''
      if (source.length < 80 || source.includes('[native code]')) continue
      addSignal(signals, seen, {
        kind: 'runtime-source',
        name: slot,
        value: source,
        depth,
        strong: true,
        weight: 260,
        label: `运行时插槽 ${slot || 'registration'}${key ? ` (${key})` : ''}`,
      })
    }
  }
  return signals
}

function sourceMatches(source, signal) {
  if (signal.kind === 'runtime-source') return source.includes(signal.value)
  const identifier = /[\p{L}\p{N}_-]/u
  let from = 0
  while (from <= source.length - signal.value.length) {
    const index = source.indexOf(signal.value, from)
    if (index === -1) return false
    const before = index === 0 ? '' : source[index - 1]
    const after = index + signal.value.length >= source.length ? '' : source[index + signal.value.length]
    if ((!before || !identifier.test(before)) && (!after || !identifier.test(after))) {
      return signal.kind !== 'data' || source.includes(signal.name)
    }
    from = index + signal.value.length
  }
  return false
}

function depthWeight(signal) {
  return Math.max(0.38, 1 - signal.depth * 0.16)
}

function ownershipCandidates(packages) {
  const owners = new Map()
  for (const candidate of packages) {
    const ownerType = candidate.ownerType === 'dsh' ? 'dsh' : 'plugin'
    const key = ownerType === 'dsh' ? 'dsh' : `plugin:${candidate.packageName}`
    const current = owners.get(key) ?? {
      key,
      ownerType,
      ownerName: ownerType === DSH_OWNER.type ? DSH_OWNER.name : candidate.packageName,
      packageName: ownerType === 'plugin' ? candidate.packageName : undefined,
      versions: new Set(),
      repositoryUrl: candidate.repositoryUrl,
      sourcePackages: [],
      files: [],
    }
    current.versions.add(candidate.version)
    if (!current.repositoryUrl && candidate.repositoryUrl) current.repositoryUrl = candidate.repositoryUrl
    if (!current.sourcePackages.includes(candidate.packageName)) current.sourcePackages.push(candidate.packageName)
    current.files.push(...candidate.files.map(file => ({
      ...file,
      file: ownerType === 'dsh' ? `${candidate.packageName}/${file.file}` : file.file,
    })))
    owners.set(key, current)
  }
  return [...owners.values()].map(candidate => ({
    ...candidate,
    version: candidate.versions.size === 1 ? [...candidate.versions][0] : 'mixed',
  }))
}

export function scorePackages(packages, signals) {
  const candidates = ownershipCandidates(packages)
  const matches = new Map()
  for (const signal of signals) {
    const packageFiles = new Map()
    for (const candidate of candidates) {
      const files = candidate.files.filter(file => sourceMatches(file.source, signal)).map(file => file.file)
      if (files.length) packageFiles.set(candidate.key, files)
    }
    matches.set(signal, packageFiles)
  }

  const results = []
  for (const candidate of candidates) {
    let score = 0
    let markerScore = 0
    const matchedMarkers = []
    const exclusiveStrong = []
    const fileMap = new Map()

    for (const signal of signals) {
      const packageFiles = matches.get(signal).get(candidate.key)
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
      ownerType: candidate.ownerType,
      ownerName: candidate.ownerName,
      packageName: candidate.packageName,
      version: candidate.version,
      repositoryUrl: candidate.repositoryUrl,
      sourcePackages: candidate.sourcePackages,
      score: Math.round(score),
      markerScore: Math.round(markerScore),
      nearestExclusiveDepth: exclusiveStrong.length ? Math.min(...exclusiveStrong.map(signal => signal.depth)) : undefined,
      confirmationMarkers: exclusiveStrong.filter(signal => signal.kind === 'id'
        || signal.kind === 'runtime-source'
        || signal.kind === 'data-name'
        || (signal.kind === 'data' && /^(?:data-plugin|data-testid|data-test-id)$/.test(signal.name))
        || signal.kind === 'class'
        || signal.kind === 'data').map(signal => ({ kind: signal.kind, name: signal.name, value: signal.kind === 'runtime-source' ? '' : signal.value, depth: signal.depth })),
      matchedMarkers,
      files,
    })
  }

  results.sort((a, b) => {
    const aDepth = a.nearestExclusiveDepth ?? Number.POSITIVE_INFINITY
    const bDepth = b.nearestExclusiveDepth ?? Number.POSITIVE_INFINITY
    return aDepth - bDepth || b.score - a.score || a.ownerName.localeCompare(b.ownerName)
  })

  let suppressedHostContainer = false
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const result = results[index]
    const nearestStrongDepth = result.matchedMarkers.reduce((nearest, signal) => signal.strong ? Math.min(nearest, signal.depth) : nearest, Number.POSITIVE_INFINITY)
    if (result.ownerType === 'dsh' && nearestStrongDepth >= 4) {
      results.splice(index, 1)
      suppressedHostContainer = true
    }
  }

  const top = results[0]
  let certainty = 'candidate'
  const reasons = []
  if (!top) {
    reasons.push(suppressedHostContainer ? '仅命中距离较远的 DSH 容器，不能据此判定所选元素来自官方界面' : '没有源码命中当前元素的稳定标记')
  } else if (top.nearestExclusiveDepth === undefined) {
    reasons.push('命中证据均为共享标记或辅助信息')
  } else {
    const sameOrNearerOwners = results.slice(1).filter(result => result.nearestExclusiveDepth !== undefined && result.nearestExclusiveDepth <= top.nearestExclusiveDepth)
    const strongestPeer = sameOrNearerOwners.reduce((best, result) => Math.max(best, result.score), 0)
    const margin = top.score - strongestPeer
    const sameOrNearerOwner = sameOrNearerOwners[0]
    const trustedMarker = top.confirmationMarkers.some(signal => signal.kind === 'id'
      || signal.kind === 'runtime-source'
      || signal.kind === 'data-name'
      || (signal.kind === 'data' && /^(?:data-plugin|data-testid|data-test-id)$/.test(signal.name)))
    const independentMarkers = new Set(top.confirmationMarkers.map(signal => `${signal.kind}\0${signal.name ?? ''}\0${signal.value}`)).size
    const sufficientMarkers = trustedMarker || independentMarkers >= 2
    if (sameOrNearerOwner) reasons.push('同一或更近的 DOM 层级存在其他归属来源的独占强标记')
    if (margin < 30) reasons.push('首选候选与次选候选分差不足')
    if (!sufficientMarkers) reasons.push('单个 class 或普通 data 标记不足以确认归属')
    if (!sameOrNearerOwner && margin >= 30 && sufficientMarkers) {
      certainty = 'confirmed'
      reasons.push(`最近的独占强标记位于所选元素向上第 ${top.nearestExclusiveDepth} 层`)
      reasons.push(trustedMarker ? '运行时注册源码、稳定 ID、测试标记或自定义 data 属性名只在一个归属来源的源码中出现' : '至少两个稳定标记共同指向同一个归属来源')
    }
  }

  return { certainty, reasons, results }
}

export function scoreEvidence(packages, query) {
  return scorePackages(packages, extractSignals(query))
}
