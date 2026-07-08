/**
 * Minimal server-side Stripe client over the REST API (no SDK dependency).
 * Uses STRIPE_SECRET_KEY — a real secret: env var only, never the browser or repo.
 */
const SECRET = process.env.STRIPE_SECRET_KEY;
const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return Boolean(SECRET);
}

// Flatten nested objects/arrays into Stripe's form-encoding: a[b][0][c]=v
function encode(
  obj: Record<string, unknown>,
  prefix = "",
  out: [string, string][] = []
): [string, string][] {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object") {
          encode(item as Record<string, unknown>, `${key}[${i}]`, out);
        } else {
          out.push([`${key}[${i}]`, String(item)]);
        }
      });
    } else if (v && typeof v === "object") {
      encode(v as Record<string, unknown>, key, out);
    } else {
      out.push([key, String(v)]);
    }
  }
  return out;
}

async function post<T>(path: string, params: Record<string, unknown>): Promise<T> {
  if (!SECRET) throw new Error("STRIPE_SECRET_KEY is not set.");
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(encode(params)),
  });
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  if (!SECRET) throw new Error("STRIPE_SECRET_KEY is not set.");
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${SECRET}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export type StripeSession = {
  id: string;
  url: string | null;
  payment_status: string; // "paid" | "unpaid" | "no_payment_required"
  metadata: Record<string, string>;
};

export function createCheckoutSession(params: Record<string, unknown>) {
  return post<StripeSession>("/checkout/sessions", params);
}

export function retrieveCheckoutSession(id: string) {
  return get<StripeSession>(`/checkout/sessions/${encodeURIComponent(id)}`);
}
