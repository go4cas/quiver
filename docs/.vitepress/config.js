import { defineConfig } from 'vitepress'
import { createRequire } from 'module'

// Read the version at build time so the navbar badge can never drift
// from package.json — the release flow bumps it before tagging.
const pkg = createRequire(import.meta.url)('../../package.json')

export default defineConfig({
  title: 'Quiver',
  description: 'Arrow.js + Vite + Tailwind CSS starter template',
  base: '/quiver/',
  ignoreDeadLinks: [/localhost/],

  head: [
    ['link', { rel: 'icon', href: '/quiver/favicon.svg', type: 'image/svg+xml' }],
  ],

  markdown: {
    theme: {
      light: 'github-dark-dimmed',
      dark: 'github-dark-dimmed',
    },
  },

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: false,

    search: {
      provider: 'local',
    },

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/framework' },
      { text: `v${pkg.version}`, link: 'https://github.com/go4cas/quiver/releases' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Why Quiver',      link: '/guide/why-quiver' },
            { text: 'AI Tooling',      link: '/guide/ai' },
            { text: 'Feature Workflow', link: '/guide/workflow' },
            { text: 'Components',      link: '/guide/components' },
            { text: 'State',           link: '/guide/state' },
            { text: 'Routing',         link: '/guide/routing' },
            { text: 'Layouts',         link: '/guide/layouts' },
            { text: 'Theming',         link: '/guide/theming' },
            { text: 'Composables',     link: '/guide/composables' },
            { text: 'Testing',         link: '/guide/testing' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
            { text: 'Contributing',    link: '/guide/contributing' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Framework',   link: '/api/framework' },
            { text: 'Router',      link: '/api/router' },
            { text: 'Composables', link: '/api/composables' },
            { text: 'Components',  link: '/api/components' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/go4cas/quiver' },
      {
        icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><path d="M12.747 16.273h-7.46L18.925 1.5l-3.671 10.227h7.46L9.075 26.5l3.671-10.227z"/></svg>' },
        link: 'https://stackblitz.com/github/go4cas/quiver',
        ariaLabel: 'Open in StackBlitz',
      },
    ],
  },
})
