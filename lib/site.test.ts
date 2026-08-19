import { expect, test } from "vitest";

test("join stays empty until env is set; merch and join label have defaults", async () => {
  delete process.env.NEXT_PUBLIC_JOIN_URL;
  delete process.env.NEXT_PUBLIC_JOIN_LABEL;
  delete process.env.NEXT_PUBLIC_MERCH;
  const site = await import("./site");
  expect(site.joinUrl).toBe("");
  expect(site.merch).toBe("Show this screen to a CodeCatalyst member to grab your free gift.");
  expect(site.joinLabel).toBe("Come join us");
});
