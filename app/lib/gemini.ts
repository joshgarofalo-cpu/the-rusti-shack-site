import { TOOLS, TOOL_MAP } from "./ai-tools";

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function geminiConfigured(): boolean {
  return Boolean(KEY);
}

export type Chart = { title: string; chartType: "bar" | "line"; rows: { label: string; value: number }[] };
export type AskResult = { answer: string; chart: Chart | null; toolUsed: string | null };

const SYSTEM = `You are the private analytics assistant for The Rusti Shack, a beach & dive shop on Apo Island. You answer the owner's questions about HER shop's performance.

Rules:
- Answer ONLY from the tools provided. They return aggregates of the shop's own data.
- Never invent, estimate, or guess a number. If the tools can't answer, say so in one sentence.
- You only ever see aggregates — you have NO access to individual customers, their names, emails, phones, or addresses, and you must not claim to. If asked for personal customer details, explain you only work with anonymised aggregates.
- Never use outside/world knowledge or browse anything; stay strictly within the tool data.
- All monetary figures are in US dollars — always write amounts with a "$" sign, never any other currency symbol.
- Keep answers to 2-4 sentences: state the key figures, then let the chart show the rest.
- The current date is ${new Date().toISOString().slice(0, 10)}. The data runs from 2021 to early 2026.`;

export async function askGemini(question: string): Promise<AskResult> {
  if (!KEY) throw new Error("GEMINI_API_KEY not set");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const toolDecls = { functionDeclarations: TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) };

  const contents: Record<string, unknown>[] = [{ role: "user", parts: [{ text: question }] }];
  let chart: Chart | null = null;
  let toolUsed: string | null = null;

  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        tools: [toolDecls],
        generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    const parts: any[] = j.candidates?.[0]?.content?.parts || [];
    const fc = parts.find((p) => p.functionCall)?.functionCall;

    if (fc) {
      const tool = TOOL_MAP.get(fc.name);
      let result;
      try {
        result = tool ? await tool.run(fc.args || {}) : { title: "", chartType: "none" as const, rows: [], data: [{ error: "unknown tool" }] };
      } catch (e) {
        result = { title: "", chartType: "none" as const, rows: [], data: [{ error: (e as Error).message }] };
      }
      if (tool && result.chartType !== "none" && result.rows.length) {
        chart = { title: result.title, chartType: result.chartType, rows: result.rows };
        toolUsed = fc.name;
      }
      contents.push({ role: "model", parts: [{ functionCall: fc }] });
      contents.push({ role: "user", parts: [{ functionResponse: { name: fc.name, response: { data: result.data } } }] });
      continue;
    }

    const text = parts.filter((p) => p.text).map((p) => p.text).join("").trim();
    return { answer: text || "I couldn't find an answer to that in your shop's data.", chart, toolUsed };
  }
  return { answer: "That needed too many steps — try asking something more specific.", chart, toolUsed };
}
