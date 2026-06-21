import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "lofi.sol — Make the sound of now.",
  description:
    "Make a lofi beat in your browser, drop it as a coin on Solana, and earn every time the world hits play.",
  openGraph: {
    title: "lofi.sol — Make the sound of now.",
    description: "Make a beat. Coin it. Earn when people listen.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "lofi.sol" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Fonts loaded at runtime (no build-time fetch) with robust fallbacks.
            Display: Fraunces (cozy editorial serif) · Body: Inter · Data: Space Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..700&family=Inter:wght@400..700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Persistent film-grain overlay — the signature lofi texture */}
        <div className="grain-overlay" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
