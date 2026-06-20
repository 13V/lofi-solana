import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "lofi.sol — Make a beat. Coin it. Earn when people listen.",
  description:
    "Create lofi music in your browser, launch it as a tradeable Solana token, and earn trading fees weighted by verified listens.",
  openGraph: {
    title: "lofi.sol",
    description: "Make a beat. Coin it. Earn when people listen.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
