import { html, component, reactive, nextTick } from '@arrow-js/core'

/**
 * Mounts `setup` inside a real Arrow `component()` and returns what it returned,
 * plus `unmount()`. The component is the slot value itself, the case where Arrow
 * runs `onCleanup` (NOTES N64: a component nested inside another template is
 * recycled without its cleanups).
 *
 * @template R
 * @param {() => R} setup  called inside the component, e.g. `() => useFetch(url)`
 * @returns {{ result: R, unmount: () => Promise<void> }}
 */
export function mountInComponent(setup) {
  /** @type {R | undefined} */
  let result
  const C = component(() => {
    result = setup()
    return html`<span>mounted</span>`
  })
  const flag = reactive({ on: true })
  const root = document.createElement('div')
  document.body.append(root)
  html`${() => (flag.on ? C() : '')}`(root)
  if (root.textContent !== 'mounted') throw new Error('component did not mount')
  return {
    result: /** @type {R} */ (result),
    async unmount() {
      flag.on = false
      await nextTick()
      root.remove()
    },
  }
}
