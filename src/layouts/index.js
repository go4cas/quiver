import { BasicLayout } from './BasicLayout.js'
import { MenuLayout } from './MenuLayout.js'

/** @type {Record<string, (content: unknown) => import('@arrow-js/core').ArrowTemplate>} */
export const layouts = {
  basic: BasicLayout,
  menu: MenuLayout,
}
