import { defineConfig } from 'vitepress'

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
    search: {
      provider: 'local',
    },

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
            { text: 'AI Tooling',      link: '/guide/ai' },
            { text: 'Feature Workflow', link: '/guide/workflow' },
            { text: 'Routing',         link: '/guide/routing' },
            { text: 'Layouts',         link: '/guide/layouts' },
            { text: 'State',           link: '/guide/state' },
            { text: 'Composables',     link: '/guide/composables' },
            { text: 'Testing',         link: '/guide/testing' },
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
