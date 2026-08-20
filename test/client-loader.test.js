import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

test('the built client bundle materializes through DSH ClientModuleSystem', async () => {
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const PreviousMutationObserver = globalThis.MutationObserver
  const target = {
    mode: 'queue',
    pendingQueue: [],
    load(registration) { this.pendingQueue.push(registration) },
  }
  globalThis.window = { __ModuleLoader__: target }
  try {
    const modulesBundle = await readFile(new URL('../node_modules/@deepseek-ai/dsh-client-modules/lib/client.js', import.meta.url), 'utf8')
    vm.runInThisContext(modulesBundle, { filename: 'dsh-client-modules/client.js' })
    const modulesRegistration = target.pendingQueue.shift()
    assert.equal(modulesRegistration.id, '@deepseek-ai/dsh-client-modules')
    const modulesExports = modulesRegistration.factory(() => {
      throw new Error('the modules bootstrap bundle unexpectedly required a static module')
    })
    const hookState = []
    let hookIndex = 0
    const reactSingleton = {
      createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
      useCallback: callback => callback,
      useEffect: effect => effect(),
      useRef: initial => ({ current: initial }),
      useState(initial) {
        const index = hookIndex++
        hookState[index] = initial
        return [hookState[index], value => {
          hookState[index] = typeof value === 'function' ? value(hookState[index]) : value
        }]
      },
      useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    }
    const inspectorBundle = await readFile(new URL('../client.js', import.meta.url), 'utf8')
    const system = modulesExports.createClientModuleSystem(target, {
      id: modulesRegistration.id,
      exports: modulesExports,
    }, {
      boot: {
        rev: 'fixture-graph',
        entries: [{
          id: 'dsh-element-inspector',
          url: '/plugins/dsh-element-inspector/client.js?rev=fixture',
          rev: 'fixture',
          external: ['react'],
        }],
      },
      staticModules: { react: reactSingleton },
      loadBundle: async url => {
        assert.equal(url, '/plugins/dsh-element-inspector/client.js?rev=fixture')
        vm.runInThisContext(inspectorBundle, { filename: 'dsh-element-inspector/client.js' })
      },
    })

    const client = await system.import('dsh-element-inspector', '', {})
    assert.equal(typeof client.apply, 'function')
    assert.deepEqual(client.inject, ['settingsScope', 'connection', 'slots'])
    assert.equal(system.loadCache.get('dsh-element-inspector').edges.has('react'), true)

    const registrations = []
    const hidden = [{ tag: 'BUTTON', text: 'first' }, { tag: 'BUTTON', text: 'second' }]
    const writes = []
    let finishWrite
    const snapshot = { status: 'ready', writable: true, revision: 1, value: { hotkey: 'F1', hidden } }
    const scope = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
      set: (field, value) => {
        writes.push({ field, value })
        return new Promise(resolve => { finishWrite = resolve })
      },
    }
    globalThis.document = {
      head: { append() {} },
      body: { querySelectorAll: () => [] },
      documentElement: {},
      getElementById: () => undefined,
      createElement: () => ({}),
      addEventListener() {},
      removeEventListener() {},
    }
    globalThis.MutationObserver = class {
      observe() {}
      disconnect() {}
    }
    client.apply({
      settingsScope: { bind: ({ namespace }) => {
        assert.equal(namespace, 'dsh-element-inspector')
        return scope
      } },
      slots: {
        inject(slot, callback) {
          assert.equal(slot, 'settings.plugin.item')
          return callback()
        },
        register(options, component) {
          registrations.push({ options, component })
          return () => {}
        },
      },
      effect(setup) { return setup() },
    })
    assert.equal(registrations.length, 1)
    assert.deepEqual(registrations[0].options, {
      name: 'settings.plugin.item',
      key: 'dsh-element-inspector',
    })
    assert.equal(typeof registrations[0].component, 'function')
    hookIndex = 0
    const card = registrations[0].component()
    assert.equal(card.type, 'li')
    const nodes = []
    const visit = node => {
      if (Array.isArray(node)) return node.forEach(visit)
      if (!node || typeof node !== 'object') return
      nodes.push(node)
      visit(node.children)
    }
    visit(card)
    const removeButtons = nodes.filter(node => node.props?.['aria-label'] === '取消隐藏')
    assert.equal(removeButtons.length, 2)
    removeButtons[0].props.onClick()
    removeButtons[1].props.onClick()
    assert.deepEqual(writes, [{ field: 'hidden', value: [hidden[1]] }])
    finishWrite()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(hookState[1], '设置保存失败，已恢复 DSH 中的值')
  } finally {
    globalThis.window = previousWindow
    globalThis.document = previousDocument
    globalThis.MutationObserver = PreviousMutationObserver
  }
})
