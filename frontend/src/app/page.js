import IntakeWizard from "@/components/intake-wizard";
import SiteHeader from "@/components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-20 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pt-20">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d6e4d8] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#28624f]">
              <span className="h-2 w-2 rounded-full bg-[#60a57b]" />
              Family support starts here
            </p>
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#18332e] sm:text-6xl">
              One application.
              <br />
              <span className="text-[#49866c]">A path forward.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[#60736c]">
              Tell us what your household needs. A member of our support team
              will review your application and help connect you with services.
            </p>
            <div className="mt-10 grid max-w-md grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#e1e7df] bg-white p-5">
                <span className="text-xl" aria-hidden="true">01</span>
                <p className="mt-3 text-sm font-semibold">Share what you need</p>
                <p className="mt-1 text-xs leading-5 text-[#71817a]">A simple, guided application.</p>
              </div>
              <div className="rounded-2xl border border-[#e1e7df] bg-white p-5">
                <span className="text-xl" aria-hidden="true">02</span>
                <p className="mt-3 text-sm font-semibold">Talk with a person</p>
                <p className="mt-1 text-xs leading-5 text-[#71817a]">Staff review every request.</p>
              </div>
            </div>
            <p className="mt-6 max-w-md text-xs leading-5 text-[#71817a]">
              If you or someone else is in immediate danger, call 911. This
              application is not an emergency response service.
            </p>
          </div>
          <IntakeWizard />
        </section>
      </main>
    </>
  );
}
