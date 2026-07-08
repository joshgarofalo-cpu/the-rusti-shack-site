import { NextResponse } from "next/server";
import {
  MANAGER_COOKIE,
  checkPassword,
  sessionToken,
  managerConfigured,
} from "../../../lib/manager-auth";

export async function POST(request: Request) {
  if (!managerConfigured()) {
    return NextResponse.json(
      { error: "Manager access isn't set up (MANAGER_PASSWORD missing on the server)." },
      { status: 503 }
    );
  }
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(MANAGER_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return res;
}
