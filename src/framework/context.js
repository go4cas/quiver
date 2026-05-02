const _ctx = new Map()

export const provide = (key, value) => _ctx.set(key, value)
export const inject = (key, fallback) => _ctx.get(key) ?? fallback
