import { expect, test } from "vitest";
import { readReveal, writeReveal } from "./reveal-store";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear() { map.clear(); },
    getItem(key) { return map.get(key) ?? null; },
    key(i) { return [...map.keys()][i] ?? null; },
    removeItem(key) { map.delete(key); },
    setItem(key, value) { map.set(key, value); },
  };
}

test("writeReveal stores a rank and readReveal returns it", () => {
  const store = memoryStorage();
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: store },
    configurable: true,
  });
  writeReveal({ rank: 4, scans: 6, phished: 4 });
  expect(readReveal()).toEqual({ rank: 4, scans: 6, phished: 4 });
});

test("readReveal ignores a missing or zeroed record", () => {
  const store = memoryStorage();
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: store },
    configurable: true,
  });
  expect(readReveal()).toBeNull();
  writeReveal({ rank: 0, scans: 0, phished: 0 });
  expect(readReveal()).toBeNull();
});

test("writeReveal ignores a payload with no numeric rank", () => {
  const store = memoryStorage();
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: store },
    configurable: true,
  });
  writeReveal({ rank: Number.NaN, scans: 2, phished: 1 });
  writeReveal({ rank: undefined as unknown as number, scans: 2, phished: 1 });
  expect(readReveal()).toBeNull();
  expect(store.getItem("cym-reveal")).toBeNull();
});
