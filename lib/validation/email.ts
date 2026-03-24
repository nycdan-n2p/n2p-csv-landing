const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;
const LOCAL_PART_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i;
const DOMAIN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const PUNYCODE_TLD_RE = /^xn--[a-z0-9-]{1,59}$/i;
const LETTER_TLD_RE = /^[a-z]{2,63}$/i;

function normalizeEmailInput(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: unknown): boolean {
  const normalizedEmail = normalizeEmailInput(raw);
  if (normalizedEmail === null) return false;
  if (!normalizedEmail || normalizedEmail.length > MAX_EMAIL_LENGTH) return false;

  const atSymbolIndex = normalizedEmail.indexOf("@");
  if (atSymbolIndex <= 0 || atSymbolIndex !== normalizedEmail.lastIndexOf("@")) {
    return false;
  }

  const localPart = normalizedEmail.slice(0, atSymbolIndex);
  const domain = normalizedEmail.slice(atSymbolIndex + 1);

  if (
    !localPart ||
    !domain ||
    localPart.length > MAX_LOCAL_PART_LENGTH ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !LOCAL_PART_RE.test(localPart)
  ) {
    return false;
  }

  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((label) => !label)) return false;
  if (!labels.every((label) => DOMAIN_LABEL_RE.test(label))) return false;

  const tld = labels.at(-1) ?? "";
  return LETTER_TLD_RE.test(tld) || PUNYCODE_TLD_RE.test(tld);
}

export function parseEmail(raw: unknown): string {
  const normalizedEmail = normalizeEmailInput(raw);
  if (normalizedEmail === null || !normalizedEmail || !isValidEmail(normalizedEmail)) {
    throw new EmailValidationError("Valid email is required");
  }
  return normalizedEmail;
}

export class EmailValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailValidationError";
  }
}
