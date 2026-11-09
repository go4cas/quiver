# Quiver v3 — CSS design

Status: proposed, for Cas to approve in the Design PR · Phase: Design (feeds P1 and P7) · Date: 2026-11-08

This file is the CSS design for v3: the map from 2.x tokens to `--q-*` tokens, the `base.css` that replaces Tailwind's preflight, the recipe CSS pattern and class naming, how the per-theme effects port, and the screenshot baseline plan. The goal is **visual parity with 2.1, not a redesign**. [SPEC.md](SPEC.md) stays the source of truth. Decisions referenced here are in [DECISIONS.md](DECISIONS.md), and the evidence is in [NOTES.md](NOTES.md) (N32–N43).

Two things in this file need Cas's answer in this PR: the screenshot tolerance (§8.5, D35) and how P1 treats the 2.1 rendering bugs listed in §2. Everything else is a proposal P1 follows unless Cas changes it.

## Contents

1. Method: port what 2.1 renders
2. What 2.1 actually renders (V1–V6)
3. Layers and files
4. Token contract
5. `base.css`
6. Recipe CSS pattern and class naming
7. Theme effects
8. Screenshot baseline plan
9. Fix list (F1–F4)
10. Open questions for Cas

## 1. Method: port what 2.1 renders

P1 ports the **computed result** of 2.1, not its class lists. In 2.1 the effect rules at the bottom of `src/style.css` are unlayered, so they beat every Tailwind utility (`@layer utilities`) whatever the markup says. Several utilities in the markup therefore never apply, and some token overrides never reach the screen. A class-by-class translation would "fix" these by accident, and the screenshots would fail.

So for every element, P1 writes the declarations that win in 2.1. The screenshot gate (§8) proves it. The three checks below were run on this branch against the unmodified 2.1 code (Chromium from Playwright 1.63.0, Tailwind 4.3.3):

- **The token port is exact.** The `tokens.css` in §4.4, loaded beside 2.1, resolves every `--q-*` colour, radius and display-font token to the same value as its 2.x token, in all 5 themes × 2 modes: 220 of 220 values match (N41).
- **Plain CSS can match Tailwind's output pixel for pixel.** A plain `box-shadow` instead of Tailwind's five-part `--tw-shadow` stack, a plain `color-mix(in oklab, …)` without the `@supports` wrapper, and a flex column with `gap` instead of `space-y-*` margins each produced a 0-pixel difference at `threshold: 0` (N42).
- **Rendering is deterministic.** The same page captured 30 times (3 themes × 10 repeats, 4 workers) gave 0 differing pixels each time (N42).

## 2. What 2.1 actually renders (V1–V6)

Reading the compiled CSS and the computed styles in a browser showed six places where 2.1's source says one thing and the screen shows another. Evidence for each is in NOTES.md.

