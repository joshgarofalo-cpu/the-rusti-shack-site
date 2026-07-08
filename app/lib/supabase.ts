/**
 * Minimal server-side reader for the Supabase (PostgREST) product catalog.
 * Uses the publishable/anon key — safe because the products table is exposed
 * read-only via row-level security. No extra SDK dependency needed.
 */
// These two values are PUBLIC by design: the publishable ("anon") key is meant
// to be exposed, and Row Level Security guards the data (the products table is
// public-read; the customer/order tables are locked down). So it's safe to keep
// them in the code — the site then deploys with no environment variables set.
// Env vars still override when present (e.g. to point at a different project).
//
// ⚠️ NEVER do this for a SECRET key (e.g. Stripe's sk_...). Those must live only
// in an environment variable on the host and never touch the repo.
const PUBLIC_SUPABASE_URL = "https://xmlkyetqqydhkkpfltwv.supabase.co";
const PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_U6bK1VnU1TV_qAk525dzDQ_RhFjcfAp";

const BASE = process.env.SUPABASE_URL || PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY;

export function supabaseConfigured(): boolean {
  return Boolean(BASE && KEY);
}

/** GET against /rest/v1/<pathAndQuery>, cached for `revalidate` seconds. */
export async function sbSelect<T>(
  pathAndQuery: string,
  revalidate = 300
): Promise<T> {
  if (!BASE || !KEY) {
    throw new Error(
      "Supabase is not configured — set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local"
    );
  }
  const res = await fetch(`${BASE}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    next: { revalidate },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status} on ${pathAndQuery}: ${body}`);
  }
  return (await res.json()) as T;
}
