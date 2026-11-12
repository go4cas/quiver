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
    expect(readMeta('const label = "A"\nexport const meta = { label }')).toEqual({ found: true, readable: false, mentions: false })
  })
})

describe('R32-05: readMeta finds the real top-level declaration', () => {
  const NAV = { nav: { label: 'Real' } }

  it.each([
    ['a line comment', "// export const meta = { nav: { label: 'Old' } }\nexport const meta = { nav: { label: 'Real' } }"],
    ['a block comment', "/* export const meta = { nav: { label: 'Old' } } */\nexport const meta = { nav: { label: 'Real' } }"],
    ['a string', "const s = 'export const meta = { nav: { label: \\'Old\\' } }'\nexport const meta = { nav: { label: 'Real' } }"],
    ['a template', "const s = `export const meta = ${'{'} nav: 1 }`\nexport const meta = { nav: { label: 'Real' } }"],
    ['a regular expression', "const r = /export const meta = {/\nexport const meta = { nav: { label: 'Real' } }"],
    ['a block', "function f() {\n  // export const meta = { nav: { label: 'Old' } }\n}\nexport const meta = { nav: { label: 'Real' } }"],
  ])('%s cannot shadow the export', (_, source) => {
    expect(readMeta(source)).toEqual({ found: true, readable: true, value: NAV })
  })

  it('comments and line breaks between the declaration’s tokens are fine', () => {
    expect(readMeta("export /* a */ const // b\n  meta /* c */ =\n  /* d */ { nav: { label: 'Real' } };\nexport default 1")).toEqual({
      found: true, readable: true, value: NAV,
    })
    expect(readMeta("export const meta = { nav: { label: 'Real' } }, other = 2")).toEqual({ found: true, readable: true, value: NAV })
  })

  it('a declaration only inside a block or a string is not found', () => {
    expect(readMeta("function f() { const meta = { nav: 1 } }\nconst s = 'export const meta = {}'")).toEqual({ found: false })
  })

  it.each([
    ['a member of a literal', "export const meta = { nav: { label: 'A' } }.nav ? {} : { nav: { label: 'B' } }", true],
    ['a literal then an operator', "export const meta = { nav: { label: 'A' } } || other", true],
    ['a literal then a call on the next line', "export const meta = { nav: { label: 'A' } }\n(setup)()", true],
    ['a spread', "export const meta = { ...base, nav: { label: 'A' } }", true],
    ['a call', "export const meta = make({ title: 'x' })", false],
    ['a template value', 'export const meta = { title: `x` }', false],
    ['a quoted nav key in an expression', "export const meta = { 'nav': x }", true],
    ['export let', "export let meta = { nav: { label: 'A' } }", true],
    ['export { meta }', "const meta = { nav: { label: 'A' } }\nexport { meta }", false],
  ])('%s is found but unreadable', (_, source, mentions) => {
    expect(readMeta(source)).toEqual({ found: true, readable: false, mentions })
  })

  it('mentions looks only at the initializer, not at the rest of the file', () => {
    expect(readMeta("export const meta = make()\nconst nav = 1\nexport const layout = 'x'")).toEqual({ found: true, readable: false, mentions: false })
  })
})
