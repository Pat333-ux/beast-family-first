import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import SiteHeader from "@/components/site-header";
import { getSession } from "@/lib/server-session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "Auditor" ? "/dashboard/analytics" : "/dashboard/review");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid min-h-[calc(100vh-76px)] w-full max-w-7xl place-items-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-[#dce4dc] bg-white p-7 shadow-[0_16px_50px_-32px_rgba(24,51,46,0.3)] sm:p-9">
          <Link href="/" className="text-xs font-semibold text-[#49866c] no-underline">← Back to family portal</Link>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Staff sign in</h1>
          <p className="mt-2 text-sm leading-6 text-[#60736c]">Sign in to review cases and access program analytics.</p>
          <LoginForm />
        </div>
      </main>
    </>
  );
}
