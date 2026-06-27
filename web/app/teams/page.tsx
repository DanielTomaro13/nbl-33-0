import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { allTeams } from "@/lib/teamdb";
import { clubColors } from "@/lib/clubs";
import AdUnit from "@/components/AdUnit";
import { AD_SLOTS } from "@/lib/ads";

export const metadata = pageMeta({
  title: "NBL Teams — all 10 clubs, rosters & stats",
  description: "Every NBL club — all-time rosters, club leaders, season records and championships, built from real NBL data.",
  path: "/teams",
  keywords: ["NBL teams", "NBL clubs", "NBL rosters", "NBL team stats"],
});

export default function TeamsPage() {
  const teams = allTeams();
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", margin: 0, textTransform: "uppercase" }}>Teams</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>All 10 clubs — tap a team for its all-time roster, leaders and record.</p>
      </header>
      <div className="grid-cards">
        {teams.map((t) => {
          const [c1, c2] = clubColors(t.club);
          return (
            <Link key={t.abbr} href={`/teams/${t.abbr.toLowerCase()}`} className="card" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: 12, borderLeft: `4px solid ${c1}` }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: c1, border: `2px solid ${c2}`, flexShrink: 0 }} />
              <span><strong>{t.club}</strong><br /><span style={{ fontSize: ".72rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{t.abbr}</span></span>
            </Link>
          );
        })}
      </div>
      <AdUnit slot={AD_SLOTS.result} />
    </div>
  );
}
