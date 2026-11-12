// Shared typedefs for @go4cas/quiver (TECH-SPEC §9). JSDoc only, no runtime code.
// Apps import them as `/** @typedef {import('@go4cas/quiver').RouteManifest} RouteManifest */`.

/** @typedef {import('@arrow-js/core').ArrowRenderable} Renderable */

/** @typedef {{ default: Page, meta?: PageMeta }} PageModule */
/** @typedef {() => PageModule | Promise<PageModule>} RouteLoader */
/** @typedef {Record<string, RouteLoader>} RouteManifest */
/** @typedef {() => Renderable} Page */
/** @typedef {{ layout?: string, title?: string, [key: string]: unknown }} PageMeta */
/** @typedef {(content: Renderable) => Renderable} Layout */
/** @typedef {() => Renderable} LoadingView */
/** @typedef {{ message: string, error: unknown, retry: () => Promise<void> }} ErrorViewProps */
/** @typedef {(props: ErrorViewProps) => Renderable} ErrorView */

/**
 * @typedef {Object} InitRouterOptions
 * @property {RouteManifest} routes   pattern → loader
 * @property {RouteLoader} [notFound] loader for unmatched paths
 * @property {string} [base]          absolute pathname, e.g. '/api/custom/app/'
 * @property {MiddlewareManifest} [middleware] global and section guards, run after beforeEach (C-70, C-71)
 */

/**
 * @typedef {Object} CreateAppOptions
 * @property {Element | string} target          element, or a selector for document.querySelector
 * @property {Record<string, Layout>} [layouts]  default {}
 * @property {string} [defaultLayout]            default 'default'
 * @property {LoadingView} [loading]             default `<p>Loading…</p>`
 * @property {ErrorView} [error]                 default `<p role="alert">message</p>`
 */

/**
 * Options for the two-argument `createApp(app, options)` (TECH-SPEC §12.4, C-73).
 * @typedef {Object} AppOptions
 * @property {Element | string} target          element, or a selector for document.querySelector
 * @property {string} [base]                    as InitRouterOptions.base
 * @property {Record<string, Layout>} [layouts] merged over app.layouts
 * @property {string} [defaultLayout]           default 'default'
 * @property {LoadingView} [loading]            wins over app.views.loading
 * @property {ErrorView} [error]                wins over app.views.error
 */

/** @typedef {{ destroy: () => void }} App */

/** @typedef {{ from: string | null, to: string }} GuardContext */
/** @typedef {false | string | void | undefined | null | true} GuardResult */
/** @typedef {(ctx: GuardContext) => GuardResult | Promise<GuardResult>} NavigationGuard */

/** @typedef {'ready' | 'not-found' | 'error'} FinalStatus */
/** @typedef {{ from: string | null, to: string, status: FinalStatus }} AfterEachContext */
/** @typedef {(ctx: AfterEachContext) => void} AfterEachHook */

/** @typedef {'guard' | 'load' | 'render'} ErrorPhase */
/** @typedef {{ error: unknown, from: string | null, to: string, phase: ErrorPhase }} ErrorContext */
/** @typedef {(ctx: ErrorContext) => void} ErrorHook */

/**
 * Middleware for `initRouter()` (TECH-SPEC §12.2, M-20, M-21): global guards run
 * on every navigation; a section's guards run for routes under its pattern.
 * @typedef {{ global?: NavigationGuard[], sections?: Record<string, NavigationGuard[]> }} MiddlewareManifest
 */

/** @typedef {{ to: string, label: string }} NavItem */

/**
 * The app manifest the `quiver:app` module exports (TECH-SPEC §12.2, D42).
 * @typedef {Object} AppManifest
 * @property {RouteManifest} routes
 * @property {RouteLoader} [notFound]
 * @property {Record<string, Layout>} layouts
 * @property {MiddlewareManifest} middleware
 * @property {{ loading?: LoadingView, error?: ErrorView }} views
 * @property {NavItem[]} nav
 * @property {Record<string, unknown>} config
 */

/** @typedef {'idle' | 'loading' | 'ready' | 'not-found' | 'error'} RouteStatus */
/** @typedef {string | (() => string)} MetaValue */

export {}
