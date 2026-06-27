"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadResults, type Results } from "@/lib/data";
import { clubColors, clubAbbr } from "@/lib/clubs";

const pct = (w: number, l: number) => (w + l ? (w / (w + l)).toFixed(3).replace(/^0/, "") : ".000");
const sel: React.CSSProperties = { padding: ".4rem .6rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" };

export default function LadderView() {
  const [data, setData] = useState<Results | null>(null);
  const [season, setSeason] = useState<string>("");
  useEffect(() => { loadResults().then((r) => { setData(r); setSeason(r.seasons[0]); }); }, []);

  const rows = useMemo(() => data?.laddersBySeason[season] ?? [], [data, season]);

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading ladder…</p>;
  const lead = rows[0]?.w ?? 0;
  const FINALS_CUT = 6; // NBL: top six clubs reach the finals

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: ".82rem", color: "var(--muted)" }}>Season</label>
        <select value={season} onChange={(e) => setSeason(e.target.value)} style={sel}>
          {data.seasons.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="card scroll-x" style={{ padding: ".4rem .6rem" }}>
        <table className="stat">
          <thead><tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>L</th><th>PCT</th><th>GB</th><th>PF</th><th>PA</th><th>L10</th><th>Strk</th><th>Diff</th></tr></thead>
          <tbody>
            {rows.map((t, i) => {
              const [c1] = clubColors(t.club);
              const gb = ((lead - t.w) + (t.l - (rows[0]?.l ?? 0))) / 2;
              const tone = i < FINALS_CUT ? "rgba(74,222,128,0.06)" : undefined;
              return (
                <tr key={t.club} style={tone ? { background: tone } : undefined}>
                  <td style={{ color: i < FINALS_CUT ? "var(--accent-2)" : "var(--muted)", fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Link href={`/teams/${clubAbbr(t.club).toLowerCase()}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: c1, flexShrink: 0 }} />
                      <span>{t.club}</span>
                    </Link>
                  </td>
                  <td>{t.p}</td>
                  <td style={{ fontWeight: 700 }}>{t.w}</td><td>{t.l}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{pct(t.w, t.l)}</td>
                  <td style={{ color: "var(--muted)" }}>{gb <= 0 ? "—" : gb.toFixed(1)}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: ".8rem" }}>{t.pf || "—"}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: ".8rem" }}>{t.pa || "—"}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: ".8rem", whiteSpace: "nowrap" }}>{t.l10 || "—"}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: ".8rem", whiteSpace: "nowrap", color: (t.streak || "").startsWith("W") ? "var(--accent-2)" : (t.streak || "").startsWith("L") ? "var(--danger)" : "var(--muted)" }}>{t.streak || "—"}</td>
                  <td style={{ color: t.pd > 0 ? "var(--accent-2)" : t.pd < 0 ? "var(--danger)" : "var(--muted)" }}>{t.pd > 0 ? "+" : ""}{t.pd}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: ".75rem", color: "var(--muted)" }}>
        Top six clubs (green) reach the NBL Finals.{" "}
        <Link href="/playoffs" style={{ color: "var(--accent)" }}>See the finals bracket →</Link>
      </p>
    </div>
  );
}
