import { pageMeta } from "@/lib/seo";
import PerfectSeasonGame from "@/components/PerfectSeasonGame";

export const metadata = pageMeta({
  title: "Play Perfect Season — draft an all-time NBL team",
  description:
    "Spin for an NBL club and era, draft a legend into every position and chase a flawless 33-0 season. Five modes: Starting Five, Rotation Eight, Active Thirteen, Salary Cap, Gauntlet and The Tank.",
  path: "/play",
  keywords: ["NBL draft game", "perfect season", "NBL team builder", "33-0 game"],
});

export default function PlayPage() {
  return <PerfectSeasonGame />;
}
