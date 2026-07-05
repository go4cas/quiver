# AI Tooling

Quiver ships with context files and slash commands that make it easy to use AI coding assistants — whether you are building an app on top of Quiver or contributing to the starter itself.

---

## Always-on context files

These files are automatically loaded by their respective tools whenever you open the project. You do not need to do anything to activate them.

| File | Tool | Purpose |
|---|---|---|
| `AGENTS.md` | Codex and other AGENTS.md-aware tools | **The single source of truth** — full project context, conventions, and Arrow.js rules |
| `CLAUDE.md` | Claude Code | Imports `AGENTS.md` — same content, zero drift |
| `.github/copilot-instructions.md` | GitHub Copilot | Condensed rules applied inline during completions |

To change a convention, edit `AGENTS.md` — Claude Code picks it up through the import automatically. Only the Copilot file is maintained separately (it is a deliberately condensed variant).

The context covers:
- Folder structure and what belongs where
- Development and test commands
- Arrow.js-specific rules that trip up AI assistants
- Pages, navigation guards, state, components, layouts
- All five composables (`useRoute`, `useRouter`, `useForm`, `useFetch`, `useToast`), toasts, and theming
- What belongs in the repo vs a fork

---

## Claude Code slash commands

When working in Claude Code, eight slash commands are available. Type `/` in the chat input to see them.

| Command | What it does |
|---|---|
| `/add-page <path>` | Creates a new page at the given route path |
| `/add-state <name>` | Creates a new reactive state module |
| `/add-component <Name>` | Creates a new reusable component and registers it |
| `/add-layout <name>` | Creates a new layout and registers it |
| `/add-composable <name>` | Creates a new composable with a unit test |
| `/add-theme <id — description>` | Adds a visual theme: CSS tokens, selector entry, E2E test |
| `/add-feature <name — description>` | Plans and implements a complete feature end-to-end |
| `/add-test <file path>` | Writes unit or E2E tests for an existing file |

### Examples

```
/add-page blog/[slug]
```
Creates `src/pages/blog/[slug].js`, maps to `/blog/:slug`, shows how to read the param with `useRoute()`.

```
/add-state post
```
Creates `src/state/postState.js` with `createStore`, reactive `posts` array, and `addPost`/`removePost`/`updatePost` actions.

```
/add-component PostCard
```
Creates `src/components/PostCard.js`, ready to import directly where needed.

```
/add-layout sidebar
```
Creates `src/layouts/SidebarLayout.js`, registers it under key `'sidebar'`, and notes any DI keys it reads.

```
/add-composable useTheme
```
Creates `src/composables/useTheme.js` with reactive accessors and actions, plus a unit test in `tests/composables/useTheme.test.js`.

```
/add-theme ocean — cool blues, soft shadows
```
Adds light and dark token blocks to `src/style.css`, registers the theme in `ThemeSelector`, and extends the theme E2E test.

```
/add-feature blog — list posts, read a single post, markdown rendering
```
Presents a plan (pages, state, components, nav link, tests) and waits for your confirmation before writing any code.

```
/add-test src/composables/useForm.js
```
Detects the file type, writes Vitest unit tests in `tests/composables/useForm.test.js`, runs them, and fixes any failures.

---

## Key rules for any AI assistant

If you are using a tool that does not read `CLAUDE.md` automatically, paste these rules into your system prompt or first message:

::: warning Arrow.js rules — required context
**1. Reactive slots must be arrow functions.**
Use `${() => value}` for any interpolation that references state. Static values don't need `() =>`.

**2. No HTML comments inside templates.**
Never write `<!-- -->` inside `` html`...` `` — Arrow.js uses comment nodes as slot markers and this throws `Invalid HTML position`.

**3. `.disabled` is not a DOM property.**
`.disabled="${() => bool}"` sets a literal attribute named `.disabled`. Use `aria-disabled="true/false"` + CSS (`opacity-50 cursor-not-allowed`) instead.

**4. Use `.key()` in loops.**
`` items.map(i => Card(i).key(i.id)) `` prevents DOM re-creation on state changes.
:::

---

## Contributor note

Contributors working on Quiver itself get the same AI support. `AGENTS.md` explains which files are framework internals, what the testing and typing conventions are, and what scope changes should stay within. The `/add-test` command is especially useful for improving test coverage on existing framework utilities and composables.
