import { expect, test } from "vitest";
import { hasEmptyBody, isAllowedOrigin, isCrossSite, rateLimit } from "./request-guard";

function req(url: string, headers: Record<string, string>): Request {
  return new Request(url, { method: "POST", headers });
}

test("hasEmptyBody treats missing or zero content-length as empty", () => {
  expect(hasEmptyBody(req("http://localhost/api/phished", {}))).toBe(true);
  expect(hasEmptyBody(req("http://localhost/api/phished", { "content-length": "0" }))).toBe(true);
  expect(hasEmptyBody(req("http://localhost/api/phished", { "content-length": "24" }))).toBe(false);
});

test("isAllowedOrigin allows same origin and requests with no Origin", () => {
  const url = "https://claim-your-month.vercel.app/api/phished";
  expect(isAllowedOrigin(req(url, {}))).toBe(true);
  expect(isAllowedOrigin(req(url, { origin: "https://claim-your-month.vercel.app" }))).toBe(true);
  expect(isAllowedOrigin(req(url, { origin: "https://evil.test" }))).toBe(false);
});

test("isCrossSite flags cross-site fetch metadata", () => {
  expect(isCrossSite(req("http://localhost/api/phished", { "sec-fetch-site": "same-origin" }))).toBe(false);
  expect(isCrossSite(req("http://localhost/api/phished", { "sec-fetch-site": "cross-site" }))).toBe(true);
});

test("rateLimit trips after the window fills", () => {
  const key = "test:" + Math.random();
  expect(rateLimit(key, 2, 60_000, 1_000)).toBe(true);
  expect(rateLimit(key, 2, 60_000, 1_001)).toBe(true);
  expect(rateLimit(key, 2, 60_000, 1_002)).toBe(false);
  expect(rateLimit(key, 2, 60_000, 62_000)).toBe(true);
});
