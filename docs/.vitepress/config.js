import { defineConfig } from 'vitepress'
import { createRequire } from 'module'

// The navbar badge shows the core package's version, read at build time so it
// can never drift from packages/quiver/package.json.
const pkg = createRequire(import.meta.url)('../../packages/quiver/package.json')

const guide = [
  {
    text: 'Introduction',
    items: [
      { text: 'Getting Started', link: '/guide/getting-started' },
      { text: 'Why Quiver', link: '/guide/why-quiver' },
      { text: 'Examples', link: '/examples' },
      { text: 'Migrating from 2.x', link: '/guide/migration' },
    ],
  },
  {
    text: 'Building an app',
    items: [
      { text: 'Routing', link: '/guide/routing' },
      { text: 'Layouts', link: '/guide/layouts' },
      { text: 'Components', link: '/guide/components' },
      { text: 'State', link: '/guide/state' },
      { text: 'Composables', link: '/guide/composables' },
      { text: 'Theming', link: '/guide/theming' },
      { text: 'Using Tailwind', link: '/guide/tailwind' },
      { text: 'Testing', link: '/guide/testing' },
      { text: 'Feature Workflow', link: '/guide/workflow' },
      { text: 'AI Tooling', link: '/guide/ai' },
      { text: 'Troubleshooting', link: '/guide/troubleshooting' },
    ],
  },
  {
    text: 'Project',
    items: [
      { text: 'Changelog', link: 'https://github.com/go4cas/quiver/blob/main/CHANGELOG.md' },
      { text: 'Contributing', link: 'https://github.com/go4cas/quiver/blob/main/CONTRIBUTING.md' },
    ],
  },
]

const api = [
  {
    text: 'API reference',
    items: [
      { text: 'Overview', link: '/api/' },
      { text: '@go4cas/quiver', link: '/api/core' },
      { text: '@go4cas/quiver/vite', link: '/api/vite' },
      { text: '@go4cas/quiver/bun', link: '/api/bun' },
      { text: '@go4cas/quiver/client', link: '/api/client' },
      { text: 'quiver routes (CLI)', link: '/api/cli' },
      { text: 'arrow-use', link: '/api/arrow-use' },
    ],
  },
]

const arrowUse = [
  {
    text: 'arrow-use',
    items: [
      { text: 'Overview', link: '/arrow-use/' },
      { text: 'useFetch', link: '/arrow-use/useFetch' },
      { text: 'useStorage', link: '/arrow-use/useStorage' },
      { text: 'useMediaQuery', link: '/arrow-use/useMediaQuery' },
      { text: 'useEventListener', link: '/arrow-use/useEventListener' },
    ],
  },
]

const recipes = [
  {
    text: 'Recipes',
    items: [
      { text: 'Overview', link: '/recipes/' },
      { text: 'theme', link: '/recipes/theme' },
      { text: 'link', link: '/recipes/link' },
      { text: 'toasts', link: '/recipes/toasts' },
      { text: 'theme-switcher', link: '/recipes/theme-switcher' },
      { text: 'useForm', link: '/recipes/useForm' },
      { text: 'hmrState', link: '/recipes/hmrState' },
      { text: 'layouts', link: '/recipes/layouts' },
      { text: 'views', link: '/recipes/views' },
    ],
  },
]

export default defineConfig({
  title: 'Quiver',
  description: 'A drop-in router, context and meta layer for Arrow.js, with arrow-use composables, copy-in recipes and a starter app',
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
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '^/(guide|examples)' },
      { text: 'API', link: '/api/', activeMatch: '^/api/' },
      { text: 'arrow-use', link: '/arrow-use/', activeMatch: '^/arrow-use/' },
      { text: 'Recipes', link: '/recipes/', activeMatch: '^/recipes/' },
      { text: `v${pkg.version}`, link: 'https://github.com/go4cas/quiver/blob/main/CHANGELOG.md' },
    ],

    sidebar: {
      '/guide/': guide,
      '/examples': guide,
      '/api/': api,
      '/arrow-use/': arrowUse,
      '/recipes/': recipes,
    },

    outline: [2, 3],

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
