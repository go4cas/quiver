import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-info-before': () =>
        h('img', {
          src: '/quiver/logo.svg',
          alt: 'Quiver',
          style: 'height: 96px; width: auto; margin-bottom: 1.5rem;',
        }),
    })
  },
}