| # | What the source says | What renders | Why | Themes affected |
|---|---|---|---|---|
| V1 | Retro body text in VT323, brutalist body text in Space Grotesk | Both use the default sans stack. VT323 only shows on retro buttons. Space Grotesk never renders | `:root { font-family: Inter, … }` at the end of `style.css` has the same specificity as `[data-theme="retro"] { font-family: … }` and comes later, so it wins on `<html>` | retro, brutalist |
| V2 | Each theme has its own `--shadow-panel` / `--shadow-float` (brutalist: `4px 4px 0 0 #000`) | Every `shadow-panel`, `shadow-float` and `shadow-sm` utility uses the default soft grey shadow in every theme. Only retro panels get the retro shadow, through the retro effect rule | Tailwind v4 compiles shadow utilities with the `@theme` value inlined (`--tw-shadow: 0 1px 3px 0 var(--tw-shadow-color, rgb(0 0 0 / 0.1)) …`), so a later override of `--shadow-panel` never reaches them | mono, glass, retro (buttons), brutalist |
| V3 | Brand buttons have white text | In mono dark the brand is `#fafafa`, so "Increment", "Add member", "Refresh", "Sign in" and "Back to dashboard" are white on near-white (contrast 1.04:1). Brutalist (yellow) is 1.53:1, retro dark (lime) 1.51:1 | `text-white` is hard-coded on `bg-brand` | mono dark, retro dark, brutalist |
| V4 | Brutalist panels get a 3px border | The menu sidebar also gets a 3px border on all four sides, not only on the edge facing the content | Preflight sets `border: 0 solid` on every element, and `[data-theme="brutalist"] aside { border-width: 3px }` sets all four widths | brutalist |
| V5 | Various | Nothing visible | Dead declarations: `theme-brutalist:border-2` and `theme-glass:backdrop-blur-md` on panels (the effect rules win), brutalist `-webkit-font-smoothing: auto` (the body's `antialiased` wins), `transition-*` utilities on `button`/`a`/`input` (the unlayered base rule wins), the Space Grotesk 900 weight (Google serves 700 only), and `--font-ui` (never referenced) | – |
| V6 | Body text in Inter | Inter is never loaded, so body text falls back to `ui-sans-serif` / `system-ui`, which differs per OS | `style.css` imports only Audiowide, Orbitron, Space Grotesk and VT323 | all |

**How this file handles them.** The CSS in §4–§7 reproduces what renders (V1–V5), so P1's screenshots can match. V5's dead declarations are simply not ported. V6 stays as it is: self-hosting Inter would change how 2.1 looks for almost everyone, which is a redesign. §8.3 pins the fallback fonts instead.

V1–V4 are bugs a user would notice (V3 makes buttons unreadable). §9 has a ready fix for each (F1–F4) that changes only token values and two effect rules. **Cas decides** whether P1 applies them as a final commit with re-captured screenshots (recommended), leaves them for later, or skips the parity step for the affected themes. This file is written so that either answer needs no other change: the tokens the fixes need (`--q-color-on-brand`, `--q-font-body`, the shadow tokens) are in the contract from the start.

## 3. Layers and files

### 3.1 Layer order

Every Quiver stylesheet starts with the same statement:

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;
```

This declares `quiver` and its four sub-layers in a fixed order, whichever file loads first. It refines D29 (`@layer quiver;`), and needs Cas's OK (§10, question 2). It's needed because the 2.1 effect rules beat everything, including hover and state rules. Inside one flat `quiver` layer, `[data-theme="retro"] :where(.q-panel)` and a recipe's `:where(.q-toast)[data-type="error"]` have the same specificity, and the winner would depend on file order. With sub-layers, effects always beat components, as in 2.1.

| Sub-layer | Holds | File |
|---|---|---|
| `quiver.tokens` | `:root` contract + `[data-theme]` / `[data-mode]` token overrides | `tokens.css` |
| `quiver.base` | the reset that replaces preflight | `base.css` |
| `quiver.components` | recipe CSS (toasts, layouts, theme switcher, views). Apps may put their own component CSS here when they want the theme effects to apply on top of it, as the starter does | each recipe's `.css` |
| `quiver.effects` | per-theme effects that can't be tokens (blur, glow, scanlines, heading type) | `effects.css` |

What D29 promised still holds. Unlayered app CSS beats all of Quiver without `!important`. Layered apps declare their order once; for Tailwind v4 the line is unchanged: `@layer theme, base, quiver, components, utilities;`. Overriding a `--q-*` token on `:root` in unlayered CSS wins whatever the load order (D30).

### 3.2 Files

The theme recipe (D30) has three stylesheets and a font folder. It is the one recipe without a JS file, so it is an exception to TECH-SPEC's `<name>/<name>.js, <name>.css` layout:

```
recipes/theme/
  tokens.css      the token contract (§4)
  base.css        the reset (§5)
  effects.css     per-theme effects + @font-face for theme fonts (§7)
  fonts/          orbitron-700-latin.woff2, vt323-400-latin.woff2,
                  space-grotesk-700-latin.woff2, OFL-*.txt
  README.md
```

`effects.css` is optional. An app that wants only the default theme (or only tokens) skips it. The `/add-theme` command (P7) appends token blocks to `tokens.css` and, if needed, rules to `effects.css`, and adds an entry to the theme switcher's `THEMES` array.

**Loading.** Recipe JS never imports CSS. A JS import of CSS is a bundler feature, and recipes must work in no-build mode (R6). The app's CSS entry imports the files, in this order:

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;
@import "./quiver/theme/tokens.css";
@import "./quiver/theme/base.css";
@import "./quiver/toasts/toasts.css";      /* one line per recipe */
@import "./quiver/theme/effects.css";
@import "./app.css";                       /* the app's own CSS */
```

An `@import` may follow a `@layer` statement. The copy destination (`src/quiver/` above) is P7's call. No-build apps use `<link>` tags in the same order.

**In P1** (still the 2.x tree, before the P2 move), the files sit at:

| v3 home | P1 location |
|---|---|
| `recipes/theme/{tokens,base,effects}.css`, `fonts/` | `src/styles/{tokens,base,effects}.css`, `src/styles/fonts/` |
| recipe CSS | next to its component: `src/components/ToastContainer.css`, `src/layouts/MenuLayout.css`, and so on |
| starter-only CSS | `src/app.css` (shared page styles) + `src/components/{Counter,UserCard}.css` |
| CSS entry | `src/style.css`, as the import list above |

The Audiowide wordmark font is starter-only, so it lives with the starter (`src/fonts/` in P1, `starter/src/fonts/` after P2) and its `@font-face` is in `app.css`. Font URLs are relative to the CSS file (`url("./fonts/…")`), so they keep working under a base path (R3) and unbundled.

## 4. Token contract

### 4.1 Map from 2.x to v3

Every 2.x token is listed. Values are unchanged unless noted.

| 2.x token (`@theme`) | v3 token | Notes |
|---|---|---|
| `--color-brand` | `--q-color-brand` | |
| `--color-brand-hover` | `--q-color-brand-hover` | |
| `--color-brand-tint` | `--q-color-brand-tint` | |
| – (`text-white` on brand) | `--q-color-on-brand` | **New.** Text on a brand background. `#ffffff` everywhere in the parity port; F3 sets per-theme values |
| `--color-surface` | `--q-color-surface` | |
| `--color-surface-raised` | `--q-color-surface-raised` | |
| `--color-surface-inset` | `--q-color-surface-inset` | |
| `--color-fg` | `--q-color-fg` | |
| `--color-fg-soft` | `--q-color-fg-soft` | |
| `--color-fg-faint` | `--q-color-fg-faint` | |
| `--color-line` | `--q-color-line` | |
| `--color-line-strong` | `--q-color-line-strong` | |
| `--color-success`, `-tint` | `--q-color-success`, `--q-color-success-tint` | |
| `--color-error`, `-tint` | `--q-color-error`, `--q-color-error-tint` | |
| `--color-warning`, `-tint` | `--q-color-warning`, `--q-color-warning-tint` | |
| `--color-info`, `-tint` | `--q-color-info`, `--q-color-info-tint` | |
| `--radius-control` | `--q-radius-control` | |
| `--radius-panel` | `--q-radius-panel` | |
| `--shadow-panel` | `--q-shadow-panel` | Theme overrides left out in the parity port (V2); F2 restores them |
| `--shadow-float` | `--q-shadow-float` | Same as above |
| `:root { font-family }` (style.css base section) | `--q-font-body` | **New name** for the stack 2.1 hard-codes on `:root`. F1 sets per-theme values |
| `--font-display` | `--q-font-display` | Retro overrides it to Orbitron (used by retro headings) |
| `--font-ui` | – | **Dropped**: never referenced (V5). Its value equals the display stack; apps use `--q-font-body` |
| Tailwind `--font-mono` | `--q-font-mono` | **New in the contract.** Tailwind 4.3.3's default mono stack, used by every `font-mono` and by `code` |
| `--font-audiowide` | – | **Moves to the starter** as `--font-wordmark`. It is the starter's brand wordmark, not part of the contract |
| `--animate-toast-in`, `--animate-toast-out` | – | **Moves to the toast recipe** as `@keyframes q-toast-in` / `q-toast-out` (D31) |
| Tailwind `--animate-pulse` | – | **Moves to the starter** (posts skeleton), as `@keyframes pulse` |

The contract is therefore 27 tokens: 20 colours, 2 radii, 2 shadows, 3 font stacks. A theme overrides any subset. Recipes read only these tokens; they never read Tailwind names or invent colours.

### 4.2 What each theme overrides

| Theme | Light block overrides | Dark block overrides | Not a token (goes to `effects.css`) |
|---|---|---|---|
| default | (the `:root` values) | surface ×3, fg ×3, line ×2, brand-tint, all 8 status | – |
| mono | brand ×3, surface ×3, fg ×3, line ×2, both radii | brand ×3, surface ×3, fg ×3, line ×2 | type scale, heading weight, focus ring |
| glass | brand ×3, surface ×3, fg ×3, line ×2, both radii | brand ×3, surface ×3, fg ×3, line ×2 | page gradient, weight 450, blur + sheen |
| retro | brand ×3, surface ×3, fg ×3, line ×2, both radii, display font | brand ×3, surface ×3, fg ×3, line ×2 | page background (dark), type scale, glow, scanlines, panel border + shadow, button type |
| brutalist | brand ×3, surface ×3, fg ×3, line ×2, both radii | brand ×3, surface ×3, fg ×3, line ×2 | weight 700, heading type, button type + press, 3px panel border, focus ring |

Status colours are overridden only by the default dark block, and every theme's dark mode inherits them through `[data-mode="dark"]`, as in 2.1. The shadow overrides that 2.1 declares (and that never rendered, V2) are listed in F2.

### 4.3 Values that are not tokens

Tailwind's spacing, type and effect scales become literal values in recipe CSS, not tokens. That keeps the contract small, and mono's and retro's root font sizes still scale everything, because the literals stay in `rem`. P1 copies the exact values from this table:

| Tailwind 4.3.3 | Plain CSS |
|---|---|
| spacing `n` (`p-4`, `gap-2.5`, `mt-1.5`, `space-y-3`, `w-52`, …) | `calc(0.25rem * n)`, written as the result: `p-4` → `1rem`, `gap-2.5` → `0.625rem`, `w-52` → `13rem` |
| `text-xs` / `sm` / `lg` / `2xl` / `4xl` | `font-size: 0.75rem; line-height: calc(1 / 0.75)` · `0.875rem; calc(1.25 / 0.875)` · `1.125rem; calc(1.75 / 1.125)` · `1.5rem; calc(2 / 1.5)` · `2.25rem; calc(2.5 / 2.25)` |
| `font-normal` / `medium` / `semibold` / `bold` | `400` / `500` / `600` / `700` |
| `tracking-wide` / `wider` / `widest` | `0.025em` / `0.05em` / `0.1em` |
| `rounded` / `rounded-md` / `rounded-full` | `0.25rem` / `0.375rem` / `calc(infinity * 1px)` |
| `max-w-sm` / `max-w-md` | `24rem` / `28rem` |
| `shadow-sm` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` (the same value as `--q-shadow-panel` in `:root`, but a literal: it never changed per theme) |
| `backdrop-blur-sm` | `backdrop-filter: blur(8px)` (with `-webkit-` prefix) |
| `X/NN` colour opacity (`border-error/30`, `bg-surface-raised/80`) | `color-mix(in oklab, var(--q-color-error) 30%, transparent)` |
| `text-white` on brand | `var(--q-color-on-brand)` |
| `text-white` elsewhere (UserCard hover) | `var(--q-color-on-brand)` (it sits on `bg-brand`) |
| `transition` / `-colors` / `-opacity` / `-shadow` / `-transform` / `-all` | `150ms cubic-bezier(0.4, 0, 0.2, 1)` over the listed properties; `duration-300` → `300ms`. On `button`, `a` and `input` write none (§6.1 rule 9) |
| `scale-125`, `hover:scale-110`, `translate-x-0.5`, `dark:translate-x-5` | the individual properties `scale: 1.25`, `scale: 1.1`, `translate: 0.125rem 0`, `translate: 1.25rem 0`, never `transform:` (§6.1 rule 8) |
| `animate-pulse` | `animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite` with `@keyframes pulse { 50% { opacity: 0.5 } }` |
| `sm:` / `md:` / `lg:` / `xl:` | `@media (width >= 40rem)` / `48rem` / `64rem` / `80rem` |
| `hover:` | `@media (hover: hover) { &:hover { … } }` (Tailwind v4 wraps every `hover:` this way) |
| `dark:` | `:where([data-mode="dark"]) &` inside the block (zero specificity) |
| `placeholder:text-fg-faint` | `&::placeholder { color: var(--q-color-fg-faint) }` |
| `[&::-webkit-details-marker]:hidden` | `&::-webkit-details-marker { display: none }` |

### 4.4 `tokens.css` (parity port)

Generated from 2.1 `src/style.css` by renaming per §4.1, moving the non-token `background` declarations to `effects.css`, and leaving out the per-theme shadow overrides (V2). It is the file whose 220 values were checked against 2.1 (§1).

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;

@layer quiver.tokens {
  :root {
    /* ── Brand ──────────────────────────────────────── */
    --q-color-brand:       #f97316;
    --q-color-brand-hover: #ea580c;
    --q-color-brand-tint:  rgb(249 115 22 / 0.12);
    --q-color-on-brand:    #ffffff;

    /* ── Surface ─────────────────────────────────────── */
    --q-color-surface:         #f8fafc;
    --q-color-surface-raised:  #ffffff;
    --q-color-surface-inset:   #f1f5f9;

    /* ── Foreground ──────────────────────────────────── */
    --q-color-fg:       #0f172a;
    --q-color-fg-soft:  #64748b;
    --q-color-fg-faint: #94a3b8;

    /* ── Border ──────────────────────────────────────── */
    --q-color-line:        #e2e8f0;
    --q-color-line-strong: #334155;

    /* ── Status ──────────────────────────────────────── */
    --q-color-success:      #047857;
    --q-color-success-tint: #ecfdf5;
    --q-color-error:        #b91c1c;
    --q-color-error-tint:   #fef2f2;
    --q-color-warning:      #b45309;
    --q-color-warning-tint: #fffbeb;
    --q-color-info:         #1d4ed8;
    --q-color-info-tint:    #eff6ff;

    /* ── Shape ───────────────────────────────────────── */
    --q-radius-control: 0.75rem;
    --q-radius-panel:   1rem;

    /* ── Shadow ──────────────────────────────────────── */
    --q-shadow-panel: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    --q-shadow-float: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

    /* ── Typography ──────────────────────────────────── */
    --q-font-body:    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --q-font-display: Inter, ui-sans-serif, system-ui, sans-serif;
    --q-font-mono:    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }

  /* ═══════════════════════════════════════════════════
     DEFAULT — dark
  ═══════════════════════════════════════════════════ */
  [data-mode="dark"] {
    --q-color-surface:         #020617;
    --q-color-surface-raised:  #0f172a;
    --q-color-surface-inset:   #1e293b;
    --q-color-fg:              #f1f5f9;
    --q-color-fg-soft:         #94a3b8;
    --q-color-fg-faint:        #64748b;
    --q-color-line:            #1e293b;
    --q-color-line-strong:     #cbd5e1;
    --q-color-brand-tint:      rgb(249 115 22 / 0.15);
    --q-color-success:         #34d399;
    --q-color-success-tint:    #022c22;
    --q-color-error:           #f87171;
    --q-color-error-tint:      #450a0a;
    --q-color-warning:         #fbbf24;
    --q-color-warning-tint:    #451a03;
    --q-color-info:            #60a5fa;
    --q-color-info-tint:       #172554;
  }

  /* ═══════════════════════════════════════════════════
     MONOCHROME — light
  ═══════════════════════════════════════════════════ */
  [data-theme="mono"] {
    --q-color-brand:           #0a0a0a;
    --q-color-brand-hover:     #262626;
    --q-color-brand-tint:      rgb(10 10 10 / 0.08);
    --q-color-surface:         #ffffff;
    --q-color-surface-raised:  #f5f5f5;
    --q-color-surface-inset:   #e5e5e5;
    --q-color-fg:              #0a0a0a;
    --q-color-fg-soft:         #404040;
    --q-color-fg-faint:        #737373;
    --q-color-line:            #d4d4d4;
    --q-color-line-strong:     #404040;
    --q-radius-control:        0.375rem;
    --q-radius-panel:          0.5rem;
  }

  /* MONOCHROME — dark */
  [data-theme="mono"][data-mode="dark"] {
    --q-color-brand:           #fafafa;
    --q-color-brand-hover:     #e5e5e5;
    --q-color-brand-tint:      rgb(250 250 250 / 0.1);
    --q-color-surface:         #0a0a0a;
    --q-color-surface-raised:  #171717;
    --q-color-surface-inset:   #262626;
    --q-color-fg:              #fafafa;
    --q-color-fg-soft:         #a3a3a3;
    --q-color-fg-faint:        #525252;
    --q-color-line:            #262626;
    --q-color-line-strong:     #d4d4d4;
  }

  /* ═══════════════════════════════════════════════════
     LIQUID GLASS — light
  ═══════════════════════════════════════════════════ */
  [data-theme="glass"] {
    --q-color-brand:           #7c3aed;
    --q-color-brand-hover:     #6d28d9;
    --q-color-brand-tint:      rgb(124 58 237 / 0.1);
    --q-color-surface:         rgb(241 245 249 / 0.65);
    --q-color-surface-raised:  rgb(255 255 255 / 0.6);
    --q-color-surface-inset:   rgb(241 245 249 / 0.85);
    --q-color-fg:              #0f172a;
    --q-color-fg-soft:         #475569;
    --q-color-fg-faint:        #94a3b8;
    --q-color-line:            rgb(148 163 184 / 0.35);
    --q-color-line-strong:     rgb(71 85 105 / 0.5);
    --q-radius-control:        1.25rem;
    --q-radius-panel:          1.5rem;
  }

  /* LIQUID GLASS — dark */
  [data-theme="glass"][data-mode="dark"] {
    --q-color-brand:           #a78bfa;
    --q-color-brand-hover:     #c4b5fd;
    --q-color-brand-tint:      rgb(167 139 250 / 0.15);
    --q-color-surface:         rgb(2 6 23 / 0.65);
    --q-color-surface-raised:  rgb(15 23 42 / 0.55);
    --q-color-surface-inset:   rgb(30 41 59 / 0.8);
    --q-color-fg:              #e2e8f0;
    --q-color-fg-soft:         #94a3b8;
    --q-color-fg-faint:        #64748b;
    --q-color-line:            rgb(148 163 184 / 0.2);
    --q-color-line-strong:     rgb(203 213 225 / 0.3);
  }

  /* ═══════════════════════════════════════════════════
     RETRO / Y2K — light
  ═══════════════════════════════════════════════════ */
  [data-theme="retro"] {
    --q-color-brand:           #ec4899;
    --q-color-brand-hover:     #db2777;
    --q-color-brand-tint:      rgb(236 72 153 / 0.12);
    --q-color-surface:         #fefce8;
    --q-color-surface-raised:  #ffffff;
    --q-color-surface-inset:   #fef9c3;
    --q-color-fg:              #1c1917;
    --q-color-fg-soft:         #44403c;
    --q-color-fg-faint:        #78716c;
    --q-color-line:            #d6d3d1;
    --q-color-line-strong:     #57534e;
    --q-radius-control:        0px;
    --q-radius-panel:          0px;
    --q-font-display:          'Orbitron', monospace;
  }

  /* RETRO / Y2K — dark */
  [data-theme="retro"][data-mode="dark"] {
    --q-color-brand:           #a3e635;
    --q-color-brand-hover:     #84cc16;
    --q-color-brand-tint:      rgb(163 230 53 / 0.15);
    --q-color-surface:         #0d0221;
    --q-color-surface-raised:  #1a0533;
    --q-color-surface-inset:   #1e1b4b;
    --q-color-fg:              #e9d5ff;
    --q-color-fg-soft:         #c4b5fd;
    --q-color-fg-faint:        #8b5cf6;
    --q-color-line:            #3b1f6b;
    --q-color-line-strong:     #7c3aed;
  }

  /* ═══════════════════════════════════════════════════
     NEO BRUTALISM — light
  ═══════════════════════════════════════════════════ */
  [data-theme="brutalist"] {
    --q-color-brand:           #facc15;
    --q-color-brand-hover:     #eab308;
    --q-color-brand-tint:      rgb(250 204 21 / 0.2);
    --q-color-surface:         #ffffff;
    --q-color-surface-raised:  #ffffff;
    --q-color-surface-inset:   #f5f5f5;
    --q-color-fg:              #000000;
    --q-color-fg-soft:         #171717;
    --q-color-fg-faint:        #525252;
    --q-color-line:            #000000;
    --q-color-line-strong:     #000000;
    --q-radius-control:        0px;
    --q-radius-panel:          0px;
  }

  /* NEO BRUTALISM — dark */
  [data-theme="brutalist"][data-mode="dark"] {
    --q-color-brand:           #facc15;
    --q-color-brand-hover:     #fde047;
    --q-color-brand-tint:      rgb(250 204 21 / 0.2);
    --q-color-surface:         #000000;
    --q-color-surface-raised:  #0a0a0a;
    --q-color-surface-inset:   #171717;
    --q-color-fg:              #ffffff;
    --q-color-fg-soft:         #e5e5e5;
    --q-color-fg-faint:        #a3a3a3;
    --q-color-line:            #ffffff;
    --q-color-line-strong:     #ffffff;
  }
}
```

## 5. `base.css`

This replaces the parts of Tailwind's preflight that 2.1 relies on (spec §10, first pitfall), plus the two base rules from the end of 2.1's `style.css`. It's written for Quiver, using Tailwind v4 preflight and modern-normalize (both MIT) as the reference for which behaviours to keep.

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;

@layer quiver.base {
  *, ::before, ::after, ::backdrop, ::file-selector-button {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    border: 0 solid;
  }

  html {
    font-family: var(--q-font-body);
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    tab-size: 4;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit; }
  a { color: inherit; text-decoration: inherit; }
  b, strong { font-weight: bolder; }
  code, kbd, samp, pre { font-family: var(--q-font-mono); font-size: 1em; }
  small { font-size: 80%; }
  sub, sup { font-size: 75%; line-height: 0; position: relative; vertical-align: baseline; }
  sub { bottom: -0.25em; }
  sup { top: -0.5em; }
  hr { height: 0; color: inherit; border-top-width: 1px; }
  table { text-indent: 0; border-color: inherit; border-collapse: collapse; }
  ol, ul, menu { list-style: none; }
  summary { display: list-item; }

  img, svg, video, canvas, audio, iframe, embed, object { display: block; vertical-align: middle; }
  img, video { max-width: 100%; height: auto; }

  button, input, select, optgroup, textarea, ::file-selector-button {
    font: inherit;
    font-feature-settings: inherit;
    font-variation-settings: inherit;
    letter-spacing: inherit;
    color: inherit;
    border-radius: 0;
    background-color: transparent;
    opacity: 1;
  }
  button, input:where([type="button"], [type="reset"], [type="submit"]), ::file-selector-button {
    appearance: button;
  }
  ::placeholder { opacity: 1; color: color-mix(in oklab, currentcolor 50%, transparent); }
  textarea { resize: vertical; }
  ::-webkit-inner-spin-button, ::-webkit-outer-spin-button { height: auto; }
  ::-webkit-search-decoration { -webkit-appearance: none; }

  [hidden]:where(:not([hidden="until-found"])) { display: none !important; }

  /* From 2.1's base section: one transition for every interactive element */
  button, a, input {
    transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease;
  }
}
```

Notes:

- **`border: 0 solid` stays.** It's why `border-width: 1px` alone draws a border, and every ported component relies on it. It's also the cause of V4.
- **`body` smoothing** replaces `class="antialiased"` on `<body>` in `index.html`, so the starter's markup carries no class (R7 grep, and one less thing to copy).
- **Left out on purpose**, because nothing in 2.1 uses them: the `abbr`, `progress`, `select[multiple]` and `::-webkit-datetime-*` rules, `:-moz-focusring` and `:-moz-ui-invalid`. An app that needs them adds them.
- **Apps with their own reset** (Audition has `app.css`) skip `base.css`. Recipes then still render, but spacing and button chrome follow the app's reset. The theme recipe README says so.

## 6. Recipe CSS pattern and class naming

### 6.1 Rules

These are written to be checked in review (and partly by a P7 test).

1. **Header.** Every Quiver stylesheet's first line is the layer statement from §3.1. All rules sit in exactly one sub-layer block. `@font-face` sits outside layers.
2. **Zero specificity.** Every selector's block part is wrapped in `:where()`. State and variant rules nest under it with `&`: `:where(.q-toast) { &[data-type="error"] { … } }`. Always write the `&` (nesting without it needs Chrome 120; with it, 112).
3. **Names.** Recipe classes are `q-<block>` and `q-<block>__<element>`, in kebab-case. One block per recipe, named after it (`q-toasts`, `q-toast`, `q-menu`, `q-theme-select`).
4. **No modifier classes.** Variants and state are attributes: ARIA where one fits (`aria-current`, `aria-pressed`, `aria-expanded`), else `data-*` (`data-type`, `data-state`, `data-tone`, `data-variant`). Classes name things; attributes describe them (D6).
5. **Tokens for themeable values.** Colours, radii, shadows and font stacks come only from `--q-*` tokens. Spacing, sizes, weights and durations are literals in `rem`, `em` and `ms` (§4.3). No hex colours, except theme swatches (§6.3).
6. **Hover** is always inside `@media (hover: hover)`, as Tailwind v4 compiled it.
7. **Breakpoints** are the four `rem` widths in §4.3, written as range queries. No custom properties in media queries (they don't work there).
8. **Transforms** use the individual `translate`, `scale` and `rotate` properties, as Tailwind v4 did. A `transform:` in a component would collide with the brutalist press effect, which uses `transform`.
9. **No `transition` on `button`, `a` or `input`.** `base.css` owns it, as the unlayered base rule did in 2.1. Other elements (the mode toggle's thumb, toasts) may set their own.
10. **Theme-specific tweaks of one component** (2.1's `theme-brutalist:border-2` in markup) live in that component's CSS as `[data-theme="brutalist"] :where(.block) { … }`. Theme-wide effects live in `effects.css` (§7).
11. **Motion** has a `@media (prefers-reduced-motion: reduce)` rule wherever the recipe animates (D31).
12. **Hooks.** An element that 2.1's effect rules styled carries the matching hook class from §7.1 (`q-panel`, `q-sidebar`, `q-header`, `q-accent`), next to its own class.

**Browser floor.** Native nesting with `&` needs Chrome/Edge 112, and `color-mix()` needs Chrome 111. Core's floor is Chrome/Edge 102 (D11), so recipe CSS needs a slightly newer Chromium than core does. Safari 26.2 and Firefox 147 support both. P8's docs state both floors (N39).

### 6.2 Example: the toast recipe

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;

@layer quiver.components {
  :where(.q-toasts) {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }

  :where(.q-toast) {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    width: 20rem;
    padding: 0.75rem 1rem;
    border-width: 1px;
    border-radius: var(--q-radius-panel);
    box-shadow: var(--q-shadow-float);
    font-size: 0.875rem;
    line-height: calc(1.25 / 0.875);
    animation: q-toast-in 0.2s ease-out;

    &[data-type="success"] { border-color: color-mix(in oklab, var(--q-color-success) 30%, transparent); background-color: var(--q-color-success-tint); color: var(--q-color-success); }
    &[data-type="error"]   { border-color: color-mix(in oklab, var(--q-color-error) 30%, transparent);   background-color: var(--q-color-error-tint);   color: var(--q-color-error); }
    &[data-type="warning"] { border-color: color-mix(in oklab, var(--q-color-warning) 30%, transparent); background-color: var(--q-color-warning-tint); color: var(--q-color-warning); }
    &[data-type="info"]    { border-color: color-mix(in oklab, var(--q-color-info) 30%, transparent);    background-color: var(--q-color-info-tint);    color: var(--q-color-info); }
    &[data-state="closing"] { animation: q-toast-out 0.2s ease-in forwards; }
  }

  :where(.q-toast__message) { flex: 1; }

  :where(.q-toast__dismiss) {
    flex-shrink: 0;
    opacity: 0.6;
    @media (hover: hover) { &:hover { opacity: 1; } }
  }

  @keyframes q-toast-in  { from { opacity: 0; translate: 0 0.5rem; } to { opacity: 1; translate: 0 0; } }
  @keyframes q-toast-out { from { opacity: 1; translate: 0 0; } to { opacity: 0; translate: 0 0.5rem; } }

  @media (prefers-reduced-motion: reduce) {
    :where(.q-toast) { animation: none; &[data-state="closing"] { animation: none; } }
  }
}
```

The markup is `<div class="q-toasts">` holding `<div class="q-toast q-panel" role="alert" data-type="error" data-state="open">` with `q-toast__message` and `q-toast__dismiss` inside. With no animation, D31's `getAnimations()` wait resolves at once, so reduced motion and missing CSS both still remove the toast. (Keyframes use `translate`, which renders the same as 2.1's `transform: translateY()` on an element with no other transform.)

