"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAnalytics } from "@/lib/api";

function formatNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";
}

function formatCurrency(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
    : "—";
}

function StatCard({ label, value, note, accent = "text-[#185c4b]" }) {
  return (
    <article className="rounded-2xl border border-[#dce4dc] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#71817a]">{label}</p>
      <p className={`mt-4 text-3xl font-semibold tracking-tight ${accent}`}>{value}</p>
      <p className="mt-2 text-xs text-[#87948d]">{note}</p>
    </article>
  );
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMetrics(await fetchAnalytics());
    } catch (requestError) {
      setMetrics(null);
      setError(requestError.message || "Unable to load program analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const volume = metrics?.intakeVolumeByPriority || metrics?.intake_volume_by_priority || {};
  const fulfillment = metrics?.resourceFulfillmentByCategory || metrics?.resource_fulfillment_by_category || {};
  const averageProcessing = metrics?.averageProcessingMinutes ?? metrics?.average_processing_minutes;
  const averageResolution = metrics?.averageResolutionHours ?? metrics?.average_resolution_hours;
  const savings = metrics?.estimatedIndianaCostSavings ?? metrics?.estimated_indiana_cost_savings;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Program analytics</h2>
          <p className="mt-1 text-sm text-[#71817a]">Operational metrics returned by the program API.</p>
        </div>
        <button onClick={loadMetrics} className="rounded-xl border border-[#dce4dc] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#f5f8f4]" type="button">Refresh metrics</button>
      </div>

      {loading && <p className="mb-5 rounded-xl border border-[#dce4dc] bg-white p-4 text-sm text-[#60736c]">Loading live metrics…</p>}
      {error && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="alert">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Emergency intakes" value={formatNumber(volume.EMERGENCY ?? volume.emergency)} note="Intakes by priority" accent="text-red-700" />
        <StatCard label="Urgent intakes" value={formatNumber(volume.URGENT ?? volume.urgent)} note="Intakes by priority" accent="text-orange-700" />
        <StatCard label="Standard intakes" value={formatNumber(volume.STANDARD ?? volume.standard)} note="Intakes by priority" accent="text-blue-700" />
        <StatCard label="Estimated cost savings" value={formatCurrency(savings)} note="Indiana program estimate" />
        <StatCard label="Avg. processing time" value={averageProcessing == null ? "—" : `${formatNumber(averageProcessing)} min`} note="Intake to first review" />
        <StatCard label="Avg. resolution time" value={averageResolution == null ? "—" : `${formatNumber(averageResolution)} hrs`} note="Open to resolved case" />
      </div>

      <section className="mt-6 rounded-2xl border border-[#dce4dc] bg-white p-5 sm:p-6">
        <h3 className="text-base font-semibold">Partner-dispatched pathways</h3>
        <p className="mt-1 text-sm text-[#71817a]">Counts reflect partner webhook acceptance, not confirmed service completion.</p>
        {Object.keys(fulfillment).length ? (
          <div className="mt-5 space-y-4">
            {Object.entries(fulfillment).map(([category, count]) => {
              const max = Math.max(...Object.values(fulfillment).filter((value) => typeof value === "number"), 1);
              const value = typeof count === "number" ? count : 0;
              return (
                <div key={category}>
                  <div className="mb-1.5 flex justify-between gap-4 text-sm"><span className="font-medium">{category}</span><span className="text-[#60736c]">{formatNumber(value)}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#edf1eb]"><div className="h-full rounded-full bg-[#6ba17e]" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-[#f5f7f3] p-4 text-sm text-[#71817a]">
            {loading ? "Waiting for metrics…" : error ? "Resource fulfillment metrics are unavailable." : "No resource fulfillment data was returned."}
          </p>
        )}
      </section>
      {!loading && !error && metrics && (
        <p className="mt-4 text-xs text-[#87948d]">Values are displayed as supplied by the API; unavailable fields are shown as dashes.</p>
      )}
    </div>
  );
}
