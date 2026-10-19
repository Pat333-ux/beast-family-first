"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReviewQueue, submitReviewDecision } from "@/lib/api";

const PRIORITY_ORDER = { EMERGENCY: 0, URGENT: 1, STANDARD: 2 };
const PATHWAYS = [
  "HOUSING_STABILIZATION_GRANT",
  "TRAUMA_PREVENTION_PATHWAY",
  "COMMUNITY_FOOD_NETWORK",
  "COUNSELING_NAVIGATION",
];

function priorityOf(item) {
  return String(item.priority || item.priorityLevel || item.assessment?.priority || "STANDARD").toUpperCase();
}

function caseIdOf(item) {
  return item.id || item.caseId || item.case_id || "Unknown";
}

function UrgencyBadge({ priority }) {
  const color = priority === "EMERGENCY"
    ? "bg-red-100 text-red-800"
    : priority === "URGENT"
      ? "bg-orange-100 text-orange-800"
      : "bg-blue-100 text-blue-800";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${color}`}>{priority}</span>;
}

export default function ReviewQueue() {
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pathways, setPathways] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchReviewQueue();
      const rows = Array.isArray(data) ? data : data.cases || data.queue || [];
      setCases([...rows].sort((a, b) =>
        (PRIORITY_ORDER[priorityOf(a)] ?? 3) - (PRIORITY_ORDER[priorityOf(b)] ?? 3)
      ));
    } catch (requestError) {
      setError(requestError.message || "Unable to load the review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  function openCase(item) {
    setSelected(item);
    setPathways(item.suggestedPathways || item.resources || []);
    setNotes("");
    setError("");
    setNotice("");
  }

  async function decide(decision) {
    setSaving(true);
    setError("");
    try {
      await submitReviewDecision({
        caseId: caseIdOf(selected),
        decision,
        pathways,
        notes: notes.trim(),
      });
      setCases((previous) => previous.filter((item) => caseIdOf(item) !== caseIdOf(selected)));
      setSelected(null);
      setNotice(`Case ${caseIdOf(selected)} ${decision === "approve" ? "approved" : "denied"}.`);
    } catch (requestError) {
      setError(requestError.message || "The review decision could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-[#dce4dc] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8ede7] p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Cases awaiting review</h2>
            <p className="mt-1 text-sm text-[#71817a]">Highest-priority requests appear first.</p>
          </div>
          <button onClick={loadQueue} className="rounded-xl border border-[#dce4dc] px-4 py-2.5 text-sm font-semibold hover:bg-[#f5f8f4]" type="button">Refresh queue</button>
        </div>
        {notice && <p className="mx-5 mt-5 rounded-xl bg-[#edf7ef] p-3 text-sm text-[#28624f]" role="status">{notice}</p>}
        {error && <p className="mx-5 mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="alert">{error}</p>}
        {loading ? (
          <p className="p-8 text-sm text-[#71817a]">Loading review queue…</p>
        ) : cases.length ? (
          <div className="divide-y divide-[#edf0eb]">
            {cases.map((item) => (
              <button key={caseIdOf(item)} className="grid w-full gap-4 px-5 py-5 text-left transition hover:bg-[#f8faf7] sm:grid-cols-[1fr_auto] sm:items-center sm:px-6" type="button" onClick={() => openCase(item)}>
                <span>
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-semibold">{caseIdOf(item)}</span>
                    <UrgencyBadge priority={priorityOf(item)} />
                  </span>
                  <span className="mt-2 block text-sm text-[#60736c]">{item.fullName || item.familyName || item.applicantName || "Family application"} · {item.county || "County not provided"}</span>
                </span>
                <span className="text-sm font-semibold text-[#185c4b]">Review case →</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#edf7ef] text-lg text-[#28624f]" aria-hidden="true">✓</span>
            <p className="mt-4 font-semibold">Your queue is clear</p>
            <p className="mt-1 text-sm text-[#71817a]">New cases will appear here when they are ready for review.</p>
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#102c25]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="case-title" className="my-6 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#49866c]">Case review</p>
                <h2 id="case-title" className="mt-2 text-2xl font-semibold">{caseIdOf(selected)}</h2>
                <p className="mt-1 text-sm text-[#71817a]">{selected.fullName || selected.familyName || selected.applicantName || "Family application"}</p>
              </div>
              <button className="rounded-lg px-3 py-2 text-sm text-[#60736c] hover:bg-[#f5f8f4]" type="button" onClick={() => setSelected(null)} aria-label="Close case review">Close</button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-[#f5f7f3] p-4">
              <UrgencyBadge priority={priorityOf(selected)} />
              <span className="text-sm text-[#60736c]">Score: {selected.assessment?.score ?? selected.calculatedScore ?? "Not provided"}</span>
              <span className="text-sm text-[#60736c]">Status: {selected.status || "Pending review"}</span>
            </div>
            <div className="mt-6">
              <h3 className="text-sm font-semibold">Suggested pathways</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PATHWAYS.map((pathway) => (
                  <label key={pathway} className="flex items-center gap-2 rounded-xl border border-[#e4e9e3] p-3 text-xs">
                    <input
                      type="checkbox"
                      checked={pathways.includes(pathway)}
                      onChange={() => setPathways((previous) => previous.includes(pathway) ? previous.filter((value) => value !== pathway) : [...previous, pathway])}
                      className="h-4 w-4 accent-[#185c4b]"
                    />
                    <span className="break-all">{pathway}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="mt-6 block text-sm font-semibold" htmlFor="review-notes">
              Review notes
              <textarea id="review-notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} className="mt-2 w-full rounded-xl border border-[#dce4dc] px-4 py-3 font-normal outline-none focus:border-[#49866c] focus:ring-2 focus:ring-[#49866c]/15" placeholder="Add notes for the case record" />
            </label>
            {error && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="alert">{error}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50" disabled={saving} onClick={() => decide("deny")} type="button">Deny request</button>
              <button className="rounded-xl bg-[#185c4b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10483b] disabled:opacity-50" disabled={saving} onClick={() => decide("approve")} type="button">{saving ? "Saving…" : "Approve & route"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
