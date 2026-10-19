import { redirect } from "next/navigation";
import ReviewQueue from "@/components/review-queue";
import { getSession, REVIEW_ROLES } from "@/lib/server-session";

export default async function ReviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!REVIEW_ROLES.includes(session.role)) {
    return (
      <section className="rounded-2xl border border-[#e6d7c4] bg-white p-7">
        <h2 className="text-xl font-semibold">Review access restricted</h2>
        <p className="mt-2 text-sm leading-6 text-[#60736c]">Your role does not include case review. Contact an administrator if you need access.</p>
      </section>
    );
  }
  return <ReviewQueue />;
}
