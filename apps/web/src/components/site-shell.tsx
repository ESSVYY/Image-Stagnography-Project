"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/hide", label: "Hide" },
  { href: "/extract", label: "Extract" },
  { href: "/detect", label: "Detector" },
  { href: "/lab", label: "Lab" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
];

function PixelVaultLogo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="PixelVault home">
      <div className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.16)]">
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
    </Link>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("pixelvault-theme");
    const preferred = stored === "light" || stored === "dark" ? stored : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    setTheme(preferred);
    document.documentElement.dataset.theme = preferred;
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const nextTheme = current === "dark" ? "light" : "dark";
      window.localStorage.setItem("pixelvault-theme", nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      return nextTheme;
    });
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}

export function SiteShell({
  title,
  subtitle,
  children,
  actions,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}>) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const shellClass = useMemo(
    () =>
      mobileOpen
        ? "fixed inset-0 z-40 overflow-auto bg-slate-950/95 backdrop-blur-md md:relative md:inset-auto md:z-auto md:bg-transparent"
        : "hidden md:block",
    [mobileOpen],
  );

  return (
    <main className="site-shell min-h-screen text-slate-100">
      <a className="skip-link" href="#content">
        Skip to content
      </a>

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-6 lg:px-8">
        <PixelVaultLogo />

        <nav className="hidden items-center gap-5 text-sm text-slate-300 lg:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          {actions}
        </div>

        <button
          type="button"
          className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm lg:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          Menu
        </button>
      </header>

      <div id="mobile-nav" className={shellClass}>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 pb-8 lg:hidden">
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <button
              type="button"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm"
              onClick={() => setMobileOpen(false)}
            >
              Close
            </button>
          </div>
          <nav className="grid gap-3 text-base" aria-label="Mobile primary">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {actions}
        </div>
      </div>

      <div id="content" className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">PixelVault workspace</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
            {subtitle ? <p className="max-w-3xl text-sm leading-6 text-slate-300">{subtitle}</p> : null}
          </div>
        </div>

        {children}
      </div>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-slate-400 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>PixelVault is privacy-focused and designed for legitimate communication, research, and education.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/docs">Documentation</Link>
          <Link href="/about">About</Link>
          <Link href="https://github.com/" target="_blank" rel="noreferrer">
            GitHub
          </Link>
        </div>
      </footer>
    </main>
  );
}