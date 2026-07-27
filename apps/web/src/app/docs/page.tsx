import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

const topics = [
  ["What steganography is", "Steganography hides the existence of information by embedding it inside another medium. In PixelVault, the medium is a PNG image, and the hidden data is encrypted before embedding."],
  ["How LSB encoding works", "Each selected pixel channel stores one hidden bit in its least-significant position. Because the change is tiny, the image often looks visually identical, especially when payload density is low."],
  ["Why PNG is used", "PNG is lossless, which means the pixel values survive round-tripping. JPEG applies compression that can alter or destroy the hidden bits."],
  ["How encryption works", "PixelVault uses Web Crypto AES-256-GCM with a random salt, random IV, and PBKDF2-derived key. The ciphertext is authenticated so tampering is detected."],
  ["How integrity is checked", "The envelope includes a versioned signature, lengths, and a checksum. AES-GCM authentication also protects against ciphertext modification."],
  ["How the detector works", "The detector analyzes LSB balance, entropy, channel relationships, and local pixel differences to estimate whether hidden data may be present."],
];

export default function DocsPage() {
  return (
    <SiteShell
      title="Documentation"
      subtitle="Technical notes for steganography, encryption, the detector, and the security assumptions behind PixelVault."
      actions={
        <Link href="/about" className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
          About project
        </Link>
      }
    >
      <section className="grid gap-4 lg:grid-cols-2">
        {topics.map(([title, body]) => (
          <article key={title} className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Threat model</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            <li>• The app assumes honest client-side execution in the browser and a non-malicious local device.</li>
            <li>• Attackers may inspect the image, compress it, modify it, or attempt password guessing.</li>
            <li>• Steganography conceals data but does not guarantee invisibility or deniability.</li>
            <li>• Weak passwords, screenshots, resizing, and social-media processing all reduce security.</li>
          </ul>
        </article>

        <article className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Ethical use</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            PixelVault is intended for privacy education, secure personal storage, watermarking experiments, and legitimate communication. Do not use it to conceal harmful or unauthorized activity.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
            Security note: encryption provides confidentiality, while steganography provides concealment. You need both to protect content and hide its presence.
          </div>
        </article>
      </section>
    </SiteShell>
  );
}