"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { loadLocalStats, type LocalStats } from "@/lib/local-stats";
import { formatNumber } from "@/lib/format";

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="glass rounded-3xl p-6">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{note}</p>
    </article>
  );
}

const NAV_CARDS = [
  { href: "/hide", title: "Hide data", description: "Encrypt text or files inside a PNG image." },
  { href: "/extract", title: "Extract data", description: "Recover a hidden payload with the correct password." },
  { href: "/detect", title: "AI detector", description: "Estimate whether an image may contain hidden data." },
  { href: "/lab", title: "Image comparison lab", description: "Inspect quality metrics and pixel differences." },
  { href: "/docs", title: "Documentation", description: "Read the steganography, encryption, and threat model guide." },
  { href: "/about", title: "About the project", description: "Review the architecture and portfolio summary." },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<LocalStats>(loadLocalStats());

  useEffect(() => {
    const sync = () => setStats(loadLocalStats());
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return (
    <SiteShell
      title="Workspace Dashboard"
      subtitle="Everything in PixelVault is designed to stay useful without a database: local usage stats, quick links, and the core browser-side workflow."
      actions={
        <Link href="/hide" className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
          Hide data
        </Link>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Images processed" value={formatNumber(stats.imagesProcessed)} note="Images loaded, encoded, extracted, or analyzed locally." />
        <MetricCard label="Messages encoded" value={formatNumber(stats.messagesEncoded)} note="Text or file payloads hidden inside PNG images." />
        <MetricCard label="Files extracted" value={formatNumber(stats.filesExtracted)} note="Recovered files downloaded after successful decryption." />
        <MetricCard label="Detection scans" value={formatNumber(stats.detectionScans)} note="Local or API-assisted steganalysis estimates." />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {NAV_CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="glass rounded-3xl p-6 transition hover:-translate-y-0.5 hover:border-cyan-400/30">
            <div className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Tool</div>
            <h2 className="mt-3 text-xl font-semibold text-white">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{card.description}</p>
          </Link>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Local history</h2>
          {stats.history.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">
              No local activity yet. Encode or analyze an image to populate this timeline.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.history.map((entry) => (
                <li key={`${entry.action}-${entry.timestamp}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-white">{entry.action}</div>
                      <div className="text-sm text-slate-400">{entry.detail}</div>
                    </div>
                    <time className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Privacy posture</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <li>• Core hide/extract operations run in the browser and do not require a paid API.</li>
            <li>• Uploaded images, passwords, and recovered content are not stored permanently.</li>
            <li>• The detector can operate offline in estimation mode if the API is unavailable.</li>
            <li>• Local-only stats stay in browser storage unless you clear them.</li>
          </ul>
        </article>
      </section>
    </SiteShell>
  );
}