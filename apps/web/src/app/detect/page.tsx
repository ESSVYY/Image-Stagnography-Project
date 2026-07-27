"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { formatBytes, formatPercent } from "@/lib/format";
import { recordLocalAction } from "@/lib/local-stats";
import { detectStegoSignals } from "@/lib/pixelvault/metrics";
import { frameFromFile } from "@/lib/pixelvault/stego";
import type { DetectionResult, ImageFrame } from "@/lib/pixelvault/types";

function useObjectUrl(file?: File | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-medium text-slate-200">{label}</div>
      {children}
      {hint ? <div className="text-xs leading-5 text-slate-400">{hint}</div> : null}
    </label>
  );
}

function ResultChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function ProbabilityGauge({ result }: { result?: DetectionResult }) {
  const value = result ? Math.round(result.probability * 100) : 0;
  return (
    <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
      <div className="relative grid h-44 w-44 place-items-center">
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,rgba(103,232,249,0.95)_0%,rgba(16,185,129,0.85)_var(--stop),rgba(15,23,42,0.25)_var(--stop))]" style={{ ["--stop" as string]: `${value}%` }} />
        <div className="relative grid h-32 w-32 place-items-center rounded-full border border-white/10 bg-slate-950 text-center">
          <div>
            <div className="text-4xl font-semibold text-white">{value}%</div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Estimated likelihood</div>
          </div>
        </div>
      </div>
      <div className="mt-4 text-center text-sm text-slate-300">
        Confidence: {result ? formatPercent(result.confidence * 100) : "0%"}
      </div>
    </div>
  );
}

export default function DetectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [frame, setFrame] = useState<ImageFrame | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Upload an image to analyze.");

  const previewUrl = useObjectUrl(file);

  useEffect(() => {
    if (!file) {
      setFrame(null);
      setPreviewError(null);
      return;
    }

    let active = true;
    frameFromFile(file)
      .then((nextFrame) => {
        if (active) {
          setFrame(nextFrame);
          setPreviewError(null);
          setStatus("Image loaded. Run the analysis to estimate whether hidden data may exist.");
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setFrame(null);
          setPreviewError(loadError instanceof Error ? loadError.message : "Could not read the image.");
        }
      });

    return () => {
      active = false;
    };
  }, [file]);

  const resultLabel = useMemo(() => {
    if (!result) {
      return "Not evaluated yet";
    }

    return result.category;
  }, [result]);

  const handleAnalyze = async () => {
    if (!frame) {
      setError("Upload a PNG or JPEG image first.");
      return;
    }

    setProcessing(true);
    setError(null);
    setStatus("Computing statistical steganalysis features...");

    try {
      const nextResult = detectStegoSignals(frame);
      setResult(nextResult);
      setStatus(`Analysis complete: ${nextResult.category}.`);
      recordLocalAction("detectionScans", "Image analyzed locally by the detector");
      recordLocalAction("imagesProcessed", "Detector scan completed");
    } catch (analysisError: unknown) {
      setError(analysisError instanceof Error ? analysisError.message : "Detection failed.");
      setStatus("Analysis unavailable.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SiteShell
      title="AI Steganography Detector"
      subtitle="Upload a PNG or JPEG, analyze the image statistics, and receive an estimated likelihood that hidden data may be present. This is a calibrated estimate, not proof."
      actions={
        <Link href="/lab" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100">
          Open lab
        </Link>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <article className="glass rounded-3xl p-6">
          <div className="rounded-3xl border border-dashed border-cyan-400/25 bg-slate-950/40 p-8 text-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300">ML</div>
              <div>
                <h2 className="text-2xl font-semibold text-white">Upload an image for analysis</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">The score comes from image statistics, LSB balance, and residual-style features. It can still be wrong.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950">
                Select image
                <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          {previewError ? <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{previewError}</div> : null}

          {file ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50">
                {previewUrl ? <img src={previewUrl} alt="Uploaded preview" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="grid gap-3">
                <ResultChip label="Filename" value={file.name} />
                <ResultChip label="File size" value={formatBytes(file.size)} />
                <ResultChip label="Analysis state" value={status} />
                <ResultChip label="Estimated category" value={resultLabel} />
              </div>
            </div>
          ) : null}
        </article>

        <aside className="grid gap-6">
          <article className="glass rounded-3xl p-6">
            <ProbabilityGauge result={result ?? undefined} />
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={!frame || processing}
                className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing ? "Analyzing..." : "Analyze image"}
              </button>
            </div>
            {error ? <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
              The detector estimates likelihood only. A low score does not prove the image is clean, and a high score does not prove hidden data exists.
            </div>
          </article>

          <article className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-semibold text-white">Influencing signals</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(result?.signals ?? [
                { label: "LSB balance drift", value: "Waiting for analysis" },
                { label: "Neighbor variance", value: "Waiting for analysis" },
                { label: "Entropy", value: "Waiting for analysis" },
                { label: "Channel mass shift", value: "Waiting for analysis" },
              ]).map((signal) => (
                <ResultChip key={signal.label} label={signal.label} value={signal.value} />
              ))}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {(result?.statistics ?? [
                { label: "Width", value: "-" },
                { label: "Height", value: "-" },
                { label: "Pixels", value: "-" },
                { label: "Channels analyzed", value: "RGB" },
              ]).map((stat) => (
                <ResultChip key={stat.label} label={stat.label} value={stat.value} />
              ))}
            </div>
          </article>

          <article className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-semibold text-white">Limitations</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {(result?.limitations ?? [
                "The detector is an estimate and may produce false positives or false negatives.",
                "Compression, resizing, and screenshots can change the score.",
                "Natural image texture can look suspicious to a statistical model.",
              ]).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </article>
        </aside>
      </section>
    </SiteShell>
  );
}