// Build-time reader for a page's `export const meta = { … }` (TECH-SPEC S-56,
// D41, D43). It reads plain literals only: objects, arrays, single- or
// double-quoted strings, numbers, true, false, null, quoted or bare keys,
// trailing commas and comments. Anything else (a call, an identifier, a
// template literal, a spread, a method) makes the whole `meta` unreadable.
// No parser dependency (SPEC §9 rule 5).

/** Thrown inside the reader when the value is not a plain literal. */
class Unreadable extends Error {}

const DECLARATION = /\bexport\s+const\s+meta\s*=/

/**
 * @typedef {{ found: false } | { found: true, readable: false } | { found: true, readable: true, value: unknown }} MetaRead
 */

/**
 * Find and read a page's `meta` export.
 * @param {string} source the page module's source text
 * @returns {MetaRead}
 */
export function readMeta(source) {
  const match = DECLARATION.exec(source)
  if (!match) return { found: false }
  try {
    const reader = new Reader(source, match.index + match[0].length)
    const value = reader.value()
    return { found: true, readable: true, value }
  } catch (error) {
    if (error instanceof Unreadable) return { found: true, readable: false }
    throw error
  }
}

/**
 * Read one literal value from `text` (for tests).
 * @param {string} text
 * @returns {unknown} the value
 * @throws {Error} when `text` does not start with a plain literal
 */
export function readLiteral(text) {
  const reader = new Reader(text, 0)
  const value = reader.value()
  reader.space()
  if (reader.pos < text.length) throw new Unreadable(`unexpected ${JSON.stringify(text[reader.pos])}`)
  return value
}

const IDENTIFIER = /[A-Za-z_$][\w$]*/y
const NUMBER = /-?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/y
/** @type {Record<string, string>} */
const ESCAPES = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0' }

class Reader {
  /** @param {string} text @param {number} pos */
  constructor(text, pos) {
    this.text = text
    this.pos = pos
  }

  /** Skip whitespace and comments. */
  space() {
    const { text } = this
    for (;;) {
      while (this.pos < text.length && /\s/.test(text[this.pos])) this.pos++
      if (text.startsWith('//', this.pos)) {
        const end = text.indexOf('\n', this.pos)
        this.pos = end === -1 ? text.length : end
      } else if (text.startsWith('/*', this.pos)) {
        const end = text.indexOf('*/', this.pos + 2)
        if (end === -1) throw new Unreadable('unterminated comment')
        this.pos = end + 2
      } else return
    }
  }

  /** @param {string} char */
  eat(char) {
    this.space()
    if (this.text[this.pos] !== char) return false
    this.pos++
    return true
  }

  /** @returns {unknown} */
  value() {
    this.space()
    const char = this.text[this.pos]
    if (char === '{') return this.object()
    if (char === '[') return this.array()
    if (char === '"' || char === "'") return this.string()
    for (const [word, value] of /** @type {const} */ ([['true', true], ['false', false], ['null', null]])) {
      if (this.text.startsWith(word, this.pos) && !/[\w$]/.test(this.text[this.pos + word.length] ?? '')) {
        this.pos += word.length
        return value
      }
    }
    NUMBER.lastIndex = this.pos
    const number = NUMBER.exec(this.text)
    if (number && !/[\w$]/.test(this.text[this.pos + number[0].length] ?? '')) {
      this.pos += number[0].length
      return Number(number[0])
    }
    throw new Unreadable(`not a literal at ${this.pos}`)
  }

  /** @returns {Record<string, unknown>} */
  object() {
    this.pos++ // {
    /** @type {Record<string, unknown>} */
    const result = {}
    while (!this.eat('}')) {
      this.space()
      const key = this.key()
      if (!this.eat(':')) throw new Unreadable('expected ":"')
      Object.defineProperty(result, key, { value: this.value(), enumerable: true, writable: true, configurable: true })
      if (!this.eat(',')) {
        if (!this.eat('}')) throw new Unreadable('expected "," or "}"')
        break
      }
    }
    return result
  }

  /** @returns {string} */
  key() {
    const char = this.text[this.pos]
    if (char === '"' || char === "'") return this.string()
    IDENTIFIER.lastIndex = this.pos
    const name = IDENTIFIER.exec(this.text)
    if (name) {
      this.pos += name[0].length
      return name[0]
    }
    NUMBER.lastIndex = this.pos
    const number = NUMBER.exec(this.text)
    if (number && !number[0].startsWith('-')) {
      this.pos += number[0].length
      return String(Number(number[0]))
    }
    throw new Unreadable('expected a key')
  }

  /** @returns {unknown[]} */
  array() {
    this.pos++ // [
    /** @type {unknown[]} */
    const result = []
    while (!this.eat(']')) {
      result.push(this.value())
      if (!this.eat(',')) {
        if (!this.eat(']')) throw new Unreadable('expected "," or "]"')
        break
      }
    }
    return result
  }

  /** @returns {string} */
  string() {
    const { text } = this
    const quote = text[this.pos++]
    let result = ''
    for (;;) {
      const char = text[this.pos++]
      if (char === undefined || char === '\n') throw new Unreadable('unterminated string')
      if (char === quote) return result
      if (char !== '\\') {
        result += char
        continue
      }
      const next = text[this.pos++]
      if (next === undefined) throw new Unreadable('unterminated string')
      if (next in ESCAPES) result += ESCAPES[next]
      else if (next === 'x' || next === 'u') {
        const hex = next === 'x' ? text.slice(this.pos, this.pos + 2)
          : text[this.pos] === '{' ? text.slice(this.pos + 1, text.indexOf('}', this.pos)) : text.slice(this.pos, this.pos + 4)
        if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Unreadable('bad escape')
        result += String.fromCodePoint(parseInt(hex, 16))
        this.pos += next === 'x' ? 2 : text[this.pos] === '{' ? hex.length + 2 : 4
      } else if (next === '\n') {
        // line continuation
      } else result += next
    }
  }
}
