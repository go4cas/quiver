// The section guard for /private and everything under it (D39): nobody is
// signed in here, so it always redirects.
/** @type {import('@go4cas/quiver').NavigationGuard} */
export default function signedIn() {
  return '/login'
}