### 6.3 Class map for the recipes

| 2.1 component | v3 recipe classes (hook classes in brackets) | State and variants |
|---|---|---|
| `ToastContainer` | `q-toasts` · `q-toast` [`q-panel`] · `q-toast__message` · `q-toast__dismiss` | `data-type="success\|error\|warning\|info"`, `data-state="open\|closing"` |
| `ThemeSelector` | `q-theme-select` · `q-theme-select__swatch` | `aria-pressed`. Swatch colour from an inline custom property, `style="--swatch: #f97316"`, with `--swatch-dark` for mono's `#fafafa`. The `THEMES` entries become `{ id, label, swatch, swatchDark? }`, so `/add-theme` adds one line |
| `ThemeToggle` | `q-mode-toggle` · `q-mode-toggle__thumb` | dark mode via `:where([data-mode="dark"]) &` |
| `Link` | none of its own: it passes the caller's `class` through and sets `aria-current="page"` (D18) | – |
| `MenuLayout` | `q-menu` · `q-menu__sidebar` [`q-sidebar`] · `q-menu__brand` · `q-menu__logo` · `q-menu__tagline` · `q-menu__nav` · `q-menu__nav-link` · `q-menu__footer` · `q-menu__body` · `q-menu__header` [`q-header`] · `q-menu__path` · `q-menu__actions` · `q-menu__content` | nav link active via `&[aria-current="page"]` |
| user menu (in `MenuLayout`) | `q-user-menu` · `q-user-menu__summary` · `q-user-menu__avatar` · `q-user-menu__email` · `q-user-menu__chevron` · `q-user-menu__panel` [`q-panel`] · `q-user-menu__identity` · `q-user-menu__name` · `q-user-menu__meta` · `q-user-menu__item` | open state via `<details open>`: `:where(.q-user-menu)[open]` |
| `BasicLayout` | `q-basic` · `q-basic__card` [`q-panel`] | – |
| `LoadingCard`, `ErrorCard` | `q-view` · `q-view__card` [`q-panel`] · `q-view__title` · `q-view__text` · `q-view__action` | `data-tone="error"` on `q-view__card` |

The recipe class names are part of what apps copy, so P7 treats them as stable once 3.0 ships.

### 6.4 Starter classes

Starter-only components and pages (dashboard, team, profile, posts, toasts demo, login, 404, `Counter`, `UserCard`) are app code, so they don't use the `q-` prefix. They follow the same rules otherwise (§6.1, rules 2–12): BEM-style names such as `page`, `page__title`, `chip`, `card`, `btn`, `field`, `metric`, `user-card`, `post`, and attributes for variants (`<span class="chip" data-tone="brand">`, `<button class="btn" data-variant="primary">`).

The starter's CSS goes in `@layer quiver.components`, so the theme effects still apply on top of it, as they did over the 2.1 utilities. Each element must carry the hook classes from §7.1 exactly where 2.1 had the selector the hook replaces. P1 picks the remaining starter names; this file fixes only the hooks.

## 7. Theme effects

### 7.1 Hooks

2.1's effect rules select `.rounded-panel`, `article`, `aside`, `header.sticky` and `.text-brand`. v3 effects never select app elements by tag or by a utility name. They select four hook classes instead, plus `<html>`, `h1`–`h3`, `button` and `:focus-visible` (theme-wide typography and focus are what a theme is for).

| Hook | Replaces 2.1 selector | Must be on |
|---|---|---|
| `q-panel` | `.rounded-panel`, `article` (every `article` in 2.1 is also `.rounded-panel`) | toasts, user-menu panel, basic-layout card, loading/error cards; starter: metric cards, counters, user cards, the profile card, the "user not found" alert, the posts success/error alerts, skeleton cards, post cards, the two panels on the toasts page |
| `q-sidebar` | `aside` | the menu-layout sidebar |
| `q-header` | `header.sticky` | the menu-layout header |
| `q-accent` | `.text-brand` | every element that had the `text-brand` class: the brand chips and section tags, the metric's `userState.users.length`, the profile's `:id` value, the login wordmark, the `BasicLayout` code, the required-field asterisks, the 404 code, and the user card's "View profile" button. **Not** the active nav link (its brand colour came from an `[aria-current]` variant, so it never glowed) |

