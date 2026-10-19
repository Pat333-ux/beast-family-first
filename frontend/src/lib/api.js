export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest(path, { method = "GET", body } = {}) {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error || `The request could not be completed (${response.status}).`,
      response.status,
    );
  }

  return data;
}

export const submitIntake = (intake) =>
  apiRequest("/api/backend/intake", { method: "POST", body: intake });

export const fetchReviewQueue = () => apiRequest("/api/backend/review/queue");

export const submitReviewDecision = (decision) =>
  apiRequest(`/api/backend/review/${decision.decision}`, {
    method: "POST",
    body: decision,
  });

export const fetchAnalytics = () => apiRequest("/api/backend/analytics/metrics");

export const login = (credentials) =>
  apiRequest("/api/auth/login", { method: "POST", body: credentials });

export const logout = () => apiRequest("/api/auth/logout", { method: "POST" });
