import { Nav } from "@/components/marketing/Nav";
import { Hero } from "@/components/marketing/Hero";
import { LiveMarquee } from "@/components/marketing/LiveMarquee";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { StudioShowcase } from "@/components/marketing/StudioShowcase";
import { Earnings } from "@/components/marketing/Earnings";
import { Leaderboard } from "@/components/marketing/Leaderboard";
import { Numbers } from "@/components/marketing/Numbers";
import { FAQ } from "@/components/marketing/FAQ";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { Footer } from "@/components/marketing/Footer";

export default function Home() {
  return (
    <main className="relative" style={{ backgroundColor: "var(--background)" }}>
      <Nav />
      <Hero />
      <LiveMarquee />
      <HowItWorks />
      <StudioShowcase />
      <Earnings />
      <Leaderboard />
      <Numbers />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
