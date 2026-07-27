import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PixelVault",
    template: "%s | PixelVault",
  },
  description:
    "PixelVault hides encrypted messages or files inside PNG images and analyzes images for possible steganography.",
  metadataBase: new URL("https://pixelvault.example"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
