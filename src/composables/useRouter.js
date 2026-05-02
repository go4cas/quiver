import { go } from '../framework/router.js'

export function useRouter() {
  return {
    go,
    back: () => window.navigation?.back().finished,
    forward: () => window.navigation?.forward().finished,
  }
}
