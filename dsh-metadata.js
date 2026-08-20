export const DSH_OWNER = Object.freeze({
  type: 'dsh',
  name: 'DSH 官方界面',
})

const DSH_PACKAGE_NAMES = new Set([
  'deepseek-harness',
  '@deepseek-ai/deepseek-harness',
  '@deepseek-ai/dsh',
])

export function isDshPackage(packageName) {
  return DSH_PACKAGE_NAMES.has(packageName) || packageName.startsWith('@deepseek-ai/dsh-')
}