### 7.2 `effects.css` (parity port)

```css
@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;

@font-face {
  font-family: 'Orbitron';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./fonts/orbitron-700-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* VT323 400 and Space Grotesk 700: same shape, files vt323-400-latin.woff2 and space-grotesk-700-latin.woff2 */

@layer quiver.effects {
  /* ── Liquid Glass ─────────────────────────────── */
  [data-theme="glass"] {
    background: linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 50%, #fce7f3 100%);
    background-attachment: fixed;
    font-weight: 450;
    letter-spacing: -0.01em;

    & :where(h1, h2, h3) { font-weight: 700; letter-spacing: -0.025em; line-height: 1.2; }

    & :where(.q-panel, .q-sidebar) {
      -webkit-backdrop-filter: blur(20px) saturate(160%) brightness(1.05);
      backdrop-filter: blur(20px) saturate(160%) brightness(1.05);
      background-image: linear-gradient(180deg, rgb(255 255 255 / 0.15) 0%, transparent 40%);
    }

    & :where(.q-header) {
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      backdrop-filter: blur(20px) saturate(160%);
    }
  }

  [data-theme="glass"][data-mode="dark"] {
    background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
    background-attachment: fixed;

    & :where(.q-panel, .q-sidebar) {
      background-image: linear-gradient(180deg, rgb(255 255 255 / 0.07) 0%, transparent 40%);
    }
  }

  /* ── Retro / Y2K ──────────────────────────────── */
  [data-theme="retro"] {
    /* 2.1 also declared font-family: 'VT323' here; it never applied (V1, see F1) */
    font-size: 1.0625rem;
    letter-spacing: 0.02em;
    line-height: 1.6;

    &::after {
      content: '';
      position: fixed;
      inset: 0;
      background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgb(0 0 0 / 0.08) 3px, rgb(0 0 0 / 0.08) 4px);
      pointer-events: none;
      z-index: 9998;
    }

    & :where(h1, h2, h3) {
      font-family: var(--q-font-display);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-shadow:
        0 0 8px var(--q-color-brand),
        0 0 16px var(--q-color-brand),
        0 0 32px color-mix(in srgb, var(--q-color-brand) 40%, transparent);
    }

    & :where(.q-accent) {
      text-shadow: 0 0 6px currentColor, 0 0 12px color-mix(in srgb, currentColor 50%, transparent);
    }

    & :where(.q-panel) {
      border-width: 2px;
      /* 2.1's var(--shadow-panel) in retro light; F2 turns this back into var(--q-shadow-panel) */
      box-shadow: 2px 2px 0 0 var(--q-color-line-strong), 0 0 14px color-mix(in srgb, var(--q-color-brand) 30%, transparent);
    }

    & :where(button) {
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-family: 'VT323', monospace;
      font-size: 1rem;
    }
  }

  [data-theme="retro"][data-mode="dark"] {
    background: #0d0221;

    & :where(.q-panel) {
      box-shadow: 2px 2px 0 0 var(--q-color-brand), 0 0 14px color-mix(in srgb, var(--q-color-brand) 30%, transparent);
    }
  }

  /* ── Monochrome ───────────────────────────────── */
  [data-theme="mono"] {
    font-size: 0.9375rem;
    letter-spacing: 0.01em;
    line-height: 1.5;

    & :where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; line-height: 1.25; }
    & :focus-visible { outline: 2px solid var(--q-color-fg); outline-offset: 2px; }
  }

  /* ── Neo Brutalism ────────────────────────────── */
  [data-theme="brutalist"] {
    /* 2.1 also declared font-family: 'Space Grotesk' (V1, see F1) and
       -webkit-font-smoothing: auto (V5, overridden by body); neither applied */
    font-weight: 700;

    & :where(h1, h2, h3) { font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; line-height: 1.1; }

    & :where(button) {
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      transition: transform 80ms ease, box-shadow 80ms ease;
    }
    & :where(button):active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 0 var(--q-color-line); }

    & :where(.q-panel, .q-sidebar) { border-width: 3px; }
    & :focus-visible { outline: 3px solid var(--q-color-fg); outline-offset: 0; }
  }
}
```

