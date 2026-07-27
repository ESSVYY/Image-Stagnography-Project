"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { downloadBlob } from "@/lib/download";
import { formatBytes, formatNumber, formatPercent } from "@/lib/format";
import { assessPasswordStrength } from "@/lib/password";
import { recordLocalAction } from "@/lib/local-stats";
import { createDifferenceHeatmap } from "@/lib/pixelvault/visuals";
import { encodeIntoFrame, frameFromFile } from "@/lib/pixelvault/stego";
import type { EncodingMode, ImageComparisonMetrics, ImageFrame, PayloadKind, PlainPayload } from "@/lib/pixelvault/types";

function useObjectUrl(file?: File | Blob | null) {
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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function DiffBars({ metrics }: { metrics?: ImageComparisonMetrics }) {
  const values = metrics?.histogramDelta ?? [0, 0, 0];
  return (
    <div className="space-y-3">
      {values.map((value, index) => (
        <div key={index}>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Channel {index + 1}</span>
            <span>{value.toFixed(3)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${Math.min(100, value * 18)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HidePage() {
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverFrame, setCoverFrame] = useState<ImageFrame | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [payloadKind, setPayloadKind] = useState<PayloadKind>("text");
  const [secretText, setSecretText] = useState("Meet at 19:30 behind the archive.");
  const [secretFile, setSecretFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [encodingMode, setEncodingMode] = useState<EncodingMode>("standard");
  const [iterations, setIterations] = useState(310_000);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encodedBlob, setEncodedBlob] = useState<Blob | null>(null);
  const [encodedUrl, setEncodedUrl] = useState<string | null>(null);
  const [diffUrl, setDiffUrl] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ImageComparisonMetrics | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const coverPreview = useObjectUrl(coverFile);
  const payloadPreview = useObjectUrl(secretFile);

  useEffect(() => {
    if (!coverFile) {
      setCoverFrame(null);
      setCoverError(null);
      return;
    }

    let active = true;
    frameFromFile(coverFile)
      .then((frame) => {
        if (active) {
          setCoverFrame(frame);
          setCoverError(null);
          recordLocalAction("imagesProcessed", "Cover image loaded for encoding");
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setCoverFrame(null);
          setCoverError(loadError instanceof Error ? loadError.message : "Could not read the image.");
        }
      });

    return () => {
      active = false;
    };
  }, [coverFile]);

  useEffect(() => {
    return () => {
      if (encodedUrl) {
        URL.revokeObjectURL(encodedUrl);
      }
    };
  }, [encodedUrl]);

  const payloadBytes = useMemo(() => {
    if (payloadKind === "file" && secretFile) {
      return secretFile.size;
    }

    return new TextEncoder().encode(secretText).byteLength;
  }, [payloadKind, secretFile, secretText]);

  const strength = assessPasswordStrength(password);
  const canEncode = Boolean(
    coverFrame &&
      password &&
      password === confirmPassword &&
      ((payloadKind === "file" && secretFile) || (payloadKind === "text" && secretText.trim().length > 0)),
  );
  const estimatedPayload = payloadBytes + 96;
  const capacityBytes = coverFrame ? Math.floor((coverFrame.width * coverFrame.height * 3) / 8) - 28 : 0;
  const usagePercent = capacityBytes > 0 ? (estimatedPayload / capacityBytes) * 100 : 0;

  const handleCoverDrop = async (files: FileList | null) => {
    const nextFile = files?.[0];
    if (!nextFile) {
      return;
    }

    setCoverFile(nextFile);
    setError(null);
  };

  const handleEncode = async () => {
    if (!coverFrame || !coverFile) {
      setError("Upload a PNG image before encoding.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The password and confirmation do not match.");
      return;
    }

    if (payloadKind === "file" && !secretFile) {
      setError("Choose a file payload before encoding.");
      return;
    }

    setProcessing(true);
    setError(null);
    setStatus("Encrypting and embedding payload...");

    try {
      const payload: PlainPayload =
        payloadKind === "file"
          ? {
              kind: "file",
              data: new Uint8Array(await secretFile!.arrayBuffer()),
              name: secretFile!.name,
              mimeType: secretFile!.type || "application/octet-stream",
            }
          : {
              kind: "text",
              data: new TextEncoder().encode(secretText),
            };

      const result = await encodeIntoFrame(coverFrame, payload, password, encodingMode);
      setEncodedBlob(result.encodedBlob);
      setMetrics(result.difference);
      const nextEncodedUrl = URL.createObjectURL(result.encodedBlob);
      setEncodedUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextEncodedUrl;
      });

      const heatmap = await createDifferenceHeatmap(coverFrame, result.encodedFrame);
      setDiffUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return heatmap.objectUrl;
      });

      setStatus("Encoded PNG verified successfully.");
      recordLocalAction("imagesProcessed", "Cover image encoded locally");
      recordLocalAction("messagesEncoded", payload.kind === "file" ? "File payload encoded" : "Text payload encoded");
    } catch (encodeError: unknown) {
      setError(encodeError instanceof Error ? encodeError.message : "Encoding failed.");
      setStatus(null);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SiteShell
      title="Hide Data"
      subtitle="Drag in a PNG, enter your secret, and PixelVault will encrypt, embed, verify, and let you download the encoded image without storing your content on a server."
      actions={
        <Link href="/extract" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100">
          Extract data
        </Link>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="glass rounded-3xl p-6">
          <div
            className="rounded-3xl border border-dashed border-cyan-400/25 bg-slate-950/40 p-8 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void handleCoverDrop(event.dataTransfer.files);
            }}
          >
            <div className="mx-auto flex max-w-md flex-col items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300">PNG</div>
              <div>
                <h2 className="text-2xl font-semibold text-white">Drag and drop your cover image</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">PNG only for basic LSB encoding. JPEG output is intentionally disabled.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950">
                Select PNG
                <input type="file" accept="image/png" className="sr-only" onChange={(event) => void handleCoverDrop(event.target.files)} />
              </label>
            </div>
          </div>

          {coverError ? <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{coverError}</div> : null}
          {coverFile ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50">
                {coverPreview ? <img src={coverPreview} alt="Selected cover preview" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="grid gap-3">
                <InfoPill label="Filename" value={coverFile.name} />
                <InfoPill label="Original size" value={formatBytes(coverFile.size)} />
                <InfoPill label="Dimensions" value={coverFrame ? `${coverFrame.width} × ${coverFrame.height}` : "Loading..."} />
                <InfoPill label="Available capacity" value={coverFrame ? formatBytes(capacityBytes) : "Calculating..."} />
                <InfoPill label="Estimated payload" value={formatBytes(estimatedPayload)} />
                <InfoPill label="Capacity usage" value={formatPercent(usagePercent)} />
              </div>
            </div>
          ) : null}
        </article>

        <aside className="grid gap-6">
          <article className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-semibold text-white">Secret payload</h2>
            <div className="mt-5 flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-2">
              {(["text", "file"] as PayloadKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setPayloadKind(kind)}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${payloadKind === kind ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
                >
                  {kind === "text" ? "Text message" : "File payload"}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              {payloadKind === "text" ? (
                <Field label="Secret text" hint="Your message is encrypted before embedding.">
                  <textarea
                    rows={6}
                    value={secretText}
                    onChange={(event) => setSecretText(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                    placeholder="Type the secret message here"
                  />
                </Field>
              ) : (
                <Field label="File payload" hint="Small files such as notes or text documents work best.">
                  <input
                    type="file"
                    onChange={(event) => setSecretFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300"
                  />
                  {secretFile ? <div className="text-xs text-slate-400">Selected file: {secretFile.name} ({formatBytes(secretFile.size)})</div> : null}
                  {payloadPreview && secretFile?.type.startsWith("image/") ? <img src={payloadPreview} alt="Selected file preview" className="mt-3 max-h-44 rounded-2xl border border-white/10 object-contain" /> : null}
                </Field>
              )}

              <Field label="Password" hint={`Strength: ${strength.label}`}>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                  placeholder="Enter a strong password"
                />
              </Field>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-200">
                  <span>Password strength</span>
                  <span>{strength.score}/100</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className={`h-2 rounded-full ${strength.colorClass}`} style={{ width: `${strength.score}%` }} />
                </div>
                {strength.hints.length > 0 ? <div className="mt-2 text-xs text-slate-400">{strength.hints.join(" ")}</div> : null}
              </div>

              <Field label="Confirm password">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                  placeholder="Repeat the password"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Encoding mode" hint="Experimental mode shuffles embedding positions with a password-derived seed.">
                  <select
                    value={encodingMode}
                    onChange={(event) => setEncodingMode(event.target.value as EncodingMode)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white"
                  >
                    <option value="standard">Standard</option>
                    <option value="balanced">Balanced</option>
                    <option value="experimental">Experimental</option>
                  </select>
                </Field>

                <Field label="PBKDF2 iterations" hint="Higher values slow brute force attempts but take longer to derive the key.">
                  <input
                    type="range"
                    min={120_000}
                    max={600_000}
                    step={10_000}
                    value={iterations}
                    onChange={(event) => setIterations(Number(event.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 text-sm text-slate-300">{formatNumber(iterations)} iterations</div>
                </Field>
              </div>
            </div>
          </article>

          <article className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-semibold text-white">Capacity and warnings</h2>
            <div className="mt-4 space-y-4">
              <StatCard label="Estimated payload bytes" value={formatBytes(estimatedPayload)} />
              <StatCard label="Capacity usage" value={formatPercent(usagePercent)} />
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                {coverFrame && usagePercent > 100 ? (
                  <span className="text-rose-200">The payload is too large for this image.</span>
                ) : (
                  <span>Use a larger PNG or a smaller payload if you want more safety margin for visual fidelity.</span>
                )}
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-white">Encode and verify</h2>
            <button
              type="button"
              onClick={() => void handleEncode()}
              disabled={!canEncode || processing}
              className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Encoding..." : "Encode PNG"}
            </button>
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
          {status ? <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{status}</div> : null}

          {encodedUrl ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-3">
                <img src={encodedUrl} alt="Encoded PNG preview" className="w-full rounded-2xl" />
              </div>
              <div className="space-y-4">
                <StatCard label="Payload kind" value={payloadKind === "text" ? "Text" : "File"} />
                <StatCard label="Embedded capacity used" value={metrics ? formatPercent(metrics.usagePercent) : "0%"} />
                <StatCard label="Mean squared error" value={metrics ? metrics.mse.toFixed(4) : "0"} />
                <StatCard label="PSNR" value={metrics ? `${metrics.psnr.toFixed(2)} dB` : "0 dB"} />
                <button
                  type="button"
                  onClick={() => encodedBlob && downloadBlob(encodedBlob, "pixelvault-encoded.png")}
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100"
                >
                  Download encoded PNG
                </button>
              </div>
            </div>
          ) : null}
        </article>

        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Difference map</h2>
          {diffUrl ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.72fr]">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50 p-3">
                <img src={diffUrl} alt="Pixel difference heatmap" className="w-full rounded-2xl" />
              </div>
              <div className="space-y-4">
                <StatCard label="Changed pixels" value={metrics ? formatPercent(metrics.changedPixelPercent) : "0%"} />
                <StatCard label="SSIM" value={metrics ? metrics.ssim.toFixed(4) : "0"} />
                <DiffBars metrics={metrics ?? undefined} />
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-sm leading-7 text-slate-400">
              The pixel-difference heatmap will appear here after encoding. It helps you inspect the visual footprint of the embedded payload.
            </div>
          )}
        </article>
      </section>
    </SiteShell>
  );
}