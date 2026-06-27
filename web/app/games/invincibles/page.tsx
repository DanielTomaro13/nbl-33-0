import GameShell from "@/components/games/GameShell";
import PerfectSeasonGame from "@/components/PerfectSeasonGame";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Invincibles — draft a team and chase a perfect season",
  description: "Spin clubs and seasons, draft a team onto the floor and play out a full 33-game NBL season. Can you go undefeated?",
  path: "/games/invincibles",
  keywords: ["NBL squad builder", "NBL season simulator", "invincibles NBL"],
});

export default function Page() {
  return (
    <GameShell
      slug="invincibles"
      title="Invincibles"
      emoji="🏆"
      intro="Draft a team from across NBL history onto the half-court, then play out a full 33-game season. Go undefeated and you're immortal."
      howTo={[
        "Pick a mode, then spin for a random club and season.",
        "Draft a player into each spot on the floor — versatile players can cover more than one.",
        "Fill the lineup, then your team plays out a full 33-game season.",
        "Chase a flawless 33-0 and post it to the Hall of Fame.",
      ]}
    >
      <PerfectSeasonGame />
    </GameShell>
  );
}
