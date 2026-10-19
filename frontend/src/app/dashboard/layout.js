import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { ANALYTICS_ROLES, getSession, REVIEW_ROLES } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <SiteHeader staffEmail={session.email} staffRole={session.role} />
      <main className="mx-auto w-full max-w-7xl px-6 py-9 lg:px-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#49866c]">Staff workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Operations dashboard</h1>
          </div>
          <span className="rounded-full border border-[#dce4dc] bg-white px-3 py-1.5 text-xs font-semibold text-[#60736c]">{session.role}</span>
        </div>
        <nav className="mb-7 flex gap-2 border-b border-[#dce4dc]" aria-label="Dashboard">
          {REVIEW_ROLES.includes(session.role) && (
            <Link href="/dashboard/review" className="border-b-2 border-[#49866c] px-4 py-3 text-sm font-semibold text-[#185c4b] no-underline">Review queue</Link>
          )}
          {ANALYTICS_ROLES.includes(session.role) && (
            <Link href="/dashboard/analytics" className="border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-[#71817a] no-underline hover:border-[#a9c7b2] hover:text-[#185c4b]">Program analytics</Link>
          )}
        </nav>
        {children}
      </main>
    </>
  );
}
