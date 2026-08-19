import { expect, test } from "vitest";
import { shouldReportScan } from "./scan-session";

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

test("shouldReportScan fires once per tab session", () => {
  const store = memoryStorage();
  Object.defineProperty(globalThis, "window", {
    value: { sessionStorage: store },
    configurable: true,
  });
  expect(shouldReportScan()).toBe(true);
  expect(shouldReportScan()).toBe(false);
  expect(shouldReportScan()).toBe(false);
});
