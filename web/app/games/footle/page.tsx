import GameShell from "@/components/games/GameShell";
import Hoople from "@/components/games/Footle";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Hoople — the daily NBL player Wordle",
  description: "Guess the mystery NBL player in eight tries. A new player every day, the same for everyone. Clues on club, position, era and career stats.",
  path: "/games/footle",
  keywords: ["Hoople", "NBL Wordle", "NBL player guessing game", "daily NBL game"],
});

export default function Page() {
  return (
    <GameShell
      slug="footle"
      title="Hoople"
      emoji="🟩"
      intro="Guess today's mystery NBL player in eight tries. Each guess reveals how close you are on club, position, era and career stats. One new player a day — the same for everyone."
      howTo={[
        "Type any NBL player's name and submit a guess.",
        "A filled cell means an exact match; amber means close (era ±2 years, PPG within range) with ▲/▼ pointing you toward the answer.",
        "Use the clues to narrow it down within eight guesses.",
        "Come back tomorrow for a new player and keep your streak alive.",
      ]}
    >
      <Hoople />
    </GameShell>
  );
}
