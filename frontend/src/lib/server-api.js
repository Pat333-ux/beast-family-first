export function backendUrl(path) {
  const base = process.env.BACKEND_API_URL || "http://localhost:4000";
  const backend = new URL(base);
  if (!["http:", "https:"].includes(backend.protocol)) {
    throw new Error("BACKEND_API_URL must use HTTP or HTTPS");
  }
  if (process.env.NODE_ENV === "production" && backend.protocol !== "https:") {
    throw new Error("BACKEND_API_URL must use HTTPS in production");
  }
  if (backend.username || backend.password) {
    throw new Error("BACKEND_API_URL must not contain credentials");
  }
  backend.pathname = `${backend.pathname.replace(/\/$/, "")}${path}`;
  backend.search = "";
  backend.hash = "";
  return backend;
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return false;
  return request.headers.get("sec-fetch-site") !== "cross-site";
}
