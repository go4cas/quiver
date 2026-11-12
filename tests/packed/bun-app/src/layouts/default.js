import { html } from '@arrow-js/core'
import { inject, url } from '@go4cas/quiver'

/** @typedef {{ to: string, label: string }} NavItem */

// The layout for every page without `meta.layout` (D38). Its links come from
// the pages' `meta.nav`, which the build collects into the 'nav' key.
/** @param {import('@arrow-js/core').ArrowRenderable} content */
export default function DefaultLayout(content) {
  const nav = /** @type {NavItem[]} */ (inject('nav', []))
  const { name } = /** @type {{ name: string }} */ (inject('app', { name: '' }))
  return html`
    <header data-testid="layout"><strong>${name}</strong></header>
    <nav>${nav.map((item) => html`<a href="${url(item.to)}">${item.label}</a>`.key(item.to))}</nav>
    <main>${content}</main>
  `
}
