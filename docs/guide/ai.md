# AI Tooling

Quiver is written so that an AI assistant can work in your app without guessing: the conventions are in one file, the rules that break silently are spelled out, and the common tasks are slash commands.

## Context files

`@go4cas/quiver` ships two files for agents, inside the package:

| File | What it is |
|---|---|
| `node_modules/@go4cas/quiver/AGENTS.md` | The agent guide for apps that use Quiver: startup order, the 13 exports, routing and base-path rules, Arrow.js pitfalls, recipes, CSS rules, testing |
| `node_modules/@go4cas/quiver/llms.txt` | A short index in the [llms.txt](https://llmstxt.org) format, linking the guide, the recipes and these docs |

They update with the package, so they always describe the version you installed. Point your tools at them:

- **Claude Code** reads `CLAUDE.md`. The starter's imports both files:

  ```md
  @node_modules/@go4cas/quiver/AGENTS.md
  @node_modules/@go4cas/quiver/llms.txt
  ```

- **Codex, GitHub Copilot and other AGENTS.md-aware tools** read an `AGENTS.md` at the root of your app. Write your app's own conventions there, and add a line pointing at `node_modules/@go4cas/quiver/AGENTS.md`.

## The Claude Code plugin

The `/add-*` commands ship as a Claude Code plugin from the Quiver repository. Install it once:

```
/plugin marketplace add go4cas/quiver
/plugin install quiver@quiver
```

Plugin commands are namespaced, so they also answer to `/quiver:add-page` and so on. They work in any app with `@go4cas/quiver` installed, not just the starter, and read the recipes from `node_modules/@go4cas/quiver/recipes/`.

| Command | What it does |
|---|---|
| `/add-page <path>` | Creates a page in `src/pages/` (`users/[id]` → `/users/:id`) |
| `/add-component <Name>` | Installs a recipe when the name matches one (`toast`, `ThemeToggle`, `LoadingView`, `Link`), otherwise scaffolds a component and its CSS |
| `/add-layout <name>` | Installs the layouts recipe (`menu`, `basic`), otherwise scaffolds a layout in `src/layouts/` (the file name is the layout name, so there is nothing to register) |
| `/add-composable <name>` | Installs `useForm` or `hmrState`, points at `arrow-use` for fetch, storage, media queries and listeners, otherwise scaffolds a composable with a test |
| `/add-theme <id — description>` | Adds a theme: token blocks, optional effects, a theme switcher entry (installs the theme recipes first if needed) |
| `/add-state <name>` | Creates a `reactive()` store in `src/state/` |
| `/add-feature <name — description>` | Plans a whole feature (state, components, pages, nav, e2e test) and waits for your go-ahead |
| `/add-test <file>` | Writes unit or e2e tests for a file and runs them |

### Examples

```
/add-component toast
```
Installs the `toasts` and `theme` recipes into `src/components/` and `src/styles/`, adds their CSS to your entry stylesheet, and mounts `ToastContainer()`. In a plain Arrow app without Quiver's router this works too: the toasts recipe imports only `@arrow-js/core`.

```
/add-page blog/[slug]
```
Creates `src/pages/blog/[slug].js` for `/blog/:slug`, reading the param with `useRoute()`.

```
/add-theme ocean — cool blues, soft shadows
```
Adds light and dark token blocks to `src/styles/tokens.css` and an entry in the theme switcher.

```
/add-feature tickets — list, add and close support tickets
```
Presents a plan and writes nothing until you confirm.

## Rules for any assistant

If your tool reads neither file, paste these into its instructions. They are the mistakes that fail silently:

::: warning Arrow.js and Quiver rules
1. **Reactive slots are functions**: `${() => user.name}`. A bare value renders once.
2. **No HTML comments inside `html` templates**: Arrow uses comments as slot markers (`Invalid HTML position`).
3. **No `.disabled`**: it sets an attribute literally named `.disabled`. Use `aria-disabled` and style `[aria-disabled="true"]`.
4. **`.key(id)` on components in a list.**
5. **A slot that is sometimes a template is always a template**: ``` html`` ```, not `''`.
6. **Paths are base-relative**; only `url(path)` adds the base, for `href`s. Never add an `@click` that calls `go()` to a link.
7. **Startup**: `beforeEach()`/`afterEach()`/`onError()`, then `await createApp(app, { target })` with `quiver:app`; the step-by-step order is `provide()` → guards and hooks → `await initRouter()` → `createApp()`.
8. **Use what exists**: `useFetch` (arrow-use) for API calls, `useToast` (recipe) for notifications, `--q-*` tokens for every colour.
:::

## Working on Quiver itself

The repository has its own root `AGENTS.md` (imported by its `CLAUDE.md`) for contributors: the workspace layout, the specs in `planning/v3/`, and the checks to run. Inside the repository the commands work on `starter/`, and `.claude/settings.json` offers the plugin when you trust the folder (or run `claude --plugin-dir plugins/quiver`).
