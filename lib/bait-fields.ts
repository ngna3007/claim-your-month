export type FieldErrors = { name?: string; email?: string };

const NAME_MAX = 80;
const EMAIL_MAX = 254;
const NAME_CHARS = /^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*\.?$/u;
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function normalizeName(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, "").trim().replace(/\s+/g, " ");
}

export function normalizeEmail(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

export function validateName(raw: string): string | undefined {
  const name = normalizeName(raw);
  if (!name) return "Enter your full name.";
  if (name.length < 2) return "Name is too short.";
  if (name.length > NAME_MAX) return "Name is too long.";
  if (!NAME_CHARS.test(name)) return "Enter a real name.";
  return undefined;
}

export function validateEmail(raw: string): string | undefined {
  const email = normalizeEmail(raw);
  if (!email) return "Enter your email.";
  if (email.length > EMAIL_MAX) return "Email is too long.";
  if (email.includes("..") || email.startsWith(".") || email.endsWith(".")) {
    return "Enter a valid email.";
  }
  if (!EMAIL_RE.test(email)) return "Enter a valid email.";
  return undefined;
}

/** Client-only. Never send the returned values off the device. */
export function validateBaitFields(name: string, email: string): FieldErrors | null {
  const errors: FieldErrors = {};
  const nameError = validateName(name);
  const emailError = validateEmail(email);
  if (nameError) errors.name = nameError;
  if (emailError) errors.email = emailError;
  return nameError || emailError ? errors : null;
}

export const baitLimits = { name: NAME_MAX, email: EMAIL_MAX };
