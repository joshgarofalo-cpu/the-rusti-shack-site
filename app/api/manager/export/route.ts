import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MANAGER_COOKIE, isAuthed } from "../../../lib/manager-auth";
import { salesCSV, tableCSV } from "../../../lib/reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookie = (await cookies()).get(MANAGER_COOKIE)?.value;
  if (!isAuthed(cookie)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const table = new URL(request.url).searchParams.get("table");
  let csv: string;
  let filename: string;

  if (!table) {
    csv = await salesCSV();
    filename = "rusti-sales.csv";
  } else {
    const t = await tableCSV(table);
    if (!t) return new NextResponse("Unknown table", { status: 400 });
    csv = t.csv;
    filename = `rusti-${t.file}`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
