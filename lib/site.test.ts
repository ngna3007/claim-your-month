import { expect, test } from "vitest";

test("join and merch stay empty until env is set; join label has a default", async () => {
  delete process.env.NEXT_PUBLIC_JOIN_URL;
  delete process.env.NEXT_PUBLIC_JOIN_LABEL;
  delete process.env.NEXT_PUBLIC_MERCH;
  const site = await import("./site");
  expect(site.joinUrl).toBe("");
  expect(site.merch).toBe("");
  expect(site.joinLabel).toBe("Come join us");
});
