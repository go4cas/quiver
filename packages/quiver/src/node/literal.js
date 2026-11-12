// Build-time reader for a page's `export const meta = { … }` (TECH-SPEC S-56,
// D41, D43). It reads plain literals only: objects, arrays, single- or
// double-quoted strings, numbers, true, false, null, quoted or bare keys,
// trailing commas and comments. Anything else (a call, an identifier, a
// template literal, a spread, a method) makes the whole `meta` unreadable.
// No parser dependency (SPEC §9 rule 5).
//
// R32-05, N210: the declaration is found by a small tokenizer, not a regex, so
// a comment, a string, a template or a regular expression that contains
// `export const meta =` never counts, nor does one nested in a block; comments
// between the declaration's tokens are fine; and the literal must be the whole
// initializer (`{ … }.nav` or `{ … } || x` is an expression, so unreadable).

/** Thrown inside the reader when the value is not a plain literal. */
class Unreadable extends Error {}

/**
 * `mentions`: whether the unreadable initializer names `nav` or `layout` (as a
 * word or a string), the case the scan warns about.
 * @typedef {{ found: false } | { found: true, readable: false, mentions: boolean }
 *   | { found: true, readable: true, value: unknown }} MetaRead
 */

/**
 * One token: `name` (an identifier or keyword), `string`, `template`, `number`,
 * `regex` or `punct` (one character). `depth` is the bracket depth it starts at,
 * template `${` included; `newline` whether a line break comes before it.
 * @typedef {{ type: 'name' | 'string' | 'template' | 'number' | 'regex' | 'punct',
 *   value: string, start: number, end: number, depth: number, newline: boolean }} Token
 */

// After these keywords a `/` starts a regular expression, not a division.
const BEFORE_REGEX = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'throw', 'case', 'do', 'else', 'yield', 'await'])
// A line break before one of these ends the `meta` statement (ASI); before
// anything else it may continue the expression.
const STATEMENT_START = new Set(['export', 'import', 'function', 'async', 'class', 'const', 'let', 'var',
  'if', 'for', 'while', 'do', 'try', 'switch', 'return', 'throw'])
const NAME_START = /[A-Za-z_$\u0080-￿]/
const NAME_PART = /[\w$\u0080-￿]/

/**
 * Split JavaScript source into tokens: enough to tell code from comments,
 * strings, templates and regular expressions, and to track bracket depth. It
 * never throws; unterminated text runs to the end.
 * @param {string} text
 * @returns {Token[]}
 */
export function tokenize(text) {
  /** @type {Token[]} */
  const tokens = []
  /** @type {('(' | '[' | '{' | '${')[]} */
  const stack = []
  let pos = 0
  let newline = false

  /** @param {Token['type']} type @param {number} start */
  const push = (type, start) => {
    tokens.push({ type, value: text.slice(start, pos), start, end: pos, depth: stack.length, newline })
    newline = false
  }
  /** Read a template's text from `pos` to its closing backtick or next `${`. */
  const templateText = () => {
    while (pos < text.length) {
      const char = text[pos]
      if (char === '\\') pos += 2
      else if (char === '`') return void pos++
      else if (char === '$' && text[pos + 1] === '{') {
        pos += 2
        stack.push('${')
        return
      } else pos++
    }
  }
  const regexAllowed = () => {
    const prev = tokens[tokens.length - 1]
    if (!prev) return true
    if (prev.type === 'name') return BEFORE_REGEX.has(prev.value)
    if (prev.type === 'punct') return !')]}'.includes(prev.value)
    return false
  }

  while (pos < text.length) {
    const char = text[pos]
    const start = pos
    if (char === '\n' || char === '\r' || char === '\u2028' || char === '\u2029') {
      newline = true
      pos++
    } else if (/\s/.test(char)) pos++
    else if (char === '/' && text[pos + 1] === '/') {
      const end = text.slice(pos).search(/[\n\r\u2028\u2029]/)
      pos = end === -1 ? text.length : pos + end
    } else if (char === '/' && text[pos + 1] === '*') {
      const end = text.indexOf('*/', pos + 2)
      const body = text.slice(pos, end === -1 ? text.length : end)
      if (/[\n\r\u2028\u2029]/.test(body)) newline = true
      pos = end === -1 ? text.length : end + 2
    } else if (char === '"' || char === "'") {
      pos++
      while (pos < text.length && text[pos] !== char && text[pos] !== '\n') pos += text[pos] === '\\' ? 2 : 1
      pos++
      push('string', start)
    } else if (char === '`') {
      pos++
      templateText()
      push('template', start)
    } else if (char === '}' && stack[stack.length - 1] === '${') {
      stack.pop()
      templateText()
      push('template', start)
    } else if (char === '/' && regexAllowed()) {
      let inClass = false
      pos++
      while (pos < text.length && text[pos] !== '\n') {
        const c = text[pos]
        if (c === '\\') pos++
        else if (c === '[') inClass = true
        else if (c === ']') inClass = false
        else if (c === '/' && !inClass) break
        pos++
      }
      pos++
      while (pos < text.length && NAME_PART.test(text[pos])) pos++
      push('regex', start)
    } else if (NAME_START.test(char)) {
      while (pos < text.length && NAME_PART.test(text[pos])) pos++
      push('name', start)
    } else if (/\d/.test(char) || (char === '.' && /\d/.test(text[pos + 1] ?? ''))) {
      while (pos < text.length && /[\w.]/.test(text[pos])) {
        pos += /[eE]/.test(text[pos]) && /[+-]/.test(text[pos + 1] ?? '') && !/^0[xX]/.test(text.slice(start)) ? 2 : 1
      }
      push('number', start)
    } else {
      pos++
      if (char === '}' || char === ')' || char === ']') {
        stack.pop()
        push('punct', start)
      } else {
        push('punct', start)
        if (char === '{' || char === '(' || char === '[') stack.push(char)
      }
    }
  }
  return tokens
}

