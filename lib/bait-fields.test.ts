import { expect, test } from "vitest";
import { validateBaitFields, validateEmail, validateName } from "./bait-fields";

test("accepts ordinary and accented names", () => {
  expect(validateName("Alex Nguyen")).toBeUndefined();
  expect(validateName("  Nguyễn Ngọc Anh  ")).toBeUndefined();
  expect(validateName("O'Brien")).toBeUndefined();
  expect(validateName("Mary-Jane")).toBeUndefined();
});

test("rejects empty, tiny, huge, or hostile names", () => {
  expect(validateName("")).toBe("Enter your full name.");
  expect(validateName("A")).toBe("Name is too short.");
  expect(validateName("Alex <script>")).toBe("Enter a real name.");
  expect(validateName("admin@school.edu")).toBe("Enter a real name.");
  expect(validateName("https://evil.test")).toBe("Enter a real name.");
  expect(validateName("x".repeat(81))).toBe("Name is too long.");
});

test("accepts a normal student email and rejects junk", () => {
  expect(validateEmail("alex@school.edu")).toBeUndefined();
  expect(validateEmail("")).toBe("Enter your email.");
  expect(validateEmail("not-an-email")).toBe("Enter a valid email.");
  expect(validateEmail("alex@school")).toBe("Enter a valid email.");
  expect(validateEmail("alex@@school.edu")).toBe("Enter a valid email.");
  expect(validateEmail("javascript:alert(1)@x.com")).toBe("Enter a valid email.");
});

test("validateBaitFields reports both fields", () => {
  expect(validateBaitFields("", "nope")).toEqual({
    name: "Enter your full name.",
    email: "Enter a valid email.",
  });
  expect(validateBaitFields("Alex Nguyen", "alex@school.edu")).toBeNull();
});
