import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

/**
 * Polyfill de localStorage para o ambiente de testes.
 *
 * O jsdom usado pelo Vitest não expõe `window.localStorage` (o Node fornece um
 * localStorage nativo experimental que fica desativado sem a flag
 * `--localstorage-file`), o que quebraria `lib/api/session.ts` nos testes que
 * exercitam o AuthProvider. No navegador o localStorage real sempre existe.
 */
if (typeof window.localStorage === "undefined" || window.localStorage === null) {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  try {
    (globalThis as { localStorage?: Storage }).localStorage = storage;
  } catch {
    // globalThis imutável: window.localStorage já cobre o acesso via window.
  }
}
