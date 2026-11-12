import aliceAvatar from './assets/avatar-alice.svg'

// App settings. Each key is provided under its own name, so inject('app') and
// inject('currentUser') read them; layouts/menu.js shows both. The sidebar
// links come from each page's `meta.nav`; a `nav` key here would replace them.
export default {
  app: { name: 'Quiver', tagline: 'The Demo Hub', logo: '/logo.svg', footer: 'quiver starter' },
  // A fixed demo identity: the starter has no sessions. A real app provides the
  // signed-in user from its own store and a signOut() that ends the server
  // session (the layouts recipe README, "Sign-out").
  currentUser: { name: 'Alice Nkosi', email: 'alice@example.com', avatar: aliceAvatar },
}
