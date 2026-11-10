// jsdom does not implement window.matchMedia; the theme switcher recipe reads it at import time.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: '',
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false },
    onchange: null,
  })
}
