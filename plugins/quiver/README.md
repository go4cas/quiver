# Quiver Claude Code plugin

The `/add-*` commands for Quiver apps (and plain Arrow.js apps). They copy **recipes** from the `@go4cas/quiver` you installed (`node_modules/@go4cas/quiver/recipes/`), so the code you get always matches your core version, and they scaffold app code following Quiver's conventions.

| Command | Does |
|---|---|
| `/add-component <name>` | Installs a recipe (`toast`, `theme-switcher`, `views`, `link`, `theme`) with what it needs, or scaffolds a new component with its CSS |
| `/add-layout <name>` | Installs the layouts recipe (`menu`, `basic`) or scaffolds a new layout file in `src/layouts/` |
| `/add-theme <id>` | Adds a theme: token blocks, optional effects, a theme switcher entry (installing the theme recipes first if needed) |
| `/add-composable <name>` | Installs `useForm` or `hmrState`, points to `arrow-use`, or scaffolds a composable with a test |
| `/add-page <path>` | Creates a file-based route page |
| `/add-state <name>` | Creates a reactive state module |
| `/add-feature <name — description>` | Plans, then builds a feature end to end |
| `/add-test <file>` | Writes unit or e2e tests |

Plugin commands are namespaced: type `/quiver:add-component toast` (the `/` menu also finds it as you type `add-component`). The short names above are used for readability.

## Install

From the Quiver repository's marketplace:

```
/plugin marketplace add go4cas/quiver
/plugin install quiver@quiver
```

Or load it for one session from a clone: `claude --plugin-dir path/to/quiver/plugins/quiver`.

Inside the Quiver repository the plugin is enabled by `.claude/settings.json`, and the commands work on the starter in `starter/`.

## Example

In a plain Arrow app (no Quiver router needed) with `@go4cas/quiver` installed:

```
/add-component toast
```

installs the `toasts` and `theme` recipes into `src/components/` and `src/styles/`, adds the stylesheets in layer order, mounts `ToastContainer()`, and shows how to call `useToast().success('Saved')`.
