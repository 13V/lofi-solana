import Link from "next/link";
import { WaveformHorizon } from "@/components/marketing/WaveformHorizon";

const NAV_COLS = [
  {
    label: "Product",
    links: [
      { text: "Studio", href: "/studio" },
      { text: "Launches", href: "#launches" },
      { text: "Leaderboard", href: "#leaderboard" },
    ],
  },
  {
    label: "Learn",
    links: [
      { text: "How it works", href: "#how" },
      { text: "FAQ", href: "#faq" },
      { text: "Docs", href: "#" },
    ],
  },
  {
    label: "Community",
    links: [
      { text: "X", href: "#" },
      { text: "Discord", href: "#" },
      { text: "GitHub", href: "#" },
    ],
  },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="max-w-6xl mx-auto px-6 py-14">
        {/* Top row: brand + nav columns */}
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Brand column */}
          <div className="flex flex-col gap-3 max-w-xs">
            <WaveformHorizon
              width={120}
              height={36}
              className="text-accent"
            />
            <p className="font-display text-xl font-semibold text-cream">
              lofi<span className="text-accent">.sol</span>
            </p>
            <p className="text-sm text-muted leading-relaxed">
              Make the sound of now.
            </p>
          </div>

          {/* Nav columns */}
          <div className="grid grid-cols-3 gap-8 sm:gap-12">
            {NAV_COLS.map((col) => (
              <div key={col.label}>
                <p className="font-mono-tape text-xs uppercase tracking-widest text-muted mb-4">
                  {col.label}
                </p>
                <ul className="flex flex-col gap-3">
                  {col.links.map((link) => (
                    <li key={link.text}>
                      <Link
                        href={link.href}
                        className="text-sm text-secondary hover:text-cream transition-colors duration-150"
                      >
                        {link.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 flex flex-col gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <p className="font-mono-tape text-xs text-muted">
            &copy; {year} lofi.sol &middot; devnet
          </p>
          <p className="font-mono-tape text-xs text-muted">
            Rewards, not an investment. Not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
