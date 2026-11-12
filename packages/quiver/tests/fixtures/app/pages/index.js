// A comment before meta; meta.nav and meta.layout are read at build time.
export const meta = {
  layout: 'menu',
  title: "Home",
  nav: { label: 'Home', order: 1, }, // trailing commas are fine
}
export default () => 'home'
