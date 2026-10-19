import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { backendUrl, isSameOriginRequest } from "@/lib/server-api";
import { SESSION_COOKIE, STAFF_ROLES } from "@/lib/server-session";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  let credentials;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 4096) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    credentials = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  if (
    typeof credentials?.email !== "string" ||
    credentials.email.length > 254 ||
    typeof credentials?.password !== "string" ||
    Buffer.byteLength(credentials.password) > 72
  ) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    return NextResponse.json({ error: "Staff sign-in is not configured." }, { status: 503 });
  }

  try {
    const response = await fetch(backendUrl("/api/v1/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || "Unable to sign in. Check your credentials and try again." },
        { status: response.status },
      );
    }

    let claims;
    try {
      claims = jwt.verify(result.token, secret, { algorithms: ["HS256"] });
    } catch {
      return NextResponse.json({ error: "The authentication service returned an invalid session." }, { status: 502 });
    }
    if (!claims.sub || !STAFF_ROLES.includes(claims.role) || !result.user?.email) {
      return NextResponse.json({ error: "The authentication service returned an invalid session." }, { status: 502 });
    }

    const nextResponse = NextResponse.json({
      user: { email: claims.email || result.user.email, role: claims.role },
    });
    nextResponse.cookies.set(SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return nextResponse;
  } catch {
    return NextResponse.json(
      { error: "The authentication service is unavailable. Please try again later." },
      { status: 502 },
    );
  }
}