### 7.3 How each 2.1 effect ports

| 2.1 rule | v3 | Why the result is the same |
|---|---|---|
| `[data-theme="glass"] { background… }` inside the token block | `effects.css`, same selector | not a token; moved |
| `[data-theme="glass"] .rounded-panel, article, aside` | `[data-theme="glass"] :where(.q-panel, .q-sidebar)` | hooks cover the same elements (§7.1); `quiver.effects` beats `quiver.components` as unlayered beat `utilities` |
| `[data-theme="glass"] header.sticky` | `… :where(.q-header)` | same |
| `[data-theme="retro"] { font-family: VT323 }` | not ported (parity) | it never applied (V1) |
| `[data-theme="retro"] .text-brand` | `… :where(.q-accent)` | same elements |
| `[data-theme="retro"] .rounded-panel, article` | `… :where(.q-panel)`, with the retro shadow written out | retro's `--q-shadow-panel` override is left out of tokens (V2), so the rule spells out the value it had |
| `[data-theme="retro"] button`, `h1–h3`, `::after` | same, with `:where()` around the element | – |
| `[data-theme="mono"] *:focus-visible` | `[data-theme="mono"] :focus-visible` | same match; still beats `outline: none` on inputs, as in 2.1 |
| `[data-theme="brutalist"] { font-family; -webkit-font-smoothing }` | not ported (parity) | neither applied (V1, V5) |
| `[data-theme="brutalist"] .rounded-panel, article, aside { border-width: 3px }` | `… :where(.q-panel, .q-sidebar)` | includes the sidebar's four-sided border (V4; F4 fixes it) |
| markup `theme-brutalist:border-2 theme-brutalist:border-fg` on primary buttons | starter CSS: `[data-theme="brutalist"] :where(.btn)[data-variant="primary"] { border: 2px solid var(--q-color-fg) }` | component tweak (§6.1 rule 10) |
| markup `theme-brutalist:border-2` on panels, `theme-glass:backdrop-blur-md` | not ported | dead in 2.1 (V5) |
| `@variant dark` / `theme-glass` / `theme-brutalist` | gone | replaced by attribute selectors |

