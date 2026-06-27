# 🏀 NBL 33-0

> Build an all-time NBL team and chase a perfect 33-0 season — plus a vault of basketball mini-games, standings and stats.
> Live at **[nbl33-0.com](https://nbl33-0.com)**.

The basketball entry in the **0 Series**, alongside [AFL 23-0](https://afl23-0.com), [NRL 24-0](https://nrl24-0.com) and [Football Invincibles](https://footballinvincibles.com).

## What's inside

**Perfect Season** — spin an NBL club and season, draft a star into every position, and chase a flawless 33-0 (the NBL's 33-game regular season). Six modes, from a quick Starting Five to a full Salary Cap roster, plus a survival Gauntlet and a Tank mode.

**The Games Vault**
| Game | What it is |
|------|-----------|
| 🏆 **Invincibles** | Draft a five, play out a season, chase an undefeated record |
| 🟧 **Hoople** | The daily NBL player guessing game |
| 📈 **Higher or Lower** | More or fewer points/boards/dimes? Build a streak |
| 🕵️ **Guess the Player** | Clues revealed one at a time; fewer = more points |
| 🧭 **Career Path** | Name the player from their profile |
| ⏱️ **Beat the Clock** | Name the top scorers in 60 seconds |
| 🔮 **Score Predictor** | Call the scoreline on real games |

**Stats** — standings, schedule, finals brackets, stat leaders, per-match box scores and a profile page for every player, all grounded in real NBL numbers.

## Data

Everything is sourced from the public **NBL "rosetta" API** (`prod.rosetta.nbl.com.au`), which fronts Genius Sports' stats. No API key — the proxy is referer-gated, so the pipeline sends an `nbl.com.au` `Origin`/`Referer`. `pipeline/build-data.mjs` pulls seasons, ladders, fixtures, finals, rosters and per-player box scores (which it also aggregates into season averages and reconstructs into per-match box scores), and writes the JSON datasets under `web/public/data/`. The NBL has no shot-chart feed in this API, so there are no shot charts.

## Tech

- **Next.js (App Router) + TypeScript + React 19**, exported as a **static site** for GitHub Pages
- **Tailwind v4** + a small CSS design system
- **SEO**: per-page metadata, Open Graph/Twitter, `sitemap.ts`, `robots.ts`, `manifest.ts`, JSON-LD
- Datasets are generated into JSON the pages read at build time; an optional global leaderboard runs on a Cloudflare Worker

## Project layout

```
pipeline/        # data generation
web/app/         # routes (pages, games, sitemap/robots/manifest)
web/components/  # UI + games/ (client game components)
web/lib/         # game engine, simulator, SEO helpers
web/public/data/ # generated JSON datasets
worker/          # Cloudflare Worker + KV leaderboard (optional)
```

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to web/out
npm run data     # refresh the dataset
```

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the static export and publishes it to GitHub Pages. The custom domain `nbl33-0.com` is set via a `CNAME` file in `web/public` and the repo's Pages settings; DNS for the domain is managed in Cloudflare (apex `A` records to GitHub Pages, `www` `CNAME` to the Pages host). `.github/workflows/refresh.yml` re-runs the pipeline weekly in season and commits fresh data.

---

Independent project. Not affiliated with or endorsed by the NBL or any team. Data is for informational and entertainment use.
