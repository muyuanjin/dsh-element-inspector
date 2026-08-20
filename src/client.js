import { captureElementPng, elementToMarkdown, serializeElement } from './selection-actions.js'
import { createHiddenRule, matchesHiddenElement, resolveUniqueHiddenMatches } from './hidden-rules.js'

window.__ModuleLoader__.load({
  id: 'dsh-element-inspector',
  factory: (require) => {
    const module = { exports: {} }
    const STYLE_ID = 'dsh-element-inspector-style'
    const ROOT_ID = 'dsh-element-inspector-root'
    const LEGACY_STORAGE_KEY = 'dsh-element-inspector:v2'
    const STARTUP_CACHE_KEY = 'dsh-element-inspector:settings-cache:v1'
    const SETTINGS_NAMESPACE = 'dsh-element-inspector'
    const DEFAULT_HOTKEY = 'F1'
    const BRAND = 'dsh-element-inspector'

    function style() {
      if (document.getElementById(STYLE_ID)) return
      const node = document.createElement('style')
      node.id = STYLE_ID
      node.textContent = `
        #${ROOT_ID} { position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; color: var(--dsw-alias-label-primary,#17181c); font-family: var(--dsw-font-family,-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif); font-size: 14px; line-height: 22px; letter-spacing: 0; }
        #${ROOT_ID} * { box-sizing: border-box; letter-spacing: 0; }
        #${ROOT_ID} .dei-mask { position: fixed; pointer-events: none; border: 2px solid var(--dsw-alias-state-business-primary,#4d6bfe); border-radius: 6px; background: color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 12%,transparent); box-shadow: 0 0 0 1px var(--dsw-alias-bg-layer-1,#fff) inset,0 0 0 1px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 20%,transparent); transition: left .05s ease,top .05s ease,width .05s ease,height .05s ease; }
        #${ROOT_ID} .dei-badge { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; max-width: calc(100vw - 32px); height: 36px; padding: 0 14px; overflow: hidden; color: var(--dsw-alias-label-primary-foreground,#fff); background: var(--dsw-alias-button-primary-fill,#17181c); border-radius: 18px; box-shadow: var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.18)); font-size: 13px; line-height: 20px; white-space: nowrap; text-overflow: ellipsis; }
        #${ROOT_ID} .dei-radar-dot { width: 8px; height: 8px; flex: none; border: 2px solid currentColor; border-radius: 50%; box-shadow: 0 0 0 3px color-mix(in srgb,currentColor 22%,transparent); }
        #${ROOT_ID} .dei-scrim { position: fixed; inset: 0; pointer-events: auto; background: var(--dsw-alias-bg-mask-1,rgba(0,0,0,.24)); backdrop-filter: var(--dsw-mask-blur,blur(2px)); }
        #${ROOT_ID} .dei-panel { position: fixed; z-index: 1; left: 50%; top: 50%; transform: translate(-50%,-50%); display: flex; flex-direction: column; width: min(480px,calc(100vw - 32px)); max-height: min(680px,calc(100vh - 48px)); overflow: hidden; pointer-events: auto; border: 1px solid var(--dsw-alias-border-inverted,transparent); border-radius: 24px; background: var(--dsw-alias-bg-layer-2,#fff); box-shadow: var(--dsw-shadow-lv3,0 18px 48px rgba(0,0,0,.24)); }
        #${ROOT_ID} .dei-header { display: flex; align-items: center; gap: 8px; min-height: 58px; padding: 22px 14px 12px 24px; }
        #${ROOT_ID} .dei-heading { flex: 1; min-width: 0; } #${ROOT_ID} .dei-eyebrow { margin: 0; color: var(--dsw-alias-label-tertiary,#74777d); font-size: 11px; line-height: 16px; } #${ROOT_ID} .dei-title { margin: 0; overflow: hidden; color: var(--dsw-alias-label-primary,#17181c); font-size: 16px; font-weight: 500; line-height: 24px; text-overflow: ellipsis; white-space: nowrap; }
        #${ROOT_ID} .dei-body { min-width: 0; padding: 0 24px 20px; overflow: auto; scrollbar-width: thin; } #${ROOT_ID} .dei-body p { margin: 0; color: var(--dsw-alias-label-secondary,#545860); word-break: break-word; }
        #${ROOT_ID} code { padding: 2px 6px; border-radius: 6px; background: var(--dsw-alias-bg-module-platform,#f4f5f7); color: var(--dsw-alias-label-primary,#17181c); font-family: var(--ds-font-family-code,Consolas,monospace); font-size: 12px; overflow-wrap: anywhere; }
        #${ROOT_ID} .dei-close,#${ROOT_ID} .dei-back { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary,#545860); cursor: pointer; font: inherit; font-size: 20px; line-height: 1; }
        #${ROOT_ID} .dei-back { margin-left: -10px; font-size: 22px; } #${ROOT_ID} .dei-close:hover,#${ROOT_ID} .dei-back:hover { background: var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06)); }
        #${ROOT_ID} .dei-conclusion { padding: 16px; border: 1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 16%,transparent); border-radius: 12px; background: var(--dsw-alias-state-business-tertiary,#edf2ff); }
        #${ROOT_ID} .dei-conclusion-head { display: flex; align-items: center; gap: 10px; min-width: 0; } #${ROOT_ID} .dei-conclusion-mark { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: none; border-radius: 50%; color: var(--dsw-alias-label-primary-foreground,#fff); background: var(--dsw-alias-state-business-primary,#4d6bfe); font-size: 14px; font-weight: 600; } #${ROOT_ID} .dei-plugin-name { flex: 1; min-width: 0; overflow: hidden; font-size: 15px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
        #${ROOT_ID} .dei-pill { flex: none; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; line-height: 16px; } #${ROOT_ID} .dei-pill-confirmed { color: var(--dsw-alias-state-success-primary,#26a269); background: var(--dsw-alias-state-success-tertiary,#e7f7ef); } #${ROOT_ID} .dei-pill-candidate { color: var(--dsw-alias-state-warn-label,#b66616); background: var(--dsw-alias-state-warn-tertiary,#fff4df); }
        #${ROOT_ID} .dei-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 8px; color: var(--dsw-alias-label-tertiary,#74777d); font-size: 12px; line-height: 18px; }
        #${ROOT_ID} .dei-element { margin-top: 12px; padding: 10px 12px; border-radius: 8px; background: var(--dsw-alias-bg-module-platform,#f4f5f7); } #${ROOT_ID} .dei-element-label { color: var(--dsw-alias-label-tertiary,#74777d); font-size: 11px; line-height: 16px; } #${ROOT_ID} .dei-element-value { margin-top: 2px; overflow: hidden; color: var(--dsw-alias-label-primary,#17181c); text-overflow: ellipsis; white-space: nowrap; }
        #${ROOT_ID} .dei-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }
        #${ROOT_ID} button.dei-button { display: inline-flex; align-items: center; justify-content: center; height: 36px; padding: 0 14px; border: 0; border-radius: 18px; color: var(--dsw-alias-label-primary,#17181c); background: transparent; font: inherit; font-size: 14px; line-height: 22px; cursor: pointer; transition: background var(--ds-transition-duration-fast,.1s) ease; }
        #${ROOT_ID} button.dei-small { height: 28px; padding: 0 10px; border-radius: 14px; font-size: 12px; line-height: 18px; } #${ROOT_ID} button.dei-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06)); } #${ROOT_ID} button.dei-primary { color: var(--dsw-alias-label-primary-foreground,#fff); background: var(--dsw-alias-button-primary-fill,#17181c); } #${ROOT_ID} button.dei-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover,#36383e); } #${ROOT_ID} button.dei-outline { border: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); } #${ROOT_ID} button.dei-danger:hover:not(:disabled) { color: var(--dsw-alias-state-error-primary,#ec1313); background: var(--dsw-alias-interactive-bg-hover-danger,rgba(236,19,19,.05)); } #${ROOT_ID} button:disabled { cursor: not-allowed; opacity: .4; }
        #${ROOT_ID} .dei-section-title { margin: 20px 0 6px; color: var(--dsw-alias-label-tertiary,#74777d); font-size: 12px; font-weight: 500; line-height: 18px; }
        #${ROOT_ID} .dei-hit { border-top: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); } #${ROOT_ID} .dei-hit:last-child { border-bottom: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); } #${ROOT_ID} .dei-hit summary { display: flex; align-items: center; gap: 8px; min-height: 48px; cursor: pointer; list-style: none; } #${ROOT_ID} .dei-hit summary::-webkit-details-marker { display: none; } #${ROOT_ID} .dei-hit summary::after { content: '›'; flex: none; color: var(--dsw-alias-label-tertiary,#74777d); font-size: 19px; transform: rotate(90deg); transition: transform .12s ease; } #${ROOT_ID} .dei-hit[open] summary::after { transform: rotate(-90deg); } #${ROOT_ID} .dei-hit-name { flex: 1; min-width: 0; overflow: hidden; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; } #${ROOT_ID} .dei-hit-score { color: var(--dsw-alias-label-tertiary,#74777d); font-size: 11px; }
        #${ROOT_ID} .dei-hit-body { padding: 0 0 14px; } #${ROOT_ID} .dei-file { margin-top: 7px; color: var(--dsw-alias-label-tertiary,#74777d); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
        #${ROOT_ID} .dei-settings-group { border-top: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); } #${ROOT_ID} .dei-settings-row,#${ROOT_ID} .dei-rule-row { display: flex; align-items: center; gap: 12px; min-height: 64px; border-bottom: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); } #${ROOT_ID} .dei-row-main { flex: 1; min-width: 0; } #${ROOT_ID} .dei-row-title { overflow: hidden; color: var(--dsw-alias-label-primary,#17181c); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; } #${ROOT_ID} .dei-row-description { margin-top: 2px!important; overflow: hidden; color: var(--dsw-alias-label-tertiary,#74777d)!important; font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
        #${ROOT_ID} .dei-hotkey { min-width: 44px; padding: 3px 8px; border: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); border-bottom-width: 2px; border-radius: 7px; background: var(--dsw-alias-bg-layer-1,#fff); color: var(--dsw-alias-label-primary,#17181c); text-align: center; font-family: var(--ds-font-family-code,Consolas,monospace); font-size: 12px; }
        #${ROOT_ID} .dei-empty { padding: 24px 0; color: var(--dsw-alias-label-tertiary,#74777d); text-align: center; font-size: 12px; }
        #${ROOT_ID} .dei-notice { position: sticky; bottom: 0; z-index: 2; margin: 12px 0 0; padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1)); border-radius: 8px; color: var(--dsw-alias-label-primary,#17181c); background: var(--dsw-alias-bg-layer-3,#fff); box-shadow: var(--dsw-shadow-lv1,0 3px 12px rgba(0,0,0,.12)); font-size: 12px; } #${ROOT_ID} .dei-notice-error { color: var(--dsw-alias-state-error-primary,#ec1313); }
        #${ROOT_ID} .dei-error { color: var(--dsw-alias-state-error-primary,#ec1313)!important; }
        @media (max-width: 520px) { #${ROOT_ID} .dei-panel { width: calc(100vw - 20px); max-height: calc(100vh - 20px); } #${ROOT_ID} .dei-header { padding-left: 20px; } #${ROOT_ID} .dei-body { padding-right: 20px; padding-left: 20px; } #${ROOT_ID} .dei-actions button.dei-button { flex: 1 1 auto; } }
      `
      document.head.append(node)
    }

    function esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])) }
    function normalizeText(value) { return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 180) }
    function normalizePrefs(value) {
      return {
        hotkey: typeof value?.hotkey === 'string' && value.hotkey ? value.hotkey : DEFAULT_HOTKEY,
        hidden: Array.isArray(value?.hidden) ? value.hidden : [],
      }
    }
    function readLegacyPrefs() {
      try {
        const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
        return raw ? normalizePrefs(JSON.parse(raw)) : undefined
      } catch { return undefined }
    }
    function readStartupCache() {
      try {
        const raw = localStorage.getItem(STARTUP_CACHE_KEY)
        return raw ? normalizePrefs(JSON.parse(raw)) : normalizePrefs()
      } catch { return normalizePrefs() }
    }
    function writeStartupCache(value) {
      try { localStorage.setItem(STARTUP_CACHE_KEY, JSON.stringify(normalizePrefs(value))) } catch {}
    }
    function eventHotkey(event) {
      const modifiers = []
      if (event.ctrlKey) modifiers.push('Ctrl')
      if (event.altKey) modifiers.push('Alt')
      if (event.shiftKey) modifiers.push('Shift')
      if (event.metaKey) modifiers.push('Meta')
      const key = event.code?.startsWith('Key') ? event.code.slice(3).toUpperCase() : event.code?.startsWith('Digit') ? event.code.slice(5) : event.key
      return [...modifiers, key].join('+')
    }
    function nthOfType(element) {
      let index = 1
      for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) if (sibling.tagName === element.tagName) index += 1
      return index
    }
    function targetInfo(target) {
      const attrs = {}
      for (const attr of target.attributes ?? []) if (/^(data-|aria-|role$)/.test(attr.name)) attrs[attr.name] = attr.value
      const fiberKey = Object.keys(target).find(key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$'))
      const fiber = fiberKey ? target[fiberKey] : undefined
      const owner = fiber?._debugOwner?.elementType?.displayName || fiber?._debugOwner?.elementType?.name || ''
      const ancestors = []
      let node = target.parentElement
      for (let i = 0; node && i < 7; i++, node = node.parentElement) {
        const ancestorAttrs = {}
        for (const attr of node.attributes ?? []) if (/^(data-|aria-|role$)/.test(attr.name)) ancestorAttrs[attr.name] = attr.value
        ancestors.push({ id: node.id || '', classes: typeof node.className === 'string' ? node.className.slice(0, 240) : '', attrs: ancestorAttrs, tag: node.tagName || '', nth: nthOfType(node) })
      }
      return { text: normalizeText(target.innerText || target.textContent), aria: target.getAttribute('aria-label') || '', id: target.id || '', classes: typeof target.className === 'string' ? target.className.slice(0, 240) : '', role: target.getAttribute('role') || '', tag: target.tagName || '', nth: nthOfType(target), attrs, ancestors, owner }
    }

    async function writeText(text) {
      try {
        await navigator.clipboard.writeText(text)
        return
      } catch {}
      const input = document.createElement('textarea')
      input.value = text
      input.setAttribute('readonly', '')
      Object.assign(input.style, { position: 'fixed', left: '-9999px', top: '0', opacity: '0' })
      document.body.append(input)
      input.select()
      const copied = document.execCommand('copy')
      input.remove()
      if (!copied) throw new Error('浏览器拒绝写入剪贴板')
    }

    async function deliverScreenshot(blob) {
      if (typeof ClipboardItem === 'function' && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          return 'clipboard'
        } catch {}
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `dsh-element-inspector-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
      link.hidden = true
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      return 'download'
    }

    function apply(ctx) {
      style()
      const preferenceScope = ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE })
      let active = false
      let current
      let root
      let mask
      let prefs = readStartupCache()
      let settingsSnapshot = preferenceScope.getSnapshot()
      let migrationStarted = false
      let selectedInfo
      let selectedElement
      let previousView = ''
      let captureHotkey = false
      let hideScheduled = false
      let noticeTimer
      const hiddenOriginalDisplay = new WeakMap()
      const close = () => { active = false; current = undefined; selectedInfo = undefined; selectedElement = undefined; previousView = ''; clearTimeout(noticeTimer); root?.remove(); root = undefined; mask = undefined }
      const render = (html) => { if (root) root.innerHTML = html }
      const panel = (title, body, options = {}) => `<div class="dei-scrim"></div><section class="dei-panel" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="dei-header">${options.back ? '<button type="button" class="dei-back" aria-label="返回" title="返回">‹</button>' : ''}<div class="dei-heading"><p class="dei-eyebrow">${BRAND}</p><h3 class="dei-title">${esc(title)}</h3></div><button type="button" class="dei-close" aria-label="关闭" title="关闭">×</button></header><div class="dei-body">${body}</div></section>`
      const notify = (message, error = false) => {
        if (!root) return
        clearTimeout(noticeTimer)
        root.querySelector('.dei-notice')?.remove()
        const notice = document.createElement('div')
        notice.className = `dei-notice${error ? ' dei-notice-error' : ''}`
        notice.setAttribute('role', 'status')
        notice.textContent = message
        root.querySelector('.dei-body')?.append(notice)
        noticeTimer = setTimeout(() => notice.remove(), 3200)
      }
      const savePreference = async (field, value) => {
        const snapshot = preferenceScope.getSnapshot()
        if (snapshot.status !== 'ready' || !snapshot.writable) {
          notify(snapshot.status === 'loading' ? '设置仍在同步，请稍后重试' : '当前 DSH 设置不可写', true)
          return false
        }
        const previous = prefs
        prefs = normalizePrefs({ ...prefs, [field]: value })
        await preferenceScope.set(field, value)
        const accepted = preferenceScope.getSnapshot()
        const persisted = accepted.status === 'ready'
          && accepted.writable
          && accepted.revision !== snapshot.revision
          && JSON.stringify(accepted.value?.[field]) === JSON.stringify(value)
        if (!persisted) {
          prefs = accepted.status === 'ready' ? normalizePrefs(accepted.value) : previous
          notify('设置保存失败，已恢复 DSH 中的值', true)
          return false
        }
        writeStartupCache(prefs)
        return true
      }
      const applyHidden = () => {
        if (!document.body) return
        const elements = [...document.body.querySelectorAll('*')].filter(element => !element.closest(`#${ROOT_ID}`))
        const hiddenElements = resolveUniqueHiddenMatches(elements, prefs.hidden, matchesHiddenElement)
        for (const element of elements) {
          const hidden = hiddenElements.has(element)
          if (hidden) {
            if (element.getAttribute('data-dei-hidden') !== '1') hiddenOriginalDisplay.set(element, { value: element.style.getPropertyValue('display'), priority: element.style.getPropertyPriority('display') })
            element.setAttribute('data-dei-hidden', '1'); element.style.setProperty('display', 'none', 'important')
          } else if (element.getAttribute('data-dei-hidden') === '1') {
            element.removeAttribute('data-dei-hidden')
            const original = hiddenOriginalDisplay.get(element)
            if (original?.value) element.style.setProperty('display', original.value, original.priority)
            else element.style.removeProperty('display')
            hiddenOriginalDisplay.delete(element)
          }
        }
      }
      const scheduleHidden = () => {
        if (hideScheduled) return
        hideScheduled = true
        queueMicrotask(() => {
          hideScheduled = false
          applyHidden()
        })
      }
      const exportActions = () => '<div class="dei-section-title">导出元素</div><div class="dei-actions"><button type="button" class="dei-button dei-small dei-outline dei-screenshot">截图</button><button type="button" class="dei-button dei-small dei-outline dei-copy-html">复制 HTML</button><button type="button" class="dei-button dei-small dei-outline dei-copy-markdown">复制 Markdown</button></div>'
      const settings = () => {
        active = false
        if (!root) { root = document.createElement('div'); root.id = ROOT_ID; document.body.append(root) }
        if (root.querySelector('.dei-panel') && !root.querySelector('.dei-capture-hotkey')) previousView = root.innerHTML
        const rows = prefs.hidden.length ? prefs.hidden.map((rule, index) => `<div class="dei-rule-row"><div class="dei-row-main"><div class="dei-row-title">${esc(rule.text || rule.id || rule.classes?.join(' ') || '无文本元素')}</div><p class="dei-row-description">${esc(rule.tag || '*')}${rule.id ? ` #${esc(rule.id)}` : ''}${rule.classes?.length ? ` · .${esc(rule.classes.join('.'))}` : ''}</p></div><button type="button" class="dei-button dei-small dei-danger dei-remove-hidden" data-index="${index}">取消隐藏</button></div>`).join('') : '<div class="dei-empty">没有隐藏的元素</div>'
        const syncLabel = settingsSnapshot.status === 'ready' ? (settingsSnapshot.writable ? '已同步到 DSH' : 'DSH 设置只读') : (settingsSnapshot.status === 'loading' ? '正在同步 DSH 设置' : 'DSH 设置不可用')
        const body = `<div class="dei-settings-group"><div class="dei-settings-row"><div class="dei-row-main"><div class="dei-row-title">唤起快捷键</div><p class="dei-row-description">按一次拾取元素，快速按两次打开设置 · ${syncLabel}</p></div><span class="dei-hotkey">${esc(prefs.hotkey)}</span><button type="button" class="dei-button dei-small dei-outline dei-capture-hotkey"${settingsSnapshot.status === 'ready' && settingsSnapshot.writable ? '' : ' disabled'}>更改</button></div></div><div class="dei-section-title">已隐藏 (${prefs.hidden.length})</div><div class="dei-settings-group">${rows}</div>${prefs.hidden.length ? '<div class="dei-actions"><button type="button" class="dei-button dei-small dei-danger dei-clear-hidden">全部取消隐藏</button></div>' : ''}`
        render(panel('设置', body, { back: Boolean(previousView) }))
      }
      const start = () => {
        if (active) return close()
        active = true
        previousView = ''
        root?.remove()
        root = document.createElement('div'); root.id = ROOT_ID; document.body.append(root)
        render(`<div class="dei-badge"><span class="dei-radar-dot"></span><span>${BRAND}已开启 · 单击选择 · Esc 退出</span></div><div class="dei-mask"></div>`)
        mask = root.querySelector('.dei-mask')
      }
      const move = event => {
        if (!active || !root || root.contains(event.target)) return
        current = event.target instanceof Element ? event.target : undefined
        if (!current || !mask) return
        const rect = current.getBoundingClientRect(); Object.assign(mask.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` })
      }
      const pick = async event => {
        if (!active || !current || root?.contains(event.target)) return
        event.preventDefault(); event.stopPropagation(); active = false
        selectedElement = current
        const info = targetInfo(selectedElement)
        selectedInfo = info
        render(panel('正在分析', '<div class="dei-summary"><p>正在检查元素标记与当前 profile 的插件源码…</p></div>'))
        try {
          const response = await fetch('/__dsh-element-inspector/resolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(info) })
          const data = await response.json()
          const results = data.results || []
          const hits = results.map((hit, index) => `<details class="dei-hit"${index === 0 ? ' open' : ''}><summary><span class="dei-hit-name">${esc(hit.packageName)} · v${esc(hit.version)}</span><span class="dei-hit-score">${esc(hit.score)} 分</span></summary><div class="dei-hit-body">${hit.files.map(file => `<div class="dei-file"><code>${esc(file.file)}</code>${file.evidence?.length ? `<br>${esc(file.evidence.join(' · '))}` : ''}</div>`).join('')}<div class="dei-actions"><button type="button" class="dei-button dei-small dei-outline dei-open-folder" data-package="${esc(hit.packageName)}">打开插件文件夹</button><button type="button" class="dei-button dei-small dei-open-repo" data-package="${esc(hit.packageName)}"${hit.repositoryUrl ? '' : ' disabled'}>打开源仓库</button></div></div></details>`).join('')
          const top = results[0]
          const heading = top ? (data.certainty === 'confirmed' ? '已确认元素归属' : '可能的元素归属') : '没有找到插件归属'
          const owner = info.owner ? `<span>组件 ${esc(info.owner)}</span>` : ''
          const proposedRule = createHiddenRule(info)
          const canHide = Boolean(proposedRule.id || proposedRule.classes.length || Object.keys(proposedRule.attrs).length || proposedRule.text)
          const reason = data.reasons?.[0] ? `<span>${esc(data.reasons[0])}</span>` : ''
          const summary = top ? `<div class="dei-conclusion"><div class="dei-conclusion-head"><span class="dei-conclusion-mark">${data.certainty === 'confirmed' ? '✓' : '?'}</span><div class="dei-plugin-name">${esc(top.packageName)}</div><span class="dei-pill ${data.certainty === 'confirmed' ? 'dei-pill-confirmed' : 'dei-pill-candidate'}">${data.certainty === 'confirmed' ? '已确认' : '待确认'}</span></div><div class="dei-meta"><span>v${esc(top.version)}</span><span>证据分 ${esc(top.score)}</span>${owner}${reason}</div></div>` : '<div class="dei-conclusion"><p>这个元素可能来自 DSH 官方界面、动态内容或纯样式，当前 profile 中没有足够的插件证据。</p></div>'
          const elementLabel = info.text || info.aria || `${String(info.tag || 'element').toLowerCase()} 元素`
          const text = `<div class="dei-element"><div class="dei-element-label">所选元素</div><div class="dei-element-value" title="${esc(elementLabel)}">${esc(elementLabel)}</div></div>`
          const actions = `<div class="dei-actions">${canHide ? '<button type="button" class="dei-button dei-primary dei-hide-current">隐藏此元素</button>' : ''}<button type="button" class="dei-button dei-outline dei-settings">插件设置</button></div>`
          render(panel(heading, `${summary}${text}${actions}${exportActions()}${hits ? `<div class="dei-section-title">${data.certainty === 'confirmed' ? '判断依据' : '候选插件'}</div>${hits}` : ''}`))
        } catch (error) { render(panel('分析失败', `<p class="dei-error">${esc(error)}</p>${exportActions()}<div class="dei-actions"><button type="button" class="dei-button dei-primary dei-settings">打开设置</button></div>`)) }
      }
      const action = async event => {
        const element = event.target instanceof Element ? event.target : undefined
        if (element?.classList.contains('dei-scrim')) return close()
        if (element?.closest('.dei-back')) { if (previousView) { const view = previousView; previousView = ''; render(view) } else close(); return }
        if (element?.closest('.dei-settings')) return settings()
        if (element?.closest('.dei-capture-hotkey')) { captureHotkey = true; element.textContent = '请按下新的快捷键…'; return }
        const remove = element?.closest('.dei-remove-hidden')
        if (remove) { const hidden = prefs.hidden.filter((_, index) => index !== Number(remove.dataset.index)); if (await savePreference('hidden', hidden)) { scheduleHidden(); settings() }; return }
        if (element?.closest('.dei-clear-hidden')) { if (await savePreference('hidden', [])) { scheduleHidden(); settings() }; return }
        if (element?.closest('.dei-hide-current') && selectedInfo) { const rule = createHiddenRule(selectedInfo); const hidden = prefs.hidden.some(item => JSON.stringify(item) === JSON.stringify(rule)) ? prefs.hidden : [...prefs.hidden, rule]; if (await savePreference('hidden', hidden)) { applyHidden(); settings() }; return }
        const exportButton = element?.closest('.dei-screenshot,.dei-copy-html,.dei-copy-markdown')
        if (exportButton && root?.contains(exportButton)) {
          event.preventDefault(); event.stopPropagation()
          if (!selectedElement) return notify('所选元素已失效，请重新选择', true)
          const originalLabel = exportButton.textContent
          exportButton.disabled = true
          exportButton.textContent = '处理中…'
          try {
            if (exportButton.classList.contains('dei-screenshot')) {
              const destination = await deliverScreenshot(await captureElementPng(selectedElement, ROOT_ID, window.devicePixelRatio))
              notify(destination === 'clipboard' ? '元素截图已复制到剪贴板' : '元素截图已下载为 PNG')
            } else if (exportButton.classList.contains('dei-copy-html')) {
              await writeText(serializeElement(selectedElement, ROOT_ID))
              notify('元素 HTML 已复制')
            } else {
              await writeText(elementToMarkdown(selectedElement, ROOT_ID))
              notify('元素 Markdown 已复制')
            }
          } catch (error) {
            notify(`导出失败：${error instanceof Error ? error.message : String(error)}`, true)
          } finally {
            exportButton.disabled = false
            exportButton.textContent = originalLabel
          }
          return
        }
        const button = element?.closest('button[data-package]')
        if (!button || !root?.contains(button)) return
        event.preventDefault(); event.stopPropagation()
        const endpoint = button.classList.contains('dei-open-folder') ? '/__dsh-element-inspector/open-folder' : '/__dsh-element-inspector/open-repository'
        button.disabled = true
        const originalLabel = button.textContent
        button.textContent = '正在打开…'
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        try {
          const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ packageName: button.dataset.package }), signal: controller.signal })
          const data = await response.json()
          if (!response.ok) throw new Error(data.message || `请求失败 (${response.status})`)
          button.disabled = false
          button.textContent = originalLabel
          notify(endpoint.endsWith('open-folder') ? '插件文件夹已在文件管理器中打开' : '源仓库已在浏览器中打开')
        } catch (error) {
          button.disabled = false
          button.textContent = originalLabel
          notify(error?.name === 'AbortError' ? '打开操作超时，请重试' : `打开失败：${error instanceof Error ? error.message : String(error)}`, true)
        } finally { clearTimeout(timeout) }
      }
      const click = event => {
        if (event.target instanceof Element && event.target.closest('.dei-close')) return close()
        return pick(event)
      }
      const key = event => {
        if (captureHotkey) { if (event.key === 'Escape') { captureHotkey = false; return settings() }; if (event.key === 'Control' || event.key === 'Shift' || event.key === 'Alt' || event.key === 'Meta') return; const hotkey = eventHotkey(event); captureHotkey = false; void savePreference('hotkey', hotkey).then(() => settings()); return }
        if (eventHotkey(event) === prefs.hotkey) { event.preventDefault(); const now = Date.now(); if (key.last && now - key.last < 550) return settings(); key.last = now; return start() }
        if (event.key === 'Escape' && (active || root)) close()
      }
      key.last = 0
      const observer = new MutationObserver(scheduleHidden)
      observer.observe(document.documentElement, { childList: true, subtree: true })
      const syncPreferences = () => {
        settingsSnapshot = preferenceScope.getSnapshot()
        if (settingsSnapshot.status !== 'ready') return
        prefs = normalizePrefs(settingsSnapshot.value)
        writeStartupCache(prefs)
        scheduleHidden()
        if (root?.querySelector('.dei-panel[aria-label="设置"]') && !captureHotkey) settings()
        const user = settingsSnapshot.user
        const hasUserPreference = user && typeof user === 'object' && ('hotkey' in user || 'hidden' in user)
        const legacy = !migrationStarted && !hasUserPreference ? readLegacyPrefs() : undefined
        if (!legacy) return
        migrationStarted = true
        void (async () => {
          await preferenceScope.set('hotkey', legacy.hotkey)
          await preferenceScope.set('hidden', legacy.hidden)
          const accepted = preferenceScope.getSnapshot().value
          if (accepted?.hotkey === legacy.hotkey && JSON.stringify(accepted?.hidden) === JSON.stringify(legacy.hidden)) {
            try { localStorage.removeItem(LEGACY_STORAGE_KEY) } catch {}
          }
        })()
      }
      const unsubscribePreferences = preferenceScope.subscribe(syncPreferences)
      syncPreferences()
      applyHidden()
      document.addEventListener('keydown', key, true); document.addEventListener('mousemove', move, true); document.addEventListener('click', action, true); document.addEventListener('click', click, true)
      ctx.effect(() => () => { unsubscribePreferences(); observer.disconnect(); document.removeEventListener('keydown', key, true); document.removeEventListener('mousemove', move, true); document.removeEventListener('click', action, true); document.removeEventListener('click', click, true); close(); document.getElementById(STYLE_ID)?.remove() }, 'dsh-element-inspector: listeners')
    }
    module.exports = { apply, inject: ['settingsScope', 'connection', 'remote'] }
    return module.exports
  },
})
