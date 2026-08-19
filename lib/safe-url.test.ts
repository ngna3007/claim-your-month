import { expect, test } from "vitest";
import { safeHttpUrl } from "./safe-url";

test("keeps http(s) URLs and drops everything else", () => {
  expect(safeHttpUrl(" https://club.example/join ")).toBe("https://club.example/join");
  expect(safeHttpUrl("http://localhost:3000")).toBe("http://localhost:3000/");
  expect(safeHttpUrl("javascript:alert(1)")).toBe("");
  expect(safeHttpUrl("data:text/html,hi")).toBe("");
  expect(safeHttpUrl("https://user:pass@evil.test")).toBe("");
  expect(safeHttpUrl("")).toBe("");
});
