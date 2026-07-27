import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

const metrics = [
  ["Dataset version", "Not evaluated yet"],
  ["Model version", "pixelvault-dev-baseline"],
  ["Training date", "Not evaluated yet"],
  ["Accuracy", "Not evaluated yet"],
  ["F1 score", "Not evaluated yet"],
  ["ROC-AUC", "Not evaluated yet"],
  ["PR-AUC", "Not evaluated yet"],
  ["Model size", "Not evaluated yet"],
  ["Average inference latency", "Not evaluated yet"],
  ["Input requirements", "PNG or JPEG, local or API-assisted analysis"],
];

export default function ModelInfoPage() {
  return (
    <SiteShell
      title="Model Information"
      subtitle="Developer-facing model metadata for the steganalysis module. Until training is complete, the evaluation fields remain marked as not evaluated yet."
      actions={
        <Link href="/detect" className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
          Open detector
        </Link>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([label, value]) => (
          <article key={label} className="glass rounded-3xl p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</div>
            <div className="mt-3 text-lg font-semibold text-white">{value}</div>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Limitations</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            <li>• The detector is an estimate, not a proof of hidden content.</li>
            <li>• Model training artifacts are not bundled until they are generated locally or on free infrastructure.</li>
            <li>• A strong calibration and leakage-free split are required before any production score should be trusted.</li>
          </ul>
        </article>

        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Model card summary</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            PixelVault’s intended production detector is a calibrated steganalysis model trained on source-image separated datasets with statistical features and a lightweight CNN baseline. Until training is complete, the UI should treat the detector as developmental.
          </p>
        </article>
      </section>
    </SiteShell>
  );
}