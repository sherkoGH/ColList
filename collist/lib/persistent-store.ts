/**
 * A tiny module-level store for a single persisted preference.
 *
 * Backed by `useSyncExternalStore`: React renders `getServerSnapshot()` on the
 * server *and* during hydration, then swaps to the stored value once mounted.
 * That keeps the two passes identical without a setState-inside-effect.
 */
export function createPersistentStore<T extends string>(
  storageKey: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
) {
  let current: T | null = null;
  const listeners = new Set<() => void>();

  function read(): T {
    if (current !== null) return current;

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(storageKey);
    } catch {
      // Private mode or blocked storage: the fallback stands.
    }
    current = isValid(stored) ? stored : fallback;
    return current;
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot(): T {
      return read();
    },
    getServerSnapshot(): T {
      return fallback;
    },
    set(value: T) {
      if (current === value) return;
      current = value;
      try {
        window.localStorage.setItem(storageKey, value);
      } catch {
        // Persistence is a convenience; the in-memory value still applies.
      }
      for (const listener of listeners) listener();
    },
  };
}

/**
 * Object variant of the above, serialised as JSON.
 *
 * `getSnapshot` must return a *stable reference* — returning a fresh object on
 * every call makes `useSyncExternalStore` re-render forever — so the parsed
 * value is cached and only replaced when something actually writes.
 */
export function createPersistentObjectStore<T extends object>(
  storageKey: string,
  fallback: T,
  reconcile: (parsed: unknown, fallback: T) => T,
) {
  let current: T | null = null;
  const listeners = new Set<() => void>();

  function read(): T {
    if (current !== null) return current;

    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      // Blocked storage: the fallback stands.
    }

    if (raw === null) {
      current = fallback;
      return current;
    }

    try {
      current = reconcile(JSON.parse(raw), fallback);
    } catch {
      // Corrupt or stale payload: discard it rather than crash on boot.
      current = fallback;
    }
    return current;
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot(): T {
      return read();
    },
    getServerSnapshot(): T {
      return fallback;
    },
    set(value: T) {
      current = value;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // Persistence is a convenience; the in-memory value still applies.
      }
      for (const listener of listeners) listener();
    },
  };
}
