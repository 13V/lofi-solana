/**
 * Mock marketing data — realistic lofi song-coins, leaderboard, stats, FAQ.
 * Replace with on-chain / API reads later. Names/tickers are placeholders.
 */

export interface SongCoin {
  id: string;
  title: string;
  ticker: string;
  creator: string;
  hue: number; // label gradient hue
  priceSol: number;
  priceUsd: number;
  changePct: number;
  listens: number;
  earnedUsd: number;
}

export const SONG_COINS: SongCoin[] = [
  { id: "study",   title: "2am Study",       ticker: "STUDY",   creator: "0xvibe",    hue: 38,  priceSol: 0.00021, priceUsd: 0.0042, changePct: 18.2, listens: 128_400, earnedUsd: 9_240 },
  { id: "rain",    title: "Rain on Glass",   ticker: "RAIN",    creator: "loopmaker", hue: 268, priceSol: 0.00009, priceUsd: 0.0018, changePct: -4.1, listens: 88_900,  earnedUsd: 4_110 },
  { id: "tape",    title: "Cassette Dream",  ticker: "TAPE",    creator: "beatsmith", hue: 28,  priceSol: 0.00046, priceUsd: 0.0092, changePct: 42.7, listens: 312_200, earnedUsd: 31_980 },
  { id: "kettle",  title: "Midnight Kettle", ticker: "KETTLE",  creator: "softkeys",  hue: 160, priceSol: 0.00006, priceUsd: 0.0011, changePct: 6.3,  listens: 51_100,  earnedUsd: 2_040 },
  { id: "drizzle", title: "Tokyo Drizzle",   ticker: "DRIZZLE", creator: "nightbus",  hue: 210, priceSol: 0.00033, priceUsd: 0.0066, changePct: 11.9, listens: 173_500, earnedUsd: 12_300 },
  { id: "dust",    title: "Dusty Vinyl",     ticker: "DUST",    creator: "crate.dig", hue: 18,  priceSol: 0.00014, priceUsd: 0.0028, changePct: -2.4, listens: 64_700,  earnedUsd: 3_520 },
  { id: "velvet",  title: "Velvet Static",   ticker: "VELVET",  creator: "mxtape",    hue: 320, priceSol: 0.00027, priceUsd: 0.0054, changePct: 24.5, listens: 142_800, earnedUsd: 10_870 },
  { id: "lobat",   title: "Lo Battery",      ticker: "LOBAT",   creator: "8bitheart", hue: 95,  priceSol: 0.00005, priceUsd: 0.0010, changePct: 3.1,  listens: 39_900,  earnedUsd: 1_460 },
  { id: "soba",    title: "Sunday Soba",     ticker: "SOBA",    creator: "noodlebar", hue: 48,  priceSol: 0.00019, priceUsd: 0.0038, changePct: 8.8,  listens: 96_300,  earnedUsd: 5_640 },
  { id: "amber",   title: "Amber Hours",     ticker: "AMBER",   creator: "goldenear", hue: 40,  priceSol: 0.00052, priceUsd: 0.0104, changePct: 51.3, listens: 401_600, earnedUsd: 42_710 },
  { id: "lantern", title: "Paper Lanterns",  ticker: "LANTERN", creator: "yuumi",     hue: 12,  priceSol: 0.00011, priceUsd: 0.0022, changePct: -1.2, listens: 58_200,  earnedUsd: 2_910 },
  { id: "slow",    title: "Slow Train",      ticker: "SLOW",    creator: "platform9",  hue: 250, priceSol: 0.00024, priceUsd: 0.0048, changePct: 14.6, listens: 119_400, earnedUsd: 8_330 },
];

export const TOP_EARNING = [...SONG_COINS].sort((a, b) => b.earnedUsd - a.earnedUsd).slice(0, 6);
export const MOST_LISTENED = [...SONG_COINS].sort((a, b) => b.listens - a.listens).slice(0, 6);

export const STATS = {
  creatorsPaidUsd: 1_284_500,
  songsLaunched: 47_312,
  totalListens: 8_900_000,
  listenersThisWeek: 47_312,
};

export const STEPS = [
  {
    n: "01",
    key: "Make",
    title: "Make the beat",
    body: "Tap out a beat in the browser studio. Drums, jazzy chords, bass — we keep everything in key, so it sounds good even if you've never made music.",
  },
  {
    n: "02",
    key: "Coin",
    title: "Coin it",
    body: "Name it, give it a ticker, hit launch. Your track becomes a tradeable token on Solana in one tap. No label. No gatekeepers.",
  },
  {
    n: "03",
    key: "Earn",
    title: "Get paid to vibe",
    body: "Trading fees flow back to the people behind the song — boosted by every real listen, paid out on-chain. The more it's played, the more it pays.",
  },
] as const;

export const FAQS = [
  {
    q: "Is this an investment?",
    a: "No. lofi.sol is a creative tool, not an investment platform. Coins are for fun and community; rewards are never guaranteed and are not financial returns. Make music because it's fun — the coin is the cherry on top.",
  },
  {
    q: "How do listens actually pay out?",
    a: "A play counts once a unique listener hears ≥30 seconds and ≥50% of a track. Verified, de-duplicated listens weight each epoch's share of trading-fee revenue, which is committed on-chain and claimed via a Merkle distributor.",
  },
  {
    q: "Do I own the music I make?",
    a: "Yes. The studio renders your track deterministically from CC0 (public-domain) sounds, so the output is original and yours — clean to release and to coin.",
  },
  {
    q: "Do I need crypto to start?",
    a: "No. Make a beat and listen with no wallet at all. You only connect a wallet when you want to launch a coin or trade one — and you can sign up with just an email.",
  },
  {
    q: "What are the fees?",
    a: "Launching rides pump.fun's rails; every trade carries a small, transparent creator fee that funds the reward pool. No hidden fees, no countdown-timer pressure.",
  },
] as const;
