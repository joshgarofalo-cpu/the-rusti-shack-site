import crypto from "crypto";

/**
 * Simple shared-password gate for the private /manager page. The password is a
 * real secret (MANAGER_PASSWORD env var, never in the repo). After login we set an
 * httpOnly cookie holding a hash of the password, verified server-side on every
 * request — so nothing sensitive is exposed to the browser.
 */
export const MANAGER_COOKIE = "rusti_manager";

function password(): string {
  return process.env.MANAGER_PASSWORD || "";
}

export function managerConfigured(): boolean {
  return password().length > 0;
}

/** Cookie value = hash of the password; can't be forged without knowing it. */
export function sessionToken(): string {
  return crypto.createHash("sha256").update("rusti-shack::" + password()).digest("hex");
}

export function checkPassword(input: string | undefined): boolean {
  const pw = password();
  if (!pw || !input) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(pw);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function isAuthed(cookieValue: string | undefined): boolean {
  return managerConfigured() && cookieValue === sessionToken();
}
