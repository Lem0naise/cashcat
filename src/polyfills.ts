// SSR-safe localStorage polyfill
// This runs on the server during dev mode to prevent "localStorage is not defined" errors
if (typeof window === 'undefined' && typeof globalThis !== 'undefined') {
    const store = new Map<string, string>();

    (globalThis as any).localStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        get length() { return store.size; },
    };

    // Also add to global for Node.js compatibility
    if (typeof global !== 'undefined') {
        (global as any).localStorage = (globalThis as any).localStorage;
    }
}

export { };