## 8. Screenshot baseline plan

### 8.1 What is captured

Every capture runs in 5 themes × 2 modes.

| # | State | How it's reached | Desktop | Mobile |
|---|---|---|---|---|
| 1 | Dashboard | `/` | ✓ | ✓ |
| 2 | Dashboard, user menu open | `/`, click the user-menu summary | ✓ | |
| 3 | Team | `/users` | ✓ | ✓ |
| 4 | Profile | `/users`, click the first "View profile" | ✓ | ✓ |
| 5 | Profile, user not found | `/users/missing` | ✓ | |
| 6 | Posts, loaded | `/posts` with the API mocked | ✓ | ✓ |
| 7 | Posts, error | `/posts`, click "Force error" | ✓ | |
| 8 | Toasts page | `/toasts` | ✓ | ✓ |
| 9 | Toasts page with one toast of each type | set duration to 0, click Success, Error, Warning, Info | ✓ | |
| 10 | Sign in | `/login` | ✓ | ✓ |
| 11 | Sign in, validation errors | `/login`, click "Sign in" with empty fields | ✓ | |
| 12 | Not found | `/does-not-exist` | ✓ | ✓ |

- **Desktop** is 1280×800, which crosses all four breakpoints (the `lg` sidebar layout and `xl` three-column grids). **Mobile** is 390×844, below `sm`. It's a plain viewport, not device emulation, so `hover: hover` matches as on desktop.
- **Count:** (12 + 7) states × 10 = **190 PNGs**, all `fullPage: true`.
- State 9 uses permanent toasts (duration 0). D35's "no live toasts" is about timed toasts that could vanish mid-capture; these don't move once shown, and the toast recipe is too visible to leave untested. Cas can drop the state (§10).
- **Not captured:** the loading and error views. Loading is transient, and 2.1 has no route that reaches `ErrorCard`. P3 replaces both with injected views anyway, and P7's recipe tests cover them.

### 8.2 Making captures deterministic

