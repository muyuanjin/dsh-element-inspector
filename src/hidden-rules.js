const GENERATED_CLASS = /^(?:css-|sc-|jsx-|ng-|ant-|el-)/i
const GENERATED_TOKEN = /(?:^|[-_])[a-f0-9]{7,}(?:$|[-_])/i
const GENERIC_CLASSES = new Set(['active', 'button', 'container', 'content', 'footer', 'header', 'hidden', 'icon', 'item', 'label', 'main', 'panel', 'root', 'row', 'text', 'title', 'wrapper'])

export function normalizeHiddenText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 180)
}

export function stableHiddenClasses(value) {
  const tokens = Array.isArray(value) ? value : String(value || '').split(/\s+/)
  return [...new Set(tokens.filter(item => (
    item.length >= 3
    && item.length <= 120
    && !GENERATED_CLASS.test(item)
    && !GENERATED_TOKEN.test(item)
    && !/^[a-f0-9]{8,}$/i.test(item)
    && !GENERIC_CLASSES.has(item.toLowerCase())
  )))].slice(0, 6)
}

function stableAttributes(attrs) {
  const output = {}
  for (const [name, rawValue] of Object.entries(attrs ?? {})) {
    if (!/^(?:data-|aria-|role$)/i.test(name)) continue
    const value = String(rawValue ?? '').trim()
    if (!value || value.length > 160 || GENERATED_TOKEN.test(value)) continue
    output[name.toLowerCase()] = value
    if (Object.keys(output).length >= 6) break
  }
  return output
}

function nodeRule(info, includeText = false) {
  return {
    id: String(info?.id || '').slice(0, 120),
    classes: stableHiddenClasses(info?.classes),
    attrs: stableAttributes(info?.attrs),
    tag: String(info?.tag || '').toLowerCase(),
    nth: Number.isInteger(info?.nth) && info.nth >= 0 ? info.nth : 0,
    ...(includeText ? { text: normalizeHiddenText(info?.text) } : {}),
  }
}

export function createHiddenRule(info) {
  return {
    ...nodeRule(info, true),
    version: 2,
    ancestors: (Array.isArray(info?.ancestors) ? info.ancestors : []).slice(0, 4).map(item => nodeRule(item)),
  }
}

function identityEvidence(actual, expected) {
  if (!actual || !expected) return { tag: false, id: false, attrs: false, classes: false, partialClass: false, text: false, nth: false }
  const actualTag = String(actual.tag || '').toLowerCase()
  const expectedTag = String(expected.tag || '').toLowerCase()
  const tag = !expectedTag || actualTag === expectedTag
  if (!tag) return { tag, id: false, attrs: false, classes: false, partialClass: false, text: false, nth: false }

  const attrs = stableAttributes(expected.attrs)
  const attrKeys = Object.keys(attrs)
  const classes = stableHiddenClasses(expected.classes)
  const actualClasses = new Set(stableHiddenClasses(actual.classes))
  const classMatches = classes.filter(name => actualClasses.has(name)).length
  const text = normalizeHiddenText(expected.text)
  return {
    tag,
    id: Boolean(expected.id && actual.id === expected.id),
    attrs: Boolean(attrKeys.length && attrKeys.every(key => String(actual.attrs?.[key] ?? '') === attrs[key])),
    classes: Boolean(classes.length && classMatches === classes.length),
    partialClass: Boolean(classMatches > 0),
    text: Boolean(text && normalizeHiddenText(actual.text) === text),
    nth: Boolean(Number.isInteger(expected.nth) && expected.nth > 0 && actual.nth === expected.nth),
  }
}

function ancestorMatches(actual, expected) {
  if (!actual || !expected) return false
  const expectedTag = String(expected.tag || '').toLowerCase()
  if (expectedTag && String(actual.tag || '').toLowerCase() !== expectedTag) return false
  if (expected.id && actual.id === expected.id) return true
  const attrs = stableAttributes(expected.attrs)
  const attrKeys = Object.keys(attrs)
  if (attrKeys.length && attrKeys.every(key => String(actual.attrs?.[key] ?? '') === attrs[key])) return true
  const classes = stableHiddenClasses(expected.classes)
  const actualClasses = new Set(stableHiddenClasses(actual.classes))
  return Boolean(classes.length && classes.every(name => actualClasses.has(name)))
}

export function matchesHiddenInfo(info, rule) {
  const evidence = identityEvidence(info, rule)
  if (!evidence.tag) return false
  if (evidence.id || evidence.attrs) return true
  if (evidence.classes && evidence.text) return true

  const expectedAncestors = Array.isArray(rule?.ancestors) ? rule.ancestors : []
  const actualAncestors = Array.isArray(info?.ancestors) ? info.ancestors : []
  let anchoredAncestor = false
  let structuralDepth = 0
  for (let index = 0; index < Math.min(expectedAncestors.length, actualAncestors.length, 4); index += 1) {
    if (ancestorMatches(actualAncestors[index], expectedAncestors[index])) anchoredAncestor = true
    if (String(actualAncestors[index]?.tag || '').toLowerCase() === String(expectedAncestors[index]?.tag || '').toLowerCase()
      && actualAncestors[index]?.nth === expectedAncestors[index]?.nth) structuralDepth += 1
  }
  if (evidence.partialClass && evidence.nth && anchoredAncestor) return true
  return evidence.text && evidence.nth && (anchoredAncestor || structuralDepth >= 2)
}

export function resolveUniqueHiddenMatches(candidates, rules, matcher = matchesHiddenInfo) {
  const resolved = new Set()
  for (const rule of rules ?? []) {
    let match
    let ambiguous = false
    for (const candidate of candidates ?? []) {
      if (!matcher(candidate, rule)) continue
      if (match) {
        ambiguous = true
        break
      }
      match = candidate
    }
    if (match && !ambiguous) resolved.add(match)
  }
  return resolved
}

function nthOfType(element) {
  let index = 1
  for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
    if (sibling.tagName === element.tagName) index += 1
  }
  return index
}

function elementNodeInfo(element, includeText = false) {
  const attrs = {}
  for (const attr of element.attributes ?? []) if (/^(?:data-|aria-|role$)/i.test(attr.name)) attrs[attr.name.toLowerCase()] = attr.value
  return {
    id: element.id || '',
    classes: typeof element.className === 'string' ? element.className.slice(0, 320) : '',
    attrs,
    tag: element.tagName || '',
    nth: nthOfType(element),
    ...(includeText ? { text: normalizeHiddenText(element.innerText || element.textContent) } : {}),
  }
}

export function matchesHiddenElement(element, rule) {
  if (!(element instanceof Element)) return false
  if (rule?.tag && element.tagName.toLowerCase() !== String(rule.tag).toLowerCase()) return false
  const info = elementNodeInfo(element, true)
  let node = element.parentElement
  info.ancestors = []
  for (let depth = 0; node && depth < 4; depth += 1, node = node.parentElement) {
    info.ancestors.push(elementNodeInfo(node))
  }
  return matchesHiddenInfo(info, rule)
}
