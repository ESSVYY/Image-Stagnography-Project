import Link from "next/link";

const features = [
  {
    title: "Hide encrypted data",
    description:
      "Embed text or small files in PNG pixels with AES-256-GCM protection and a capacity meter.",
  },
  {
    title: "Recover safely",
    description:
      "Validate headers, verify integrity, and extract payloads only after the correct password is supplied.",
  },
  {
    title: "Estimate hidden data",
    description:
      "Analyze image statistics and return an estimated likelihood that steganography may be present.",
  },
  {
    title: "Compare image quality",
    description:
      "Inspect difference maps, PSNR, MSE, SSIM, and channel-level changes in one view.",
  },
];

const faqs = [
  ["Why PNG?", "PNG preserves pixels losslessly, which is critical for LSB-based hiding."],
  ["Can JPEG work?", "JPEG compression can destroy or alter hidden bits, so PixelVault uses PNG for core encoding."],
  ["Is this undetectable?", "No. Steganography reduces visibility but does not guarantee concealment."],
  ["Does the app store my secrets?", "No. The core flow is browser-side and does not require permanent server storage."],
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
        <svg viewBox="0 0 48 48" className="h-7 w-7 text-cyan-300" fill="none" aria-hidden="true">
          <path d="M12 15.5L24 8l12 7.5v17L24 40l-12-7.5v-17Z" stroke="currentColor" strokeWidth="2.5" />
          <path d="M24 15v18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18 22h12M18 26h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200/80">PixelVault</div>
        <div className="text-xs text-slate-400">Private image steganography</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="site-shell min-h-screen text-slate-100">
      <a className="skip-link" href="#content">
        Skip to content
      </a>

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex" aria-label="Primary">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/hide">Hide data</Link>
          <Link href="/extract">Extract data</Link>
          <Link href="/detect">Detector</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <Link
          className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
          href="/dashboard"
        >
          Open Workspace
        </Link>
      </header>

      <section id="content" className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pt-14">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Privacy-first browser encryption and image hiding
          </div>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Hide encrypted information inside ordinary images.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              PixelVault combines encryption, image steganography, and machine learning in one privacy-focused
              application. Encode text or small files into PNGs, recover them with the right password, and inspect
              the visual footprint with quality metrics and AI-assisted analysis.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/hide"
              className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Hide Data
            </Link>
            <Link
              href="/detect"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Try Detector
            </Link>
            <Link
              href="/docs"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5"
            >
              Read Docs
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="No paid API dependency" value="$0" />
            <Stat label="Client-side core flow" value="Local" />
            <Stat label="Security posture" value="AES-256" />
          </div>
        </div>

        <aside className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.32em] text-cyan-200/70">Live preview</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">PixelVault workspace</h2>
            </div>
            <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
              Browser-first
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Encoding mode</span>
                <span>Standard LSB</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-800">
                <div className="h-2 w-[68%] rounded-full bg-gradient-to-r from-cyan-300 to-emerald-400" />
              </div>
              <div className="mt-3 text-sm text-slate-300">Payload capacity used: 68%</div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-slate-400">Status</div>
                <div className="mt-2 text-lg font-medium text-white">Ready to encode</div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Upload a PNG, enter a password, and generate an encoded image without storing your secret on the
                  server.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-slate-400">Detector</div>
                <div className="mt-2 text-lg font-medium text-white">Estimate only</div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  The analysis model reports likelihood, confidence, and limitations instead of claiming certainty.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="glass rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-2 lg:px-8">
        <article className="glass rounded-3xl p-8">
          <h2 className="text-2xl font-semibold text-white">How PixelVault works</h2>
          <ol className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
            <li>1. A PNG is validated in the browser and its capacity is calculated.</li>
            <li>2. Your message or file is compressed when useful and encrypted with AES-256-GCM.</li>
            <li>3. The payload metadata and ciphertext are embedded into selected pixel least-significant bits.</li>
            <li>4. The encoded PNG is verified locally before download.</li>
            <li>5. Extraction reverses the process after password verification and integrity checks.</li>
          </ol>
        </article>

        <article className="glass rounded-3xl p-8">
          <h2 className="text-2xl font-semibold text-white">Security limitations</h2>
          <ul className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
            <li>• Steganography conceals content, but it does not guarantee that detection is impossible.</li>
            <li>• Screenshots, resizing, or social-media compression can destroy hidden data.</li>
            <li>• Weak passwords still reduce the effective security of the encrypted payload.</li>
            <li>• The detector is an estimate and can produce both false positives and false negatives.</li>
          </ul>
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="glass rounded-3xl p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-semibold text-white">Frequently asked questions</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                PixelVault is designed for privacy education, legitimate communication, watermarking experiments, and
                secure personal storage.
              </p>
            </div>
            <div className="grid gap-4">
              {faqs.map(([question, answer]) => (
                <details key={question} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-white">{question}</summary>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-slate-400 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>PixelVault is a portfolio-ready privacy engineering project.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/about">About</Link>
          <Link href="/docs">Documentation</Link>
          <Link href="https://github.com/" target="_blank" rel="noreferrer">
            GitHub
          </Link>
        </div>
      </footer>
    </main>
  );
}
