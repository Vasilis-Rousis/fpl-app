# FPL Edge

A Fantasy Premier League analytics platform that provides player rankings, captain recommendations, transfer suggestions, H2H league insights, and fixture difficulty visualization.

Built with Next.js, Supabase, and the official FPL API.

## Features

- **Dashboard** — Current gameweek info, overall rank, total points, and H2H record
- **Player Database** — Searchable and filterable table of 700+ Premier League players with form, cost, and scoring data
- **Best Picks** — Top captain picks and positional rankings powered by a weighted composite scoring algorithm
- **Transfer Recommender** — Smart transfer suggestions based on player scores
- **H2H League** — League standings, match history, opponent analysis, and upcoming fixtures
- **Fixture Heatmap** — 6-gameweek lookahead with color-coded difficulty ratings for all 20 teams

## Scoring Algorithm

Players are ranked using five weighted sub-scores, tuned per position:

| Sub-Score | Description |
|-----------|-------------|
| **Form** | Recency-weighted last 5 gameweeks with xG regression |
| **Fixture Difficulty** | Next 5 gameweeks, adjusted for team strength |
| **Consistency** | Variance penalty for inconsistent performers |
| **Value** | Points-per-million, percentile-ranked by position |
| **Home/Away** | Performance modifier based on venue |

Captain scores include bonuses for penalty takers and penalties for high ownership.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js
- A Supabase account ([free tier available](https://supabase.com))

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create a `.env.local` file** with the following variables:

   ```env
   FPL_MANAGER_ID=your_fpl_manager_id
   H2H_LEAGUE_ID=your_h2h_league_id

   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   AUTH_USERNAME=your_sync_username
   AUTH_PASSWORD=your_sync_password
   AUTH_SECRET=your_session_secret
   ```

3. **Set up the database** by running [supabase/schema.sql](supabase/schema.sql) in your Supabase SQL editor.

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) and log in to trigger an initial data sync.

### Production Build

```bash
npm run build
npm start
```

## Data Sync

The app syncs data from the FPL API via protected API routes:

- `/api/sync/all` — Full sync (10-minute cooldown)
- Individual endpoints available for bootstrap, fixtures, live data, players, H2H, manager, and scores

Each sync is logged with timestamps and error tracking.

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Protected routes (dashboard, players, h2h, fixtures, recommendations)
│   ├── api/sync/           # Data sync API routes
│   └── login/              # Authentication
├── components/
│   ├── layout/             # Navbar
│   ├── players/            # Player table, search, charts
│   └── ui/                 # Shared components (DataTable, StatCard, etc.)
├── lib/
│   ├── fpl/                # FPL API client and types
│   ├── scoring/            # Composite scoring algorithm
│   ├── sync/               # Data sync logic
│   ├── supabase/           # Database clients
│   └── utils/              # Formatting helpers
└── supabase/
    └── schema.sql          # Database schema
```
