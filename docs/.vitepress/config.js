import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Quiver',
  description: 'Arrow.js + Vite + Tailwind CSS starter template',

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
  ],

  markdown: {
    theme: {
      light: 'github-dark-dimmed',
      dark: 'github-dark-dimmed',
    },
  },

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/framework' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Feature Workflow', link: '/guide/workflow' },
            { text: 'Routing',         link: '/guide/routing' },
            { text: 'Layouts',         link: '/guide/layouts' },
            { text: 'State',           link: '/guide/state' },
            { text: 'Composables',     link: '/guide/composables' },
            { text: 'Testing',         link: '/guide/testing' },
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
    ],
  },
})
