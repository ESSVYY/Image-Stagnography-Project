"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { formatBytes, formatPercent } from "@/lib/format";
import { recordLocalAction } from "@/lib/local-stats";
import { createDifferenceHeatmap } from "@/lib/pixelvault/visuals";
import { compareFrames } from "@/lib/pixelvault/metrics";
import { extractFromFrame, frameFromFile } from "@/lib/pixelvault/stego";
import type { ImageComparisonMetrics, ImageFrame } from "@/lib/pixelvault/types";

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

function ResultChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
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

function Histogram({ original, encoded }: { original: number[]; encoded: number[] }) {
  return (
    <div className="grid gap-2">
      {original.map((value, index) => {
        const encodedValue = encoded[index] || 0;
        return (
          <div key={index} className="grid grid-cols-[40px_1fr_1fr_40px] items-center gap-2 text-[11px] text-slate-400">
            <span>{index}</span>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${Math.min(100, value)}%` }} />
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.min(100, encodedValue)}%` }} />
            </div>
            <span>{Math.abs(value - encodedValue).toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

function computeHistogram(frame: ImageFrame, channel: 0 | 1 | 2) {
  const histogram = new Array<number>(16).fill(0);
  for (let index = channel; index < frame.data.data.length; index += 4) {
    histogram[Math.min(15, Math.floor(frame.data.data[index] / 16))] += 1;
  }
  const max = Math.max(1, ...histogram);
  return histogram.map((value) => (value / max) * 100);
}

function computeLsbDistribution(frame: ImageFrame) {
  return [0, 1, 2].map((channel) => {
    let zero = 0;
    let one = 0;
    for (let index = channel; index < frame.data.data.length; index += 4) {
      if ((frame.data.data[index] & 1) === 0) zero += 1;
      else one += 1;
    }
    const total = Math.max(1, zero + one);
    return [Math.round((zero / total) * 100), Math.round((one / total) * 100)];
  });
}

export default function LabPage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [encodedFile, setEncodedFile] = useState<File | null>(null);
  const [originalFrame, setOriginalFrame] = useState<ImageFrame | null>(null);
  const [encodedFrame, setEncodedFrame] = useState<ImageFrame | null>(null);
  const [password, setPassword] = useState("");
  const [slider, setSlider] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [metrics, setMetrics] = useState<ImageComparisonMetrics | null>(null);
  const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Load both images to compare them.");
  const [payloadUsage, setPayloadUsage] = useState<string>("Not inspected yet");

  const originalPreview = useObjectUrl(originalFile);
  const encodedPreview = useObjectUrl(encodedFile);

  useEffect(() => {
    const loadFrame = async (file: File | null, setter: (frame: ImageFrame | null) => void, detail: string) => {
      if (!file) {
        setter(null);
        return;
      }

      const frame = await frameFromFile(file);
      setter(frame);
      recordLocalAction("imagesProcessed", detail);
    };

    loadFrame(originalFile, setOriginalFrame, "Original image loaded in comparison lab").catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Could not load the original image.");
    });
  }, [originalFile]);

  useEffect(() => {
    const loadFrame = async (file: File | null, setter: (frame: ImageFrame | null) => void, detail: string) => {
      if (!file) {
        setter(null);
        return;
      }

      const frame = await frameFromFile(file);
      setter(frame);
      recordLocalAction("imagesProcessed", detail);
    };

    loadFrame(encodedFile, setEncodedFrame, "Encoded image loaded in comparison lab").catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Could not load the encoded image.");
    });
  }, [encodedFile]);

  useEffect(() => {
    return () => {
      if (heatmapUrl) {
        URL.revokeObjectURL(heatmapUrl);
      }
    };
  }, [heatmapUrl]);

  const histogramOriginal = useMemo(() => (originalFrame ? [0, 1, 2].map((channel) => computeHistogram(originalFrame, channel as 0 | 1 | 2)) : []), [originalFrame]);
  const histogramEncoded = useMemo(() => (encodedFrame ? [0, 1, 2].map((channel) => computeHistogram(encodedFrame, channel as 0 | 1 | 2)) : []), [encodedFrame]);

  const lsbOriginal = useMemo(() => (originalFrame ? computeLsbDistribution(originalFrame) : []), [originalFrame]);
  const lsbEncoded = useMemo(() => (encodedFrame ? computeLsbDistribution(encodedFrame) : []), [encodedFrame]);

  const handleAnalyze = async () => {
    if (!originalFrame || !encodedFrame) {
      setError("Upload both the original and encoded images first.");
      return;
    }

    setError(null);
    setStatus("Comparing images and rendering the difference heatmap...");

    try {
      const nextMetrics = compareFrames(originalFrame, encodedFrame);
      setMetrics(nextMetrics);
      const heatmap = await createDifferenceHeatmap(originalFrame, encodedFrame);
      setHeatmapUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return heatmap.objectUrl;
      });
      setStatus("Comparison complete.");
      recordLocalAction("comparisons", "Image comparison run in the lab");

      if (password) {
        try {
          const extracted = await extractFromFrame(encodedFrame, password);
          const payloadBytes = extracted.kind === "file" ? extracted.file?.size ?? 0 : new TextEncoder().encode(extracted.text || "").byteLength;
          const approxUsage = Math.max(0, Math.min(100, (payloadBytes / nextMetrics.payloadCapacityBytes) * 100));
          setPayloadUsage(`${payloadBytes} bytes extracted, approximately ${approxUsage.toFixed(1)}% of the image capacity.`);
        } catch {
          setPayloadUsage("Password did not match an inspectable PixelVault payload.");
        }
      } else {
        setPayloadUsage("Provide a password to inspect the embedded payload size, if the encoded image contains a PixelVault payload.");
      }
    } catch (comparisonError: unknown) {
      setError(comparisonError instanceof Error ? comparisonError.message : "Could not compare the images.");
      setStatus("Comparison unavailable.");
    }
  };

  const sliderOverlay = `${100 - slider}%`;

  return (
    <SiteShell
      title="Image Comparison Lab"
      subtitle="Compare an original and encoded image with a before-after slider, pixel-difference heatmap, and a full set of quality metrics."
      actions={
        <Link href="/hide" className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
          Hide data
        </Link>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <article className="glass rounded-3xl p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Original image" hint="Upload the clean source image.">
              <input type="file" accept="image/png,image/jpeg" onChange={(event) => setOriginalFile(event.target.files?.[0] ?? null)} className="block w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300" />
            </Field>
            <Field label="Encoded image" hint="Upload the stego image generated by PixelVault.">
              <input type="file" accept="image/png,image/jpeg" onChange={(event) => setEncodedFile(event.target.files?.[0] ?? null)} className="block w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300" />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Optional password" hint="Used to inspect the payload size when the encoded image contains a PixelVault payload.">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white"
                placeholder="Enter the payload password"
              />
            </Field>
            <Field label="Zoom" hint="Adjust the preview scale for closer inspection.">
              <input type="range" min={50} max={200} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full" />
              <div className="mt-1 text-sm text-slate-300">{zoom}%</div>
            </Field>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
              <span>Before-after slider</span>
              <span>{slider}% encoded image</span>
            </div>
            <input type="range" min={0} max={100} value={slider} onChange={(event) => setSlider(Number(event.target.value))} className="w-full" />
            <div className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black">
              <div className="grid place-items-center bg-slate-950" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}>
                {originalPreview ? <img src={originalPreview} alt="Original image preview" className="w-full opacity-100" /> : <div className="p-16 text-sm text-slate-500">Original image preview</div>}
              </div>
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${sliderOverlay} 0 0)` }}>
                <div className="grid place-items-center" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}>
                  {encodedPreview ? <img src={encodedPreview} alt="Encoded image preview" className="w-full" /> : <div className="p-16 text-sm text-slate-500">Encoded image preview</div>}
                </div>
              </div>
            </div>
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void handleAnalyze()} className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950">
              Compare images
            </button>
            <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200">{status}</div>
          </div>
        </article>

        <aside className="grid gap-6">
          <article className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-semibold text-white">Quality metrics</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ResultChip label="MSE" value={metrics ? metrics.mse.toFixed(6) : "Not evaluated yet"} />
              <ResultChip label="PSNR" value={metrics ? `${metrics.psnr.toFixed(2)} dB` : "Not evaluated yet"} />
              <ResultChip label="SSIM" value={metrics ? metrics.ssim.toFixed(5) : "Not evaluated yet"} />
              <ResultChip label="Changed pixels" value={metrics ? formatPercent(metrics.changedPixelPercent) : "Not evaluated yet"} />
              <ResultChip label="Payload capacity usage" value={payloadUsage} />
              <ResultChip label="File-size comparison" value={originalFile && encodedFile ? `${formatBytes(originalFile.size)} → ${formatBytes(encodedFile.size)}` : "Waiting for both images"} />
            </div>
          </article>

          <article className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-semibold text-white">Difference heatmap</h2>
            {heatmapUrl ? (
              <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50 p-3">
                <img src={heatmapUrl} alt="Pixel difference heatmap" className="w-full rounded-2xl" />
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-sm leading-6 text-slate-400">
                The heatmap appears after comparison and highlights changed pixel regions.
              </div>
            )}
          </article>

          <article className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-semibold text-white">RGB histogram comparison</h2>
            <div className="mt-4 space-y-5">
              {["Red", "Green", "Blue"].map((channel, index) => (
                <div key={channel} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
                    <span>{channel}</span>
                    <span>Original vs encoded</span>
                  </div>
                  <Histogram original={histogramOriginal[index] || []} encoded={histogramEncoded[index] || []} />
                </div>
              ))}
            </div>
          </article>

          <article className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-semibold text-white">Least-significant-bit distribution</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {lsbOriginal.map((pair, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <div className="mb-2 font-medium">Channel {index + 1}</div>
                  <div>Original: {pair[0]}% zero, {pair[1]}% one</div>
                  <div>Encoded: {lsbEncoded[index]?.[0] ?? 0}% zero, {lsbEncoded[index]?.[1] ?? 0}% one</div>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </SiteShell>
  );
}