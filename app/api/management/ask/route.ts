import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MANAGER_COOKIE, isAuthed } from "../../../lib/manager-auth";
import { askGemini, geminiConfigured } from "../../../lib/gemini";
import { adminSelect, adminUpsert } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

const DAILY_CAP = Number(process.env.AI_DAILY_CAP || 200);

/** Hard daily spend cap — refuse once we've answered DAILY_CAP questions today. */
async function withinDailyCap(): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const rows = await adminSelect<{ count: number }[]>(`ai_usage?day=eq.${day}&select=count`);
  const count = rows[0]?.count ?? 0;
  if (count >= DAILY_CAP) return false;
  await adminUpsert("ai_usage", [{ day, count: count + 1 }], "day");
  return true;
}

export async function POST(request: Request) {
  // Gate 1: authenticated manager only (the assistant lives inside the private area).
  const cookie = (await cookies()).get(MANAGER_COOKIE)?.value;
  if (!isAuthed(cookie)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  if (!geminiConfigured()) {
    return NextResponse.json({ error: "The assistant isn't configured yet (missing GEMINI_API_KEY)." }, { status: 503 });
  }

  let body: { question?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }
  const question = (body.question || "").trim();
  if (!question) return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  if (question.length > 500) return NextResponse.json({ error: "Please keep questions under 500 characters." }, { status: 400 });

  // Gate 2: hard daily cap so a runaway can't run up the bill.
  try {
    if (!(await withinDailyCap())) {
      return NextResponse.json({ error: "The assistant has hit today's question limit. Try again tomorrow." }, { status: 429 });
    }
  } catch { /* if the usage table isn't present, don't block — auth is the primary gate */ }

  try {
    const result = await askGemini(question);
    return NextResponse.json(result);
  } catch (e) {
    console.error("assistant failed", e);
    const status = (e as Error & { status?: number }).status;
    if (status === 429) {
      return NextResponse.json(
        { error: "The AI provider's daily limit was reached. The free Gemini tier only allows a few questions per day — enable billing on the API key (still only cents per question) to lift the limit, or try again tomorrow." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "The assistant couldn't answer that right now." }, { status: 500 });
  }
}
