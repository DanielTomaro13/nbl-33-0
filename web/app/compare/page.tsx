import { pageMeta } from "@/lib/seo";
import Compare from "@/components/Compare";
import AdUnit from "@/components/AdUnit";
import { AD_SLOTS } from "@/lib/ads";

export const metadata = pageMeta({
  title: "Compare NBL Players — head-to-head stats",
  description: "Compare any two NBL players side by side: points, rebounds, assists, shooting splits, true shooting, usage and player impact — built from real NBL data.",
  path: "/compare",
  keywords: ["compare NBL players", "NBL player comparison", "NBL head to head stats", "NBL stats compare"],
});

export default function ComparePage() {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>Compare Players</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>Pick any two players to see their career numbers head-to-head.</p>
      </header>
      <Compare />
      <AdUnit slot={AD_SLOTS.result} />
    </div>
  );
}
