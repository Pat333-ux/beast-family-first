import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { backendUrl, isSameOriginRequest } from "@/lib/server-api";
import {
  ANALYTICS_ROLES,
  REVIEW_ROLES,
  SESSION_COOKIE,
} from "@/lib/server-session";

const ROUTES = {
  "intake": { method: "POST", path: "/api/v1/intake" },
  "review/queue": {
    method: "GET",
    path: "/api/v1/review/queue",
    roles: REVIEW_ROLES,
  },
  "review/approve": {
    method: "POST",
    path: "/api/v1/review/approve",
    roles: REVIEW_ROLES,
  },
  "review/deny": {
    method: "POST",
    path: "/api/v1/review/deny",
    roles: REVIEW_ROLES,
  },
  "analytics/metrics": {
    method: "GET",
    path: "/api/v1/analytics/metrics",
    roles: ANALYTICS_ROLES,
  },
};

async function forward(request, context, method) {
  const { segments } = await context.params;
  const key = segments.join("/");
  const route = ROUTES[key];
  if (!route || route.method !== method) {
    return NextResponse.json({ error: "This API route is not available." }, { status: 404 });
  }
  if (method !== "GET" && !isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  let claims = null;
  if (cookie && process.env.JWT_SECRET) {
    try {
      claims = jwt.verify(cookie, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      claims = null;
    }
  }

  if (route.roles && (!claims || !route.roles.includes(claims.role))) {
    return NextResponse.json(
      { error: claims ? "You do not have access to this area." : "Please sign in to continue." },
      { status: claims ? 403 : 401 },
    );
  }

  let body;
  if (method !== "GET") {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 32 * 1024) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
    }
  }

  try {
    const response = await fetch(backendUrl(route.path), {
      method,
      headers: {
        ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { Authorization: ["Bearer", cookie].join(" ") } : {}),
      },
      ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const contentType = response.headers.get("content-type") || "";
    if (response.status === 404) {
      return NextResponse.json(
        { error: "This capability is not available in the backend yet. The service API must be implemented before this view can operate." },
        { status: 503 },
      );
    }
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: `The backend returned an unexpected response (${response.status}).` },
        { status: response.ok ? 502 : response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "The backend is unavailable. Please try again later." },
      { status: 502 },
    );
  }
}

export const GET = (request, context) => forward(request, context, "GET");
export const POST = (request, context) => forward(request, context, "POST");
