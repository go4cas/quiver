// @vitest-environment node
// TECH-SPEC S-56: the build-time reader for a page's literal `meta`.
import { describe, it, expect } from 'vitest'
import { readLiteral, readMeta } from '../src/node/literal.js'

describe('S-56: literal reader', () => {
  it.each([
    ['{}', {}],
    ["{ layout: 'menu', title: \"Home\" }", { layout: 'menu', title: 'Home' }],
    ["{ 'layout': 'menu', \"nav\": { label: 'Team', order: 2, }, }", { layout: 'menu', nav: { label: 'Team', order: 2 } }],
    ['[1, -2.5, 0x10, 1e3, true, false, null,]', [1, -2.5, 16, 1000, true, false, null]],
    ["{ a: 'it\\'s', b: 'caf\\u00e9', c: '\\x41\\n', d: '\\u{1F600}' }", { a: "it's", b: 'café', c: 'A\n', d: '😀' }],
    ['{ /* block */ a: 1, // line\n b: 2 }', { a: 1, b: 2 }],
    ['{ 1: 1, $x: 2, _y: 3 }', { 1: 1, $x: 2, _y: 3 }],
  ])('reads %s', (text, value) => {
    expect(readLiteral(text)).toEqual(value)
  })

  it.each([
    '{ label }',
    '{ label: label }',
    '{ label: `Team` }',
    '{ label: t("team") }',
    '{ ...base }',
    '{ title() { return 1 } }',
    '{ a: 1 b: 2 }',
    "{ a: 'open }",
    '{ a: truey }',
    'undefined',
  ])('refuses %s', (text) => {
    expect(() => readLiteral(text)).toThrow()
  })

  it('__proto__ is an ordinary key, never the prototype', () => {
    const value = /** @type {Record<string, unknown>} */ (readLiteral("{ __proto__: { polluted: true } }"))
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype)
    expect(Object.hasOwn(value, '__proto__')).toBe(true)
  })

  it('readMeta finds `export const meta =` and reads only its value', () => {
    expect(readMeta("import x from 'y'\nexport const meta = { nav: { label: 'A' } }\nexport default () => x")).toEqual({
      found: true, readable: true, value: { nav: { label: 'A' } },
    })
    expect(readMeta('export default () => 1')).toEqual({ found: false })
    expect(readMeta('const label = "A"\nexport const meta = { label }')).toEqual({ found: true, readable: false })
  })
})
