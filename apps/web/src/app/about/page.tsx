import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

const stack = [
  "Next.js App Router",
  "TypeScript",
  "Tailwind CSS",
  "Web Crypto API",
  "Canvas API",
  "FastAPI",
  "PyTorch",
  "scikit-learn",
  "Pytest",
  "Vitest",
  "Playwright",
];

const challenges = [
  "Keeping the core hide/extract flow entirely client-side while still providing a useful detection experience.",
  "Designing a binary envelope that can carry both text and small file payloads without leaking plaintext metadata.",
  "Balancing strong security defaults with browser performance and a responsive user experience.",
  "Providing honest detector output without overstating certainty or presenting fake metrics.",
];

const authorLinks = [
  { label: "GitHub", value: "Add your handle here" },
  { label: "Focus", value: "Privacy, security, and applied ML" },
  { label: "Project motive", value: "Built to explore covert image storage and honest steganalysis" },
];

export default function AboutPage() {
  return (
    <SiteShell
      title="About PixelVault"
      subtitle="A portfolio-ready privacy engineering project built around browser-side steganography, encrypted payloads, and an ML-oriented detection workflow."
      actions={
        <Link href="/hide" className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
          Try it now
        </Link>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Project purpose</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            PixelVault demonstrates how client-side cryptography, image steganography, and machine learning can be combined into a single privacy-focused workflow. It is designed for secure personal storage, research, and educational demonstrations.
          </p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
            The application is intentionally built so the hide and extract flows continue to work even if the ML backend is offline.
          </div>
        </article>

        <article className="glass rounded-3xl p-6">
          <div className="text-sm uppercase tracking-[0.32em] text-cyan-200/70">About the author</div>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">Saksham Varma</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Saksham Varma created PixelVault as a portfolio project to show practical privacy engineering: browser-side encryption, PNG steganography, quality analysis, and a measurable ML workflow without leaning on paid APIs.
          </p>
          <div className="mt-6 grid gap-3">
            {authorLinks.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</div>
                <div className="mt-1 text-sm text-slate-100">{item.value}</div>
              </div>
            ))}
          </div>
        </article>

        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Architecture diagram</h2>
          <pre className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs leading-6 text-slate-300">
{`Browser UI -> Web Crypto -> PNG LSB encoder -> Encoded PNG download
Browser UI -> Extractor -> AES-GCM decryptor -> Text or file recovery
Browser UI -> Feature extractor -> Local detector / FastAPI -> Estimated likelihood
Python tooling -> Dataset generator -> Feature models / CNN -> Artifacts`}
          </pre>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Technology stack</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {stack.map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Engineering challenges</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            {challenges.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">ML workflow</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            <li>1. Generate clean and encoded samples from source images.</li>
            <li>2. Split by source image to avoid leakage.</li>
            <li>3. Train statistical baselines and a lightweight CNN.</li>
            <li>4. Calibrate the output probabilities and benchmark inference latency.</li>
            <li>5. Export a versioned artifact and surface the model card in the UI.</li>
          </ol>
        </article>

        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Future enhancements</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            <li>• Train the detector against a broader open-image dataset.</li>
            <li>• Add optional server-side preview validation for large files.</li>
            <li>• Improve residual visualization and model explainability.</li>
            <li>• Expand the file payload workflow with stricter MIME validation.</li>
          </ul>
        </article>
      </section>
    </SiteShell>
  );
}