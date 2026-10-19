"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await login({ email, password });
      router.replace(response.user.role === "Auditor" ? "/dashboard/analytics" : "/dashboard/review");
      router.refresh();
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={submit}>
      <label className="block text-sm font-semibold" htmlFor="email">
        Work email
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[#dce4dc] px-4 py-3 font-normal outline-none focus:border-[#49866c] focus:ring-2 focus:ring-[#49866c]/15"
          placeholder="name@organization.org"
        />
      </label>
      <label className="block text-sm font-semibold" htmlFor="password">
        Password
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[#dce4dc] px-4 py-3 font-normal outline-none focus:border-[#49866c] focus:ring-2 focus:ring-[#49866c]/15"
          placeholder="Enter your password"
        />
      </label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      <button
        className="w-full rounded-xl bg-[#185c4b] px-5 py-3.5 font-semibold text-white transition hover:bg-[#10483b] disabled:cursor-wait disabled:opacity-60"
        type="submit"
        disabled={submitting}
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs leading-5 text-[#71817a]">
        Access is for authorized staff and partner users. Contact your system administrator if you need an account.
      </p>
    </form>
  );
}
