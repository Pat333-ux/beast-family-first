"use client";

import { useState } from "react";
import { submitIntake } from "@/lib/api";

const NEEDS = [
  { id: "housing", label: "Housing or rent support", detail: "Keeping or finding a safe place to live" },
  { id: "food", label: "Food assistance", detail: "Groceries or help accessing food benefits" },
  { id: "trauma_prevention", label: "Family or trauma support", detail: "Counseling, caregiver, or family support" },
  { id: "domestic_safety", label: "Domestic safety", detail: "Support to help your household feel safe" },
  { id: "mental_health", label: "Mental health support", detail: "Finding care or support for emotional wellbeing" },
];

const STEPS = ["Household", "What you need", "Review"];
const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  county: "",
  dependentsCount: "0",
  needs: [],
};

export default function IntakeWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  function updateField(event) {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  }

  function toggleNeed(id) {
    setForm((previous) => ({
      ...previous,
      needs: previous.needs.includes(id)
        ? previous.needs.filter((need) => need !== id)
        : [...previous.needs, id],
    }));
  }

  function continueToNeeds(event) {
    event.preventDefault();
    setError("");
    if (!form.fullName.trim() || !form.email.trim() || !form.county.trim()) {
      setError("Please complete your name, email, and county to continue.");
      return;
    }
    setStep(1);
  }

  async function submitApplication(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await submitIntake({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        county: form.county.trim(),
        dependentsCount: Number(form.dependentsCount),
        needs: form.needs,
      });
      const caseRecord = response.case || response;
      const caseId = caseRecord.id || caseRecord.caseId;
      if (!caseId) throw new Error("The server did not return a case tracking ID.");
      const shortId = String(caseId).replaceAll("-", "").slice(0, 4).toUpperCase();
      setConfirmation({
        trackingId: caseRecord.trackingId || caseRecord.tracking_id || `INT-${new Date().getFullYear()}-${shortId}`,
        caseId,
      });
    } catch (requestError) {
      setError(requestError.message || "We could not submit your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <section className="rounded-3xl border border-[#dce4dc] bg-white p-7 shadow-[0_16px_50px_-32px_rgba(24,51,46,0.3)] sm:p-9" aria-live="polite">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e6f3e9] text-xl text-[#28624f]" aria-hidden="true">✓</span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">Application received</h2>
        <p className="mt-2 leading-6 text-[#60736c]">A team member will review your request. Keep this number for your records.</p>
        <div className="mt-6 rounded-2xl bg-[#f3f7f1] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#71817a]">Tracking number</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#185c4b]">{confirmation.trackingId}</p>
          <p className="mt-2 break-all text-xs text-[#71817a]">Case reference: {confirmation.caseId}</p>
        </div>
        <button className="mt-6 text-sm font-semibold text-[#185c4b] underline" onClick={() => window.location.reload()}>
          Start another application
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-[#dce4dc] bg-white p-6 shadow-[0_16px_50px_-32px_rgba(24,51,46,0.3)] sm:p-9">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#49866c]">Family application</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Let’s get started</h2>
        </div>
        <span className="rounded-full bg-[#f2f7f2] px-3 py-1.5 text-xs font-semibold text-[#28624f]">
          {step + 1} of {STEPS.length}
        </span>
      </div>
      <ol className="mt-7 grid grid-cols-3 gap-2" aria-label="Application progress">
        {STEPS.map((label, index) => (
          <li key={label}>
            <div className={`h-1 rounded-full ${index <= step ? "bg-[#49866c]" : "bg-[#e8ede7]"}`} />
            <span className={`mt-2 block text-[11px] ${index === step ? "font-bold text-[#185c4b]" : "text-[#87948d]"}`}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form className="mt-7 space-y-4" onSubmit={continueToNeeds}>
          <label className="block text-sm font-semibold" htmlFor="fullName">
            Head of household
            <input id="fullName" name="fullName" autoComplete="name" required value={form.fullName} onChange={updateField} className="mt-2 w-full rounded-xl border border-[#dce4dc] px-4 py-3 font-normal outline-none focus:border-[#49866c] focus:ring-2 focus:ring-[#49866c]/15" placeholder="Full name" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold" htmlFor="email">
              Email address
              <input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={updateField} className="mt-2 w-full rounded-xl border border-[#dce4dc] px-4 py-3 font-normal outline-none focus:border-[#49866c] focus:ring-2 focus:ring-[#49866c]/15" placeholder="you@example.com" />
            </label>
            <label className="block text-sm font-semibold" htmlFor="phone">
              Phone <span className="font-normal text-[#87948d]">(optional)</span>
              <input id="phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={updateField} className="mt-2 w-full rounded-xl border border-[#dce4dc] px-4 py-3 font-normal outline-none focus:border-[#49866c] focus:ring-2 focus:ring-[#49866c]/15" placeholder="(555) 555-0123" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold" htmlFor="county">
              Indiana county
              <input id="county" name="county" required value={form.county} onChange={updateField} className="mt-2 w-full rounded-xl border border-[#dce4dc] px-4 py-3 font-normal outline-none focus:border-[#49866c] focus:ring-2 focus:ring-[#49866c]/15" placeholder="County" />
            </label>
            <label className="block text-sm font-semibold" htmlFor="dependentsCount">
              Children in household
              <select id="dependentsCount" name="dependentsCount" value={form.dependentsCount} onChange={updateField} className="mt-2 w-full rounded-xl border border-[#dce4dc] bg-white px-4 py-3 font-normal outline-none focus:border-[#49866c] focus:ring-2 focus:ring-[#49866c]/15">
                {Array.from({ length: 11 }, (_, index) => <option key={index} value={index}>{index}{index === 10 ? "+" : ""}</option>)}
              </select>
            </label>
          </div>
          <div className="pt-2">
            <button className="w-full rounded-xl bg-[#185c4b] px-5 py-3.5 font-semibold text-white transition hover:bg-[#10483b]" type="submit">
              Continue to needs <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      )}

      {step === 1 && (
        <div className="mt-7">
          <p className="mb-4 text-sm leading-6 text-[#60736c]">Choose any areas where support could help. You can select more than one.</p>
          <div className="space-y-3">
            {NEEDS.map((need) => (
              <label key={need.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${form.needs.includes(need.id) ? "border-[#76a88b] bg-[#f3f8f3]" : "border-[#e4e9e3] hover:border-[#b6cbbb]"}`}>
                <input type="checkbox" checked={form.needs.includes(need.id)} onChange={() => toggleNeed(need.id)} className="mt-1 h-4 w-4 accent-[#185c4b]" />
                <span>
                  <span className="block text-sm font-semibold">{need.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#71817a]">{need.detail}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button className="rounded-xl border border-[#dce4dc] px-5 py-3 font-semibold hover:bg-[#f7f9f6]" onClick={() => setStep(0)} type="button">Back</button>
            <button className="flex-1 rounded-xl bg-[#185c4b] px-5 py-3 font-semibold text-white hover:bg-[#10483b]" onClick={() => setStep(2)} type="button">Review application <span aria-hidden="true">→</span></button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form className="mt-7" onSubmit={submitApplication}>
          <div className="space-y-3 rounded-2xl bg-[#f5f7f3] p-5">
            <div><p className="text-xs font-bold uppercase tracking-wider text-[#71817a]">Applicant</p><p className="mt-1 font-semibold">{form.fullName}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs font-bold uppercase tracking-wider text-[#71817a]">Email</p><p className="mt-1 break-all text-sm">{form.email}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-[#71817a]">County</p><p className="mt-1 text-sm">{form.county}</p></div>
            </div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-[#71817a]">Children in household</p><p className="mt-1 text-sm">{form.dependentsCount}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-[#71817a]">Support requested</p><p className="mt-1 text-sm">{form.needs.length ? form.needs.map((id) => NEEDS.find((need) => need.id === id)?.label).join(", ") : "No specific needs selected"}</p></div>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#71817a]">Your application will be reviewed by a staff member. Submission does not guarantee eligibility or benefits.</p>
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
          <div className="mt-6 flex gap-3">
            <button className="rounded-xl border border-[#dce4dc] px-5 py-3 font-semibold hover:bg-[#f7f9f6]" onClick={() => setStep(1)} type="button" disabled={submitting}>Back</button>
            <button className="flex-1 rounded-xl bg-[#185c4b] px-5 py-3 font-semibold text-white hover:bg-[#10483b] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </form>
      )}
      {error && step !== 2 && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      <p className="mt-6 border-t border-[#edf0eb] pt-4 text-xs leading-5 text-[#87948d]">
        Your information is used to connect your household with support services. Only share what you feel comfortable sharing.
      </p>
    </section>
  );
}