/**
 * The end of the declaration starting at token `from`: the index of the first
 * token after its initializer (a top-level `;` or `,`, a statement on a new
 * line, or the end).
 * @param {Token[]} tokens
 * @param {number} from
 * @returns {number}
 */
function initializerEnd(tokens, from) {
  for (let i = from; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.depth !== 0 || i === from) continue
    if (token.type === 'punct' && (token.value === ';' || token.value === ',')) return i
    if (token.newline && token.type === 'name' && STATEMENT_START.has(token.value)) return i
  }
  return tokens.length
}

/**
 * Whether the initializer tokens name `nav` or `layout`.
 * @param {Token[]} tokens
 */
const mentions = (tokens) => tokens.some((t) => (t.type === 'name' && (t.value === 'nav' || t.value === 'layout'))
  || (t.type === 'string' && /^.(nav|layout).$/.test(t.value)))

/**
 * Find and read a page's `meta` export: a top-level `export const meta = …`
 * whose initializer is exactly one plain literal. `export let`, `export var`
 * and `export { meta }` are found but unreadable.
 * @param {string} source the page module's source text
 * @returns {MetaRead}
 */
export function readMeta(source) {
  const tokens = tokenize(source)
  const at = (/** @type {number} */ i, /** @type {string} */ value) => tokens[i]?.value === value
    && (tokens[i].type === 'name' || tokens[i].type === 'punct')
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].depth !== 0 || !at(i, 'export')) continue
    if (at(i + 1, '{')) {
      // export { meta } / export { x as meta }: not a literal the build can read.
      for (let j = i + 2; j < tokens.length && !at(j, '}'); j++) {
        if (at(j, 'meta') && !at(j + 1, 'as')) return { found: true, readable: false, mentions: false }
      }
      continue
    }
    const kind = tokens[i + 1]?.value
    if ((kind !== 'const' && kind !== 'let' && kind !== 'var') || !at(i + 2, 'meta') || !at(i + 3, '=')) continue
    const end = initializerEnd(tokens, i + 4)
    const unreadable = { found: /** @type {const} */ (true), readable: /** @type {const} */ (false), mentions: mentions(tokens.slice(i + 4, end)) }
    if (kind !== 'const' || i + 4 >= tokens.length) return unreadable
    try {
      const reader = new Reader(source, tokens[i + 3].end)
      const value = reader.value()
      // The literal must be the whole initializer (R32-05).
      const next = tokens.find((t) => t.start >= reader.pos)
      if (next && next !== tokens[end]) return unreadable
      return { found: true, readable: true, value }
    } catch (error) {
      if (error instanceof Unreadable) return unreadable
      throw error
    }
  }
  return { found: false }
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
