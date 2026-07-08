/**
 * Server-only Supabase writer using the SERVICE ROLE key. This key bypasses
 * Row Level Security, so it must NEVER reach the browser or the repo — it lives
 * only in an environment variable (SUPABASE_SERVICE_ROLE_KEY) on the host.
 *
 * Used to write the PII tables (Customers_Core / Customers_Contact / Orders /
 * OrderLines), which are RLS-locked and not reachable with the publishable key.
 */
const BASE = process.env.SUPABASE_URL || "https://xmlkyetqqydhkkpfltwv.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function serviceRoleConfigured(): boolean {
  return Boolean(SERVICE_KEY);
}

async function admin(pathAndQuery: string, init: RequestInit): Promise<Response> {
  if (!SERVICE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — the server can't write to Supabase. " +
        "Add it to .env.local (local) and the Vercel project env vars (production)."
    );
  }
  const res = await fetch(`${BASE}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Supabase admin ${res.status} on ${pathAndQuery}: ${await res.text()}`);
  }
  return res;
}

/** PostgREST table names are case-sensitive here (e.g. "Customers_Core"). */
export async function adminSelect<T>(pathAndQuery: string): Promise<T> {
  const res = await admin(pathAndQuery, { method: "GET" });
  return (await res.json()) as T;
}

/** Fetch every row, paging past PostgREST's 1000-row cap via Range headers. */
export async function adminSelectAll<T>(pathAndQuery: string): Promise<T[]> {
  const PAGE = 1000;
  let from = 0;
  const all: T[] = [];
  for (;;) {
    const res = await admin(pathAndQuery, {
      method: "GET",
      headers: { Range: `${from}-${from + PAGE - 1}` },
    });
    const chunk = (await res.json()) as T[];
    all.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export async function adminInsert<T>(table: string, rows: unknown[]): Promise<T> {
  const res = await admin(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
  return (await res.json()) as T;
}
