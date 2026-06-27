import GameShell from "@/components/games/GameShell";
import ScorePredictor from "@/components/games/ScorePredictor";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Score Predictor — call real NBL results",
  description: "Predict the scoreline of ten real NBL matches. Nail the exact result for big points, get the winner right for a few.",
  path: "/games/score-predictor",
  keywords: ["NBL score predictor", "NBL tipping", "predict NBL results"],
});

export default function Page() {
  return (
    <GameShell
      slug="score-predictor"
      title="Score Predictor"
      emoji="🔮"
      intro="Ten real NBL matches, hidden results. Set your predicted scoreline for each, lock it in and see how sharp your footy brain is."
      howTo={[
        "Use the steppers to set a predicted score for the home and away team.",
        "Lock in your prediction to reveal the real result.",
        "Exact scoreline scores 5 points; the right winner (or a drawn tip) scores 2.",
        "Add up your score across all ten matches.",
      ]}
    >
      <ScorePredictor />
    </GameShell>
  );
}
