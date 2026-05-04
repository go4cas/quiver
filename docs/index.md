---
layout: home

hero:
  tagline: Arrow.js · Vite · Tailwind CSS starter template with routing, layouts, state, composables, and testing.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/framework

features:
  - title: File-based Routing
    details: Drop a file into src/pages/ and it becomes a route. Dynamic segments, navigation guards, and automatic document.title updates included.
    link: /guide/routing
  - title: Layouts
    details: Wrap pages in reusable layout shells. Ships with BasicLayout and MenuLayout. Add your own in three steps.
    link: /guide/layouts
  - title: Reactive State
    details: Global stores built on Arrow.js reactive(). createStore() keeps the shape clean and mutations explicit.
    link: /guide/state
  - title: Composables
    details: useRoute, useRouter, and useForm — the common patterns extracted so you write less boilerplate.
    link: /guide/composables
  - title: Dependency Injection
    details: provide() and inject() for passing config or services to any layout or component without prop-drilling.
    link: /api/framework
  - title: Testing
    details: Unit tests with Vitest and end-to-end tests with Playwright. Both configured and ready to run.
    link: /guide/testing
---
