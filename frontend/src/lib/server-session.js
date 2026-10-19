import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const STAFF_ROLES = ["Caseworker", "Supervisor", "Administrator", "Auditor"];
export const REVIEW_ROLES = ["Caseworker", "Supervisor", "Administrator"];
export const ANALYTICS_ROLES = ["Supervisor", "Administrator", "Auditor"];
export const SESSION_COOKIE = "beast_session";

export async function getSession() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const session = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (!session.sub || !STAFF_ROLES.includes(session.role)) return null;
    return { userId: session.sub, email: session.email, role: session.role };
  } catch {
    return null;
  }
}
