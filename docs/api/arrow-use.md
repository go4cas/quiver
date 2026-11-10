# arrow-use

```js
import { useFetch, useStorage, useMediaQuery, useEventListener } from 'arrow-use'
```

Four composables for any Arrow.js app. One entry, no subpaths; `sideEffects: false` lets a bundler drop the ones you don't import. Each has its own page with examples: [`useFetch`](/arrow-use/useFetch), [`useStorage`](/arrow-use/useStorage), [`useMediaQuery`](/arrow-use/useMediaQuery), [`useEventListener`](/arrow-use/useEventListener). The conventions they share are in the [overview](/arrow-use/).

## useFetch

```ts
useFetch(url: string, options?: UseFetchOptions): UseFetchReturn
// UseFetchOptions = { immediate?: boolean, transform?: (raw: any) => any } & RequestInit
// UseFetchReturn = { data(): any, loading(): boolean, error(): string | null, status(): number | null,
//                    refetch(): Promise<void>, reset(): void, stop(): void }
```

Fetches JSON into reactive getters. `immediate` defaults to `true`; `transform` maps the parsed JSON; other options go to `fetch`. [Details](/arrow-use/useFetch).

## useStorage

```ts
useStorage<T>(key: string, initial: T, options?: UseStorageOptions<T>): UseStorageReturn<T>
// UseStorageOptions<T> = { storage?: 'local' | 'session', serializer?: Serializer<T> }
// Serializer<T> = { read(raw: string): T, write(value: T): string }
// UseStorageReturn<T> = { value(): T, set(value: T): void, remove(): void, stop(): void }
```

A value in `localStorage` or `sessionStorage`, synced across tabs, with a memory fallback. [Details](/arrow-use/useStorage).

## useMediaQuery

```ts
useMediaQuery(query: string): UseMediaQueryReturn
// UseMediaQueryReturn = { matches(): boolean, stop(): void }
```

Whether a media query matches, kept up to date. [Details](/arrow-use/useMediaQuery).

## useEventListener

```ts
useEventListener(target: ListenerTarget, type: string, handler: (event: Event) => void,
                 options?: AddEventListenerOptions): UseEventListenerReturn
// ListenerTarget = EventTarget | (() => EventTarget | null | undefined) | null | undefined
// UseEventListenerReturn = { stop(): void }
```

An event listener removed on `stop()` or unmount. [Details](/arrow-use/useEventListener).

## Types

`UseFetchOptions`, `UseFetchReturn`, `Serializer<T>`, `UseStorageOptions<T>`, `UseStorageReturn<T>`, `UseMediaQueryReturn`, `ListenerTarget` and `UseEventListenerReturn` are exported as types:

```js
/** @type {import('arrow-use').UseStorageReturn<'light' | 'dark'>} */
```

## Without a browser

| Composable | Behaviour with no `fetch`, storage, `matchMedia` or `window` |
|---|---|
| `useFetch` | no request; `data()` is `null`, `loading()` is `false` |
| `useStorage` | `value()` is `initial`; `set()` keeps the value in memory |
| `useMediaQuery` | `matches()` is `false` |
| `useEventListener` | no listener; `stop()` does nothing |
