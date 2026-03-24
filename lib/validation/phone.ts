export function normalizeToE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).trim().replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export function isValidE164(normalized: string | null): boolean {
  if (!normalized || !normalized.startsWith("+")) return false;
  const digitsOnly = normalized.slice(1);
  if (!/^\d+$/.test(digitsOnly)) return false;
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

export function parsePhone(raw: unknown): string {
  if (raw === null || raw === undefined) {
    throw new PhoneValidationError("Valid phone number is required");
  }
  const normalized = normalizeToE164(String(raw).trim());
  if (!normalized || !isValidE164(normalized)) {
    throw new PhoneValidationError("Valid phone number is required");
  }
  return normalized;
}

export class PhoneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhoneValidationError";
  }
}
