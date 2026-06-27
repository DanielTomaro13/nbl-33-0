import { pageMeta } from "@/lib/seo";
import { serverPlayoffs } from "@/lib/serverdata";
import PlayoffsView from "@/components/PlayoffsView";
import AdUnit from "@/components/AdUnit";
import { AD_SLOTS } from "@/lib/ads";

export function generateMetadata() {
  const po = serverPlayoffs();
  return pageMeta({
    title: `NBL Playoffs ${po.season} — bracket & results`,
    description: `The ${po.season} NBL playoff bracket: every series from the first round to the Finals, by conference. ${po.champion} are champions.`,
    path: "/playoffs",
    keywords: ["NBL playoffs", "NBL playoff bracket", "NBL Finals", `${po.season} playoffs`],
  });
}

export default function PlayoffsPage() {
  const po = serverPlayoffs();
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>NBL Playoffs</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          Real playoff brackets — every series, winner and score from the NBL Stats API.
        </p>
      </header>
      <PlayoffsView initial={po} />
      <AdUnit slot={AD_SLOTS.result} />
    </div>
  );
}
