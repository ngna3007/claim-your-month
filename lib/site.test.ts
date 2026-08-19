import { expect, test, vi } from "vitest";

test("publicSiteUrl prefers a trimmed env base and falls back to the request host", async () => {
  const { publicSiteUrl } = await import("./site");
  expect(publicSiteUrl(" https://claim-your-month.vercel.app/ ", "localhost:3012", "http"))
    .toBe("https://claim-your-month.vercel.app");
  expect(publicSiteUrl("   ", "claim-your-month.vercel.app", "https"))
    .toBe("https://claim-your-month.vercel.app");
  expect(publicSiteUrl(undefined, "localhost:3012", null)).toBe("http://localhost:3012");
});

test("join stays empty until env is set; merch and join label have defaults", async () => {
  vi.resetModules();
  delete process.env.NEXT_PUBLIC_JOIN_URL;
  delete process.env.NEXT_PUBLIC_JOIN_LABEL;
  delete process.env.NEXT_PUBLIC_MERCH;
  const site = await import("./site");
  expect(site.joinUrl).toBe("");
  expect(site.merch).toBe("Show this screen to a CodeCatalyst member to grab your free gift.");
  expect(site.joinLabel).toBe("Come join us");
});

test("joinUrl ignores a javascript: value", async () => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_JOIN_URL = "javascript:alert(1)";
  const site = await import("./site");
  expect(site.joinUrl).toBe("");
});

test("publicSiteUrl ignores a non-http env base", async () => {
  const { publicSiteUrl } = await import("./site");
  expect(publicSiteUrl("javascript:alert(1)", "claim-your-month.vercel.app", "https"))
    .toBe("https://claim-your-month.vercel.app");
});
