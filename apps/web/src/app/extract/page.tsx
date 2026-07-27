"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { recordLocalAction } from "@/lib/local-stats";
import { extractFromFrame, frameFromFile } from "@/lib/pixelvault/stego";
import type { DecodedPayload, ImageFrame } from "@/lib/pixelvault/types";

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

function ResultCard({ label, value }: { label: string; value: string }) {
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

export default function ExtractPage() {
  const [encodedFile, setEncodedFile] = useState<File | null>(null);
  const [frame, setFrame] = useState<ImageFrame | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<DecodedPayload | null>(null);

  const previewUrl = useObjectUrl(encodedFile);

  useEffect(() => {
    if (!encodedFile) {
      setFrame(null);
      setPreviewError(null);
      return;
    }

    let active = true;
    frameFromFile(encodedFile)
      .then((nextFrame) => {
        if (active) {
          setFrame(nextFrame);
          setPreviewError(null);
          setStatus("Ready to inspect for a PixelVault payload.");
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
  }, [encodedFile]);

  const handleExtract = async () => {
    if (!frame) {
      setError("Upload an encoded PNG first.");
      return;
    }

    if (!password) {
      setError("Enter the password used when the image was encoded.");
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setStatus("Validating the PixelVault payload...");

    try {
      const extracted = await extractFromFrame(frame, password);
      setResult(extracted);
      setStatus("Payload verified and decrypted successfully.");
      recordLocalAction("imagesProcessed", "Encoded image inspected locally");
      if (extracted.kind === "file") {
        recordLocalAction("filesExtracted", extracted.file?.name || "Recovered file");
      }
    } catch (extractError: unknown) {
      setError(extractError instanceof Error ? extractError.message : "Could not recover the hidden data.");
      setStatus(null);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SiteShell
      title="Extract Data"
      subtitle="Upload an encoded PNG, enter the password, and PixelVault will validate the payload, decrypt the contents, and let you recover text or a file."
      actions={
        <Link href="/hide" className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
          Hide data
        </Link>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="glass rounded-3xl p-6">
          <div className="rounded-3xl border border-dashed border-cyan-400/25 bg-slate-950/40 p-8 text-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300">PNG</div>
              <div>
                <h2 className="text-2xl font-semibold text-white">Upload the encoded image</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">The image must contain a PixelVault payload and should not have been heavily recompressed or resized.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950">
                Select PNG
                <input type="file" accept="image/png" className="sr-only" onChange={(event) => setEncodedFile(event.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          {previewError ? <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{previewError}</div> : null}

          {encodedFile ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50">
                {previewUrl ? <img src={previewUrl} alt="Encoded preview" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="grid gap-3">
                <ResultCard label="Filename" value={encodedFile.name} />
                <ResultCard label="File size" value={formatBytes(encodedFile.size)} />
                <ResultCard label="Read status" value={status || "Awaiting password"} />
                <ResultCard label="Payload integrity" value={result ? "Verified" : "Not checked yet"} />
              </div>
            </div>
          ) : null}
        </article>

        <aside className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Recovery controls</h2>
          <div className="mt-5 space-y-4">
            <Field label="Password" hint="The wrong password will fail safely without exposing cryptographic details.">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                placeholder="Enter the password"
              />
            </Field>

            <button
              type="button"
              onClick={() => void handleExtract()}
              disabled={!frame || processing}
              className="w-full rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Recovering..." : "Extract payload"}
            </button>

            {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
            {status ? <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{status}</div> : null}

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-medium text-white">Result</div>
              {result ? (
                <div className="mt-4 space-y-4">
                  <ResultCard label="Payload kind" value={result.kind === "text" ? "Text" : "File"} />
                  <ResultCard label="File name" value={result.metadata.name || "N/A"} />
                  <ResultCard label="MIME type" value={result.metadata.mimeType || "application/octet-stream"} />
                  {result.kind === "text" ? (
                    <>
                      <textarea readOnly value={result.text || ""} className="min-h-40 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white" />
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={async () => result.text && navigator.clipboard.writeText(result.text)}
                          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-100"
                        >
                          Copy text
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                        A file payload was recovered. Download it to inspect the original contents.
                      </div>
                      <button
                        type="button"
                        onClick={() => result.file && downloadBlob(result.file, result.file.name)}
                        className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-100"
                      >
                        Download extracted file
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm leading-6 text-slate-400">
                  The recovered payload will appear here after successful validation and decryption.
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}