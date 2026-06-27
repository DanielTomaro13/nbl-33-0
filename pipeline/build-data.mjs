/**
 * NBL 33-0 data pipeline — 100% sourced from the public NBL "rosetta" API.
 * ---------------------------------------------------------------------------
 * Everything here is fetched from prod.rosetta.nbl.com.au/get/* (the same JSON
 * nbl.com.au reads — Genius Sports underneath). No token: the proxy is
 * referer-gated, so every request carries an Origin/Referer of nbl.com.au.
 * Nothing is hardcoded — no curated player lists, no made-up numbers.
 *
 *   nbl/seasons                          season list (year + UUID + type)
 *   nbl/standings/{year}/regular         real ladder (10 clubs, W/L/PF/PA/L5)
 *   nbl/matches/in/season/{year}/all     fixtures + scores (regular + finals)
 *   nbl/players/in/season/{year}         roster per season (id, team, position)
 *   nbl/player_boxscores/for/{pid}/...   per-game box lines → season averages
 *                                        AND reconstructed per-match box scores
 *   nbl/team/stats/for/season/{year}/..  team season totals → usage rates
 *
 * The NBL has no decades of history via this API, so "era" is the season label
 * (e.g. "2024-25"), and the player pool spans the recent seasons we fetch.
 * Shot charts are served by a separate Genius widget (not this API), so unlike
 * the NBA build there is no shots dataset.
 *
 * Env: FROM_YEAR=2019  STATS_SEASONS=6  LINEUP_SEASONS=2  RATE_MS=180  CONC=6
 *
 * Outputs → web/public/data/: meta, pool, poolYears, games, playerSeasons,
 * results, strengths, seasonLeaders, gameBox, playoffs, playoffsBySeason.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = "https://prod.rosetta.nbl.com.au/get";
const RATE_MS = Number(process.env.RATE_MS || 180);
const CONC = Number(process.env.CONC || 6);
const FROM_YEAR = Number(process.env.FROM_YEAR || 2019);
const STATS_SEASONS = Number(process.env.STATS_SEASONS || 6); // seasons that get per-player box scores
const LINEUP_SEASONS = Number(process.env.LINEUP_SEASONS || 2); // seasons that get full per-match box pages
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "web", "public", "data");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://nbl.com.au", Referer: "https://nbl.com.au/",
  "Sec-Fetch-Dest": "empty", "Sec-Fetch-Mode": "cors", "Sec-Fetch-Site": "cross-site",
};
const POS_CODE_LABEL = { PG: "Point Guard", SG: "Shooting Guard", SF: "Small Forward", PF: "Power Forward", C: "Center" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (x) => Number(x) || 0;          // box-score numbers arrive as strings sometimes ("6")
const r1 = (x) => +(+x || 0).toFixed(1);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pctOf = (made, att) => (att > 0 ? Math.round((made / att) * 1000) / 10 : 0);
// year 2025 → "2025-26" (NBL26). The season START year is the API key.
const seasonLabel = (year) => `${year}-${String((Number(year) + 1) % 100).padStart(2, "0")}`;

/** GET a rosetta route, unwrap the {type,data} envelope (news returns a raw array). */
async function get(route) {
  const url = `${BASE}/${route}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const c = new AbortController(); const id = setTimeout(() => c.abort(), 45000);
      const res = await fetch(url, { headers: HEADERS, signal: c.signal }); clearTimeout(id);
      if (res.ok) { const j = await res.json(); return Array.isArray(j) ? j : (j.data ?? j); }
      if (![429, 500, 502, 503, 504].includes(res.status)) throw new Error(`${res.status} ${route}`);
    } catch (e) { if (attempt === 3) throw e; }
    await sleep(RATE_MS * (attempt + 1));
  }
  throw new Error(`failed ${route}`);
}

/** Run an async fn over items with bounded concurrency. */
async function pool(items, fn, conc = CONC) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, async () => {
    while (i < items.length) { const idx = i++; try { out[idx] = await fn(items[idx], idx); } catch { out[idx] = null; } }
  }));
  return out;
}

/** production index → 58–99; star seasons reach the 90s, rotation players the 60s. */
function rate(pts, reb, ast, stl, blk, fg3) {
  const score = pts + 1.2 * reb + 1.5 * ast + 3 * stl + 3 * blk + 0.4 * fg3;
  return Math.round(clamp(58 + 41 / (1 + Math.exp(-(score - 28) / 6)), 58, 99));
}
/** broad NBL position letter (G/F/C) + per-game profile → primary pos + eligibility. */
function posFrom(broad, s) {
  const b = String(broad || "").toUpperCase();
  const guard = b.includes("G"), fwd = b.includes("F"), cen = b.includes("C");
  if (cen && !fwd && !guard) return { pos: "C", elig: ["C"] };
  if (cen && fwd) return { pos: (s.reb || 0) >= 8 ? "C" : "PF", elig: ["C", "PF"] };
  if (fwd && guard) return { pos: "SF", elig: ["SF", "SG"] };
  if (fwd) return (s.reb || 0) >= 6 ? { pos: "PF", elig: ["PF", "SF"] } : { pos: "SF", elig: ["SF", "PF"] };
  if (guard) return (s.ast || 0) >= 4 ? { pos: "PG", elig: ["PG", "SG"] } : { pos: "SG", elig: ["SG", "PG"] };
  // unknown — infer from the line
  if ((s.blk || 0) >= 1 && (s.reb || 0) >= 7) return { pos: "C", elig: ["C", "PF"] };
  if ((s.reb || 0) >= 6) return { pos: "PF", elig: ["PF", "SF"] };
  if ((s.ast || 0) >= 4.5) return { pos: "PG", elig: ["PG", "SG"] };
  return { pos: "SG", elig: ["SG", "SF"] };
}

/** Map a finals round label to a sort order + display name (latest = Grand Final). */
const FINALS_ORDER = ["SEEDING", "QUALIFIER", "ELIMINATION", "PLAYOFF 1", "PLAYOFF 2", "SEMI", "CHAMPIONSHIP", "GRAND FINAL"];
const finalsRank = (round) => {
  const r = String(round || "").toUpperCase();
  const i = FINALS_ORDER.findIndex((k) => r.includes(k));
  return i < 0 ? 5 : i;
};

async function main() {
  const t0 = Date.now();
  const month = new Date().getUTCMonth() + 1;

  /* ---- seasons ---------------------------------------------------------- */
  const seasonsRaw = await get("nbl/seasons");
  const seasonList = [...new Map(seasonsRaw
    .filter((s) => s.season_type === "regular" && Number(s.year) >= FROM_YEAR)
    .map((s) => [s.year, { year: Number(s.year), id: s.id, label: seasonLabel(s.year) }])).values()]
    .sort((a, b) => b.year - a.year);
  console.log(`→ ${seasonList.length} seasons: ${seasonList.map((s) => s.label).join(", ")}`);

  const standingsBySeason = {}, resultsBySeason = {}, finalsBySeason = {};
  const clubColors = {};   // club name → [primary, secondary]
  const clubCode = {};     // club name → 3-letter code

  /* ---- ladders + fixtures for every season ------------------------------ */
  for (const S of seasonList) {
    // ladder — the raw array isn't position-sorted, so order by position (then wins).
    try {
      const ladder = await get(`nbl/standings/${S.year}/regular`);
      const table = ladder.map((t) => {
        const w = num(t.won), l = num(t.lost);
        const form = String(t.last_5 || t.last_five || t.results_string || ""); // full-season W/L form guide
        const last10 = form.slice(-10);
        const lw = (last10.match(/W/g) || []).length, ll = (last10.match(/L/g) || []).length;
        const run = (form.match(/(.)\1*$/) || [""])[0]; // trailing same-result run
        return {
          club: t.team.name, conf: "NBL", div: "", position: num(t.position),
          p: num(t.played) || w + l, w, l, d: 0,
          pf: num(t.points_for), pa: num(t.points_against),
          pts: w, pd: num(t.points_for) - num(t.points_against),
          home: "", road: "", form,
          l10: last10 ? `${lw}-${ll}` : "", streak: run ? `${run[0]}${run.length}` : "", confRec: "",
        };
      }).sort((a, b) => (a.position && b.position ? a.position - b.position : b.w - a.w) || b.pd - a.pd);
      if (table.length) standingsBySeason[S.label] = table;
      await sleep(RATE_MS);
    } catch (e) { console.log(`  ! ${S.label} ladder: ${e.message}`); }

    // fixtures (regular + finals in one feed)
    try {
      const matches = await get(`nbl/matches/in/season/${S.year}/all?limit=500`);
      const reg = [], fin = [];
      for (const m of matches) {
        for (const side of ["home_team", "away_team"]) {
          const t = m[side]; if (!t?.name) continue;
          if (!clubCode[t.name] && t.team_code) clubCode[t.name] = t.team_code;
          if (!clubColors[t.name] && t.color_primary) clubColors[t.name] = [t.color_primary, t.color_secondary || t.color_tertiary || "#9b9bad"];
        }
        // match_type cleanly separates regular / finals from preseason (BLITZ,
        // PRESEASON) and exhibitions (NBAxNBL is type=regular but a named round).
        const mt = m.match_type;
        if (mt !== "regular" && mt !== "final") continue;
        if (m.match_status !== "complete" && m.home_score == null) continue;
        const isFin = mt === "final";
        const rec = {
          id: m.id, date: (m.start_time_datetime || m.start_time || "").slice(0, 10),
          round: isFin ? m.round : Number(m.round),
          home: m.home_team?.name, away: m.away_team?.name,
          hs: num(m.home_score), as: num(m.away_score),
        };
        if (!rec.home || !rec.away) continue;
        if (isFin) fin.push(rec);
        else if (!Number.isNaN(rec.round)) reg.push(rec); // drop named-round exhibitions
      }
      reg.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      if (reg.length) resultsBySeason[S.label] = reg;
      if (fin.length) finalsBySeason[S.label] = fin;
      await sleep(RATE_MS);
    } catch (e) { console.log(`  ! ${S.label} fixtures: ${e.message}`); }
    console.log(`✓ ${S.label}: ladder ${standingsBySeason[S.label]?.length || 0}, regular ${resultsBySeason[S.label]?.length || 0}, finals ${finalsBySeason[S.label]?.length || 0}`);
  }

  /* ---- per-player season stats + reconstructed match box scores ---------- */
  // Only consider seasons that actually returned a ladder (skips the upcoming
  // season, whose feeds are still empty in the off-season).
  const playable = seasonList.filter((s) => standingsBySeason[s.label]);
  const statSeasons = playable.slice(0, STATS_SEASONS);
  const lineupLabels = statSeasons.slice(0, LINEUP_SEASONS).map((s) => s.label);
  const yearCards = [];                 // one per (player, season, club)
  const playerSeasons = {};             // pid → [season lines]
  const playerName = {};                // pid → name
  const gameBox = {};                   // matchId → { season, date, home, away }

  for (const S of statSeasons) {
    let roster;
    try { roster = await get(`nbl/players/in/season/${S.year}`); }
    catch (e) { console.log(`  ! ${S.label} roster: ${e.message}`); continue; }
    await sleep(RATE_MS);

    // team season totals → usage rates
    const teamTot = {};
    try {
      const ts = await get(`nbl/team/stats/for/season/${S.year}/regular`);
      for (const t of ts) teamTot[t.team?.id] = { min: num(t.minutes), fga: num(t.field_goals_attempted), fta: num(t.free_throws_attempted), tov: num(t.turnovers) };
      await sleep(RATE_MS);
    } catch { /* usage falls back to 0 */ }

    const ids = [...new Map(roster.map((p) => [p.player?.id, { id: p.player?.id, pos: p.playing_position }])).values()].filter((x) => x.id);
    const matchLines = new Map(); // matchId → { match, lines:[{teamId, line}] }

    const logs = await pool(ids, async (p) => {
      const games = await get(`nbl/player_boxscores/for/${p.id}/in/season/${S.year}/regular`).catch(() => []);
      return { id: p.id, pos: p.pos, games: Array.isArray(games) ? games : [] };
    });

    for (const L of logs) {
      if (!L || !L.games.length) continue;
      const played = L.games.filter((g) => g.participated !== false && num(g.minutes) > 0);
      if (!played.length) continue;
      const sum = (k) => played.reduce((a, g) => a + num(g[k]), 0);
      const g = played.length;
      const fgm = sum("field_goals_made"), fga = sum("field_goals_attempted");
      const ftm = sum("free_throws_made"), fta = sum("free_throws_attempted");
      const fg3m = sum("three_points_made"), fg3a = sum("three_points_attempted");
      const pts = sum("points"), reb = sum("rebounds"), ast = sum("assists");
      const stl = sum("steals"), blk = sum("blocks"), tov = sum("turnovers");
      const minTot = played.reduce((a, x) => a + num(x.minutes), 0);
      const name = `${L.games[0].player?.first_name || ""} ${L.games[0].player?.last_name || ""}`.trim();
      // dominant team this season
      const teamCount = {};
      for (const x of played) { const t = x.team?.name; if (t) teamCount[t] = (teamCount[t] || 0) + 1; }
      const club = Object.entries(teamCount).sort((a, b) => b[1] - a[1])[0]?.[0];
      const teamId = played.find((x) => x.team?.name === club)?.team?.id;
      if (!club) continue;

      const per = {
        pts: r1(pts / g), reb: r1(reb / g), ast: r1(ast / g), stl: r1(stl / g), blk: r1(blk / g), fg3: r1(fg3m / g),
        fgPct: pctOf(fgm, fga), fg3Pct: pctOf(fg3m, fg3a), ftPct: pctOf(ftm, fta), mpg: r1(minTot / g),
      };
      const ts = pctOf(pts, 2 * (fga + 0.44 * fta));                 // true shooting %
      const eff = r1((pts + reb + ast + stl + blk - (fga - fgm) - (fta - ftm) - tov) / g); // EFF per game
      const tt = teamTot[teamId];
      const usg = tt && minTot > 0 && (tt.fga + 0.44 * tt.fta + tt.tov) > 0
        ? clamp(Math.round(100 * ((fga + 0.44 * fta + tov) * (tt.min / 5)) / (minTot * (tt.fga + 0.44 * tt.fta + tt.tov)) * 10) / 10, 0, 45) : 0;
      const rt = rate(per.pts, per.reb, per.ast, per.stl, per.blk, per.fg3);
      if (g < 3 && rt < 70) continue;
      const { pos, elig } = posFrom(L.pos, per);

      yearCards.push({
        id: `nbl-${L.id}-${S.year}`, pid: L.id, name, club, era: S.label, year: S.year,
        pos, posName: POS_CODE_LABEL[pos], elig, rating: rt, g, ...per,
        ts, usg, pie: eff, netRtg: 0,
        jersey: L.games[0].player?.jersey_number || "", image: L.games[0].player?.image || null,
      });
      playerName[L.id] = name;
      (playerSeasons[L.id] ||= []).push({ season: S.label, club, gp: g, rating: rt, ...per, ts, usg, pie: eff, netRtg: 0 });

      // collect per-match lines (lineup seasons only → match box pages)
      if (lineupLabels.includes(S.label)) {
        for (const x of played) {
          const m = x.match; if (!m?.id) continue;
          const e = matchLines.get(m.id) || { match: m, lines: [] };
          e.lines.push({
            teamId: x.team?.id, pid: L.id, name,
            min: r1(x.minutes), pts: num(x.points), reb: num(x.rebounds), ast: num(x.assists),
            stl: num(x.steals), blk: num(x.blocks), tov: num(x.turnovers),
            fgm: num(x.field_goals_made), fga: num(x.field_goals_attempted),
            fg3m: num(x.three_points_made), fg3a: num(x.three_points_attempted),
            ftm: num(x.free_throws_made), fta: num(x.free_throws_attempted),
            pf: num(x.personal_fouls), pm: 0,
          });
          matchLines.set(m.id, e);
        }
      }
    }

    // build full match box scores for the lineup seasons
    if (lineupLabels.includes(S.label)) {
      let lc = 0;
      const teamBox = (lines, name, code) => {
        const t = { name, abbr: code || "", pts: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, players: [] };
        for (const p of lines) { t.pts += p.pts; t.fgm += p.fgm; t.fga += p.fga; t.fg3m += p.fg3m; t.fg3a += p.fg3a; t.ftm += p.ftm; t.fta += p.fta; t.reb += p.reb; t.ast += p.ast; t.stl += p.stl; t.blk += p.blk; t.tov += p.tov; t.pf += p.pf; }
        t.players = lines.map(({ teamId, ...rest }) => rest).sort((a, b) => b.min - a.min || b.pts - a.pts);
        return t;
      };
      for (const { match, lines } of matchLines.values()) {
        const homeId = match.home_team?.id, awayId = match.away_team?.id;
        const homeLines = lines.filter((l) => l.teamId === homeId), awayLines = lines.filter((l) => l.teamId === awayId);
        if (!homeLines.length || !awayLines.length) continue;
        gameBox[match.id] = {
          season: S.label, date: (match.start_time_datetime || "").slice(0, 10),
          home: teamBox(homeLines, match.home_team?.name, clubCode[match.home_team?.name]),
          away: teamBox(awayLines, match.away_team?.name, clubCode[match.away_team?.name]),
        };
        lc++;
      }
      console.log(`  ✓ ${S.label} lineups: ${lc} match box scores`);
    }
    console.log(`✓ ${S.label}: ${logs.filter((l) => l && l.games.length).length} players with stats`);
  }
  for (const k of Object.keys(playerSeasons)) playerSeasons[k].sort((a, b) => a.season.localeCompare(b.season));

  /* ---- pool (one card per player+club, peak season) + year cards -------- */
  const lean = (c, era, id) => ({ id, pid: c.pid, name: c.name, club: c.club, era, pos: c.pos, posName: c.posName, elig: c.elig, rating: c.rating, g: c.g, pts: c.pts, reb: c.reb, ast: c.ast, stl: c.stl, blk: c.blk, fg3: c.fg3, fgPct: c.fgPct, mpg: c.mpg });
  const bestByPlayerClub = new Map();
  for (const c of yearCards) {
    const key = `${c.pid}|${c.club}`;
    const cur = bestByPlayerClub.get(key);
    if (!cur || c.rating > cur.rating) bestByPlayerClub.set(key, c);
  }
  const poolCards = [...bestByPlayerClub.values()].map((c) => lean(c, c.era, `p-${c.id}`)).sort((a, b) => b.rating - a.rating);
  const poolYears = yearCards.map((c) => lean(c, c.era, c.id)).sort((a, b) => b.rating - a.rating);

  /* ---- career players for mini-games + profiles ------------------------- */
  const SUM = ["pts", "reb", "ast", "stl", "blk", "fg3", "fgPct", "fg3Pct", "ftPct", "mpg", "ts", "usg", "pie"];
  const careers = new Map();
  for (const c of yearCards) {
    let k = careers.get(c.pid);
    if (!k) { k = { id: c.pid, name: c.name, clubCounts: {}, posCounts: {}, years: new Set(), apps: 0, sum: Object.fromEntries(SUM.map((x) => [x, 0])), wsum: 0, best: 0, jersey: c.jersey, image: c.image }; careers.set(c.pid, k); }
    k.clubCounts[c.club] = (k.clubCounts[c.club] || 0) + c.g;
    k.posCounts[c.pos] = (k.posCounts[c.pos] || 0) + c.g;
    k.years.add(c.year); k.apps += c.g; k.best = Math.max(k.best, c.rating);
    for (const x of SUM) k.sum[x] += (c[x] || 0) * c.g;
    if (c.fgPct) k.wsum += c.g;
  }
  const gamePlayers = [];
  for (const k of careers.values()) {
    if (k.apps < 15) continue;
    const club = Object.entries(k.clubCounts).sort((a, b) => b[1] - a[1])[0][0];
    const pos = Object.entries(k.posCounts).sort((a, b) => b[1] - a[1])[0][0];
    const yrs = [...k.years].sort((a, b) => a - b);
    const av = (x) => +(k.sum[x] / k.apps).toFixed(1);
    const avp = (x) => k.wsum ? +(k.sum[x] / k.wsum).toFixed(1) : 0;
    const pts = av("pts");
    gamePlayers.push({
      id: k.id, name: k.name, club, pos, posName: POS_CODE_LABEL[pos] || "Forward",
      firstYear: yrs[0], lastYear: yrs[yrs.length - 1], apps: k.apps, pts,
      reb: av("reb"), ast: av("ast"), stl: av("stl"), blk: av("blk"), fg3: av("fg3"),
      fgPct: avp("fgPct"), fg3Pct: avp("fg3Pct"), ftPct: avp("ftPct"), mpg: av("mpg"),
      ts: avp("ts"), usg: avp("usg"), pie: avp("pie"),
      bio: { height: "", weight: "", college: "", country: "", draftYear: null, draftRound: null, draftNumber: null, jersey: k.jersey || "", image: k.image || null },
      rating: k.best, fame: Math.round(k.best + Math.min(18, k.apps / 12) + pts / 3),
    });
  }
  gamePlayers.sort((a, b) => b.fame - a.fame);

  /* ---- per-season statistical leaders ----------------------------------- */
  const LEAD_CATS = [
    { key: "pts", label: "Points", min: 10 }, { key: "reb", label: "Rebounds", min: 10 },
    { key: "ast", label: "Assists", min: 10 }, { key: "stl", label: "Steals", min: 10 },
    { key: "blk", label: "Blocks", min: 10 }, { key: "fg3", label: "Threes", min: 10 },
    { key: "mpg", label: "Minutes", min: 10 },
    { key: "ts", label: "True Shooting %", min: 15 }, { key: "pie", label: "Player Impact", min: 15 },
    { key: "fg3Pct", label: "Three-Point %", min: 15, vol: { key: "fg3", min: 1.0 } },
    { key: "ftPct", label: "Free Throw %", min: 15, vol: { key: "pts", min: 6 } },
    { key: "fgPct", label: "Field Goal %", min: 15, vol: { key: "pts", min: 6 } },
  ];
  const cardsBySeason = {};
  for (const c of yearCards) (cardsBySeason[c.era] ||= []).push(c);
  const seasonLeaders = {};
  for (const [season, cards] of Object.entries(cardsBySeason)) {
    const cats = {};
    for (const cat of LEAD_CATS) {
      const ranked = cards
        .filter((c) => (c.g || 0) >= cat.min && (c[cat.key] || 0) > 0 && (!cat.vol || (c[cat.vol.key] || 0) >= cat.vol.min))
        .sort((a, b) => (b[cat.key] || 0) - (a[cat.key] || 0)).slice(0, 15)
        .map((c) => ({ pid: c.pid, name: c.name, club: c.club, value: c[cat.key] }));
      if (ranked.length) cats[cat.key] = ranked;
    }
    if (Object.keys(cats).length) seasonLeaders[season] = cats;
  }
  const leaderCats = LEAD_CATS.map((c) => ({ key: c.key, label: c.label }));

  /* ---- ladders, strengths ----------------------------------------------- */
  const laddersBySeason = {}, strengthsBySeason = {};
  for (const [s, table] of Object.entries(standingsBySeason)) {
    laddersBySeason[s] = table;
    strengthsBySeason[s] = table.map((t) => (t.p ? t.w / t.p : 0)).sort((a, b) => a - b).map((x) => +x.toFixed(3));
  }
  const seasons = seasonList.map((s) => s.label).filter((s) => laddersBySeason[s]);
  const latestSeason = seasons[0];

  /* ---- playoffs (finals) — series grouped by team pair ------------------ */
  function bracketFor(label) {
    const fin = finalsBySeason[label]; const ladder = laddersBySeason[label] || [];
    if (!fin?.length) return null;
    const seedOf = {}; ladder.forEach((t, i) => { seedOf[t.club] = i + 1; });
    const series = {};
    for (const m of fin) {
      const key = [m.home, m.away].sort().join("|");
      const s = series[key] || (series[key] = { teams: [m.home, m.away].sort(), wins: {}, rank: finalsRank(m.round), round: m.round });
      s.rank = Math.max(s.rank, finalsRank(m.round));
      if (m.hs === m.as) continue;
      const w = m.hs > m.as ? m.home : m.away; s.wins[w] = (s.wins[w] || 0) + 1;
    }
    const list = Object.values(series).map((s) => {
      const [t1, t2] = s.teams; const w1 = s.wins[t1] || 0, w2 = s.wins[t2] || 0;
      const winner = w1 >= w2 ? t1 : t2, loser = w1 >= w2 ? t2 : t1;
      const seeded = s.teams.map((t) => ({ team: t, seed: seedOf[t] || 0 })).sort((a, b) => a.seed - b.seed);
      return { rank: s.rank, hi: seeded[0], lo: seeded[1], winner, loserTeam: loser, score: `${Math.max(w1, w2)}-${Math.min(w1, w2)}`, conf: "NBL" };
    }).sort((a, b) => a.rank - b.rank);
    if (!list.length) return null;
    const maxRank = Math.max(...list.map((s) => s.rank));
    const roundName = (rank) => rank === maxRank ? "Grand Final" : rank >= FINALS_ORDER.indexOf("PLAYOFF 1") ? "Semi Finals" : "Qualifying & Elimination Finals";
    // merge series under a shared display name into a single round (ordered by rank)
    const byName = {};
    for (const s of list) { const nm = roundName(s.rank); (byName[nm] ||= { minRank: s.rank, series: [] }); byName[nm].series.push(s); byName[nm].minRank = Math.min(byName[nm].minRank, s.rank); }
    const rounds = Object.entries(byName).sort((a, b) => a[1].minRank - b[1].minRank).map(([name, v]) => ({ name, series: v.series }));
    const gf = list.find((s) => s.rank === maxRank);
    return { season: label, active: true, champion: gf?.winner || "", runnerUp: gf?.loserTeam || "", rounds, seeds: { NBL: ladder.slice(0, 6).map((t, i) => ({ team: t.club, seed: i + 1, w: t.w, l: t.l })) } };
  }
  const playoffsBySeason = {};
  for (const label of seasons) { const b = bracketFor(label); if (b) playoffsBySeason[label] = b; }
  const playoffsActive = month >= 2 && month <= 4; // NBL finals run Feb–Mar
  const latestPlayoffs = playoffsBySeason[latestSeason] || { season: latestSeason, active: false, champion: "", rounds: [], seeds: {} };
  latestPlayoffs.active = Boolean(playoffsActive && playoffsBySeason[latestSeason]);

  /* ---- write ------------------------------------------------------------ */
  await mkdir(OUT_DIR, { recursive: true });
  const clubsBySeason = {}; for (const s of seasons) clubsBySeason[s] = (laddersBySeason[s] || []).map((t) => t.club);
  const allClubs = [...new Set(poolCards.map((p) => p.club))].sort();
  const teamMeta = Object.fromEntries(allClubs.map((c) => [c, { conf: "NBL", div: "" }]));
  const clubBrand = Object.fromEntries(allClubs.map((c) => [c, { code: clubCode[c] || "", colors: clubColors[c] || ["#26263a", "#9b9bad"] }]));
  const meta = {
    generatedAt: new Date().toISOString(), seasons, latestSeason, clubs: allClubs, clubsBySeason,
    teamMeta, divisions: { NBL: { "": allClubs } }, playoffsActive, lineupSeasons: lineupLabels, clubBrand,
  };

  await Promise.all([
    writeFile(join(OUT_DIR, "meta.json"), JSON.stringify(meta)),
    writeFile(join(OUT_DIR, "pool.json"), JSON.stringify(poolCards)),
    writeFile(join(OUT_DIR, "poolYears.json"), JSON.stringify(poolYears)),
    writeFile(join(OUT_DIR, "games.json"), JSON.stringify({ season: latestSeason, players: gamePlayers, strengthsBySeason })),
    writeFile(join(OUT_DIR, "playerSeasons.json"), JSON.stringify(playerSeasons)),
    writeFile(join(OUT_DIR, "results.json"), JSON.stringify({ seasons, lineupSeasons: lineupLabels, bySeason: resultsBySeason, laddersBySeason })),
    writeFile(join(OUT_DIR, "strengths.json"), JSON.stringify({ bySeason: strengthsBySeason })),
    writeFile(join(OUT_DIR, "seasonLeaders.json"), JSON.stringify({ cats: leaderCats, bySeason: seasonLeaders })),
    writeFile(join(OUT_DIR, "gameBox.json"), JSON.stringify({ seasons: lineupLabels, games: gameBox })),
    writeFile(join(OUT_DIR, "playoffs.json"), JSON.stringify(latestPlayoffs)),
    writeFile(join(OUT_DIR, "playoffsBySeason.json"), JSON.stringify(playoffsBySeason)),
  ]);
  console.log(`✓ ${poolCards.length} pool cards, ${poolYears.length} year cards, ${gamePlayers.length} players, ${seasons.length} seasons, ${Object.keys(gameBox).length} match box scores, ${Object.keys(playoffsBySeason).length} brackets in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
main().catch((e) => { console.error("✗ pipeline failed:", e); process.exit(1); });
