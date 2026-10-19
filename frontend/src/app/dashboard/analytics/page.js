import { redirect } from "next/navigation";
import AnalyticsDashboard from "@/components/analytics-dashboard";
import { ANALYTICS_ROLES, getSession } from "@/lib/server-session";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!ANALYTICS_ROLES.includes(session.role)) {
    return (
      <section className="rounded-2xl border border-[#e6d7c4] bg-white p-7">
        <h2 className="text-xl font-semibold">Analytics access restricted</h2>
        <p className="mt-2 text-sm leading-6 text-[#60736c]">Your role does not include program analytics. Contact an administrator if you need access.</p>
      </section>
    );
  }
  return <AnalyticsDashboard />;
}