| Source of noise | Control |
|---|---|
| Fonts arriving late | Self-hosted woff2 (no network), and `await page.evaluate(() => document.fonts.ready)` after the state is reached |
| Animations, transitions, caret | `animations: 'disabled'` (finishes transitions, freezes the toast entry and the skeleton pulse), `caret: 'hide'` |
| Hover left over from a click | `await page.mouse.move(0, 0)` before capturing |
| Network data (`/posts`) | `page.route()` serves `tests/visual/fixtures/posts.json` (the 12 posts the page shows, captured once) for `…/posts`, and a 404 for `…/does-not-exist-404` |
| Random UUIDs on the profile page | `mask` the header path and the `:id` value (same `maskColor` everywhere) |
| Stored theme | `addInitScript` writes `ui-theme` and `ui-mode` to `localStorage` before the page script reads them |
| Device pixel ratio | 1 (Playwright's default); `scale: 'css'` |
| OS fonts behind `ui-sans-serif` / `system-ui` / `ui-monospace` (V6) | the pinned container below |

A sketch of the spec file:

```js
// tests/visual/parity.test.js
import { test, expect } from '@playwright/test'
import posts from './fixtures/posts.json' with { type: 'json' }
import { STATES } from './states.js'      // the §8.1 table: { name, path, mobile, ready(page), mask(page) }

const THEMES = ['default', 'mono', 'glass', 'retro', 'brutalist']
const MODES = ['light', 'dark']

for (const state of STATES) for (const theme of THEMES) for (const mode of MODES) {
  test(`${state.name} · ${theme} · ${mode}`, async ({ page }, info) => {
    test.skip(info.project.name === 'visual-mobile' && !state.mobile)
    await page.addInitScript(([t, m]) => {
      localStorage.setItem('ui-theme', t)
      localStorage.setItem('ui-mode', m)
    }, [theme, mode])
    await page.route('https://jsonplaceholder.typicode.com/posts', (r) => r.fulfill({ json: posts }))
    await page.route('https://jsonplaceholder.typicode.com/does-not-exist-404', (r) => r.fulfill({ status: 404, json: {} }))
    await page.goto(state.path)
    await state.ready(page)
    await page.mouse.move(0, 0)
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot(`${state.name}/${theme}-${mode}.png`, {
      fullPage: true,
      mask: state.mask?.(page) ?? [],
    })
  })
}
```

`playwright.config.js` gets two projects for this folder, `visual-desktop` and `visual-mobile`, beside the e2e projects (`e2e` in P1; TECH-SPEC CI-2's `root` and `subpath` once P3 lands):

```js
expect: {
  toHaveScreenshot: { threshold: 0.02, maxDiffPixelRatio: 0.0001, animations: 'disabled', caret: 'hide', scale: 'css' },
},
snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
```

Scripts: `test:e2e` runs only the e2e projects, so §9 rule 4's command is unchanged and doesn't fail on macOS, and a new `test:visual` runs the two visual projects.

### 8.3 Where it runs

- **Pinned image.** TECH-SPEC §7's `screenshots` job runs in `mcr.microsoft.com/playwright:v1.63.0-noble`, the official image for the Playwright version in `bun.lock`. It fixes Chromium and the system fonts behind the fallback stacks (V6). A plain `ubuntu-latest` runner changes its font packages when GitHub updates the image, which would break the baseline for reasons unrelated to Quiver. The tag moves with the Playwright version in `bun.lock`, and a Playwright upgrade means re-capturing the baseline in the same PR. This is a CI image, not a package dependency, but §10 asks Cas to confirm it.
- **Capturing the baseline.** The workflow gets a `workflow_dispatch` input, `update-screenshots`. When it's set, the job runs `test:visual --update-snapshots` and commits `tests/visual/__screenshots__/` back to the branch it ran on, with `contents: write` for that job only. It refuses to run on `main`. That's how P1 gets a Linux baseline without anyone capturing on a laptop (D35: macOS captures don't match Linux).
- **Local runs** on another OS are expected to differ. `test:visual` is for CI; to reproduce locally, run the same image with Docker.

### 8.4 P1 commit order

1. `chore`: self-host the four fonts (woff2, latin subset, the same Google Fonts versions 2.1 loads, with each family's OFL file), replacing the `@import` in `style.css`. Nothing else changes.
2. `test`: add the visual suite, the posts fixture, the config and the CI job; dispatch the workflow on the P1 branch to commit the baseline captured from the 2.1 CSS.
3. The port, in as many commits as P1 likes: `tokens.css`, `base.css`, `effects.css`, recipe and starter CSS, markup, then removing Tailwind. The `screenshots` job must pass with the baseline from step 2, unchanged.
4. Only if Cas picks the fix option (§2): one `fix(theme)` commit applying F1–F4, which re-runs the capture and commits the new PNGs. The PR then shows the visual change as an image diff that Cas reviews.

### 8.5 Tolerance (for Cas to approve, D35)

**Proposal: `threshold: 0.02`, `maxDiffPixelRatio: 0.0001`.**

- `threshold` is the per-pixel colour distance (0 to 1) below which Playwright treats two pixels as equal. Its default is 0.2.
- `maxDiffPixelRatio` is the share of pixels allowed to differ: 0.0001 is about 100 pixels on a 1280×800 capture, and about 33 on a 390×844 one, more on taller full-page captures.

Why these numbers. Because a faithful port can be pixel-identical (§1), the tolerance only needs to absorb noise, and the measured noise is zero. The probes below changed one thing on the dashboard and counted differing pixels:

| Change | Pixels changed at threshold 0 | Caught at 0.02 / 0.0001? |
|---|---|---|
| Card border 1px → 2px | 8,818 | yes |
| One card's padding +1px | 8,803 | yes |
| Card border colour `#e2e8f0` → `#dfe7f0` (barely visible) | 1,597 | no: under the 0.02 colour distance |
| Card shadow alpha 0.10 → 0.14 | 5,056 | yes (868 pixels above 0.02) |
| `h1` letter-spacing +0.01em | 116 | yes, just (110 pixels above 0.02, against an allowance of about 102) |
| Same page, captured again (30 runs) | 0 | – |

So the proposal catches any layout shift and any visible colour or shadow change, and lets through only changes too small to see. P1 can't loosen it (D35). If Cas wants it stricter, `threshold: 0` and `maxDiffPixelRatio: 0` also held across all 30 repeat runs, at the cost of failing on a future Chromium anti-aliasing tweak.

## 9. Fix list (F1–F4)

These apply only if Cas picks the fix option in §2. Each one changes token values or one effect rule, and none changes a recipe's markup or class names.

| # | Fixes | Change | Screenshots that change |
|---|---|---|---|
| F1 | V1 theme body fonts | `tokens.css`: retro light block gets `--q-font-body: 'VT323', monospace`; brutalist light block gets `--q-font-body: 'Space Grotesk', Inter, sans-serif` | retro, brutalist (all states) |
| F2 | V2 theme shadows | `tokens.css`: put back 2.1's eight shadow override pairs (below); `effects.css`: both retro `.q-panel` rules use `var(--q-shadow-panel)` instead of the written-out value | mono, glass, brutalist (panels, toasts, buttons, menus); retro (buttons only) |
| F3 | V3 text on brand | `tokens.css`: `--q-color-on-brand` is `#0a0a0a` in mono dark, `#0d0221` in retro dark, `#000000` in brutalist light and dark. Contrast goes from 1.04 / 1.51 / 1.53 to 18.97 / 13.29 / 13.71 | mono dark, retro dark, brutalist (brand buttons) |
| F4 | V4 brutalist sidebar | `effects.css`: `[data-theme="brutalist"] :where(.q-sidebar) { border-width: 0 0 3px; @media (width >= 64rem) { border-width: 0 3px 0 0; } }`, and `.q-sidebar` comes out of the shared 3px rule | brutalist (menu-layout states) |

F2's values, exactly as 2.1 declares them:

| Theme | `--q-shadow-panel` | `--q-shadow-float` |
|---|---|---|
| mono light | `0 1px 2px 0 rgb(0 0 0 / 0.08)` | `0 4px 8px 0 rgb(0 0 0 / 0.12)` |
| mono dark | `0 1px 2px 0 rgb(0 0 0 / 0.3)` | `0 4px 8px 0 rgb(0 0 0 / 0.4)` |
| glass light | `0 8px 32px 0 rgb(31 38 135 / 0.12)` | `0 16px 48px 0 rgb(31 38 135 / 0.18)` |
| glass dark | `0 8px 32px 0 rgb(0 0 0 / 0.3)` | `0 16px 48px 0 rgb(0 0 0 / 0.4)` |
| retro light | `2px 2px 0 0 var(--q-color-line-strong)` | `4px 4px 0 0 var(--q-color-line-strong)` |
| retro dark | `2px 2px 0 0 var(--q-color-brand)` | `4px 4px 0 0 var(--q-color-brand)` |
| brutalist light | `4px 4px 0 0 #000000` | `6px 6px 0 0 #000000` |
| brutalist dark | `4px 4px 0 0 #ffffff` | `6px 6px 0 0 #ffffff` |

Left alone on purpose: white text on the default orange (2.8:1) and on glass-dark violet (2.72:1) is low contrast too, but it's the brand look Cas chose, so changing it would be a redesign.

## 10. Open questions for Cas

1. **The 2.1 bugs (V1–V4).** Port and then fix in P1 (recommended), keep them, or port the intended look. Asked on the decision card in the Design thread.
2. **Sub-layers (§3.1).** Every stylesheet starts with `@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;` instead of D29's `@layer quiver;`. Same promise to apps; needed so theme effects reliably beat recipe states.
3. **Tolerance (§8.5).** `threshold: 0.02`, `maxDiffPixelRatio: 0.0001`.
4. **CI image (§8.3).** The `screenshots` job runs in `mcr.microsoft.com/playwright:v1.63.0-noble` (TECH-SPEC §7 currently says "same as `e2e`", i.e. a plain runner; this would change that row) and can commit a re-captured baseline to a non-`main` branch when dispatched.
5. **Toast state (§8.1, state 9).** Keep one capture with permanent toasts, or drop it to follow D35's "no live toasts" literally.
6. **`effects.css` in the theme recipe (§3.2).** D30 names `tokens.css` and `base.css`. This adds an optional third file for the per-theme effects and their fonts.
