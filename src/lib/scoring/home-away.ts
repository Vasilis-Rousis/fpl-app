import "server-only";
import { createServerClient, fetchAllRows } from "@/lib/supabase/server";

/**
 * Calculate home/away performance scores.
 * Checks if a player performs significantly better at home or away,
 * then applies based on their next fixture venue.
 */
export async function calculateAllHomeAwayScores(
  currentGameweek: number
): Promise<Map<number, number>> {
  const supabase = createServerClient();

  // Get player history (paginate to avoid Supabase 1000-row limit)
  const allHistory = await fetchAllRows<{
    element: number; was_home: boolean; total_points: number; minutes: number;
  }>(({ from, to }) =>
    supabase
      .from("player_history")
      .select("element, was_home, total_points, minutes")
      .lte("round", currentGameweek)
      .gt("minutes", 0)
      .range(from, to)
  );

  // Get next fixtures to determine home/away
  const { data: nextFixtures } = await supabase
    .from("fixtures")
    .select("team_h, team_a, event")
    .gt("event", currentGameweek)
    .order("event", { ascending: true })
    .limit(20); // Next GW fixtures (10 games)

  if (!nextFixtures) return new Map();

  // Get players with teams
  const { data: players } = await supabase
    .from("players")
    .select("id, team")
    .eq("status", "a");

  if (!players) return new Map();

  // Build next fixture venue map: team -> isHome
  const teamNextVenue = new Map<number, boolean>();
  const nextGW = currentGameweek + 1;
  for (const f of nextFixtures) {
    if (f.event === nextGW) {
      teamNextVenue.set(f.team_h, true);
      teamNextVenue.set(f.team_a, false);
    }
  }

  // Group history by player
  const playerHistories = new Map<
    number,
    { home: number[]; away: number[] }
  >();

  for (const row of allHistory) {
    if (!playerHistories.has(row.element)) {
      playerHistories.set(row.element, { home: [], away: [] });
    }
    const entry = playerHistories.get(row.element)!;
    if (row.was_home) {
      entry.home.push(row.total_points);
    } else {
      entry.away.push(row.total_points);
    }
  }

  // Build player -> team map
  const playerTeam = new Map<number, number>();
  for (const p of players) {
    playerTeam.set(p.id, p.team);
  }

  // Calculate scores
  const rawScores = new Map<number, number>();

  for (const [elementId, { home, away }] of playerHistories) {
    const team = playerTeam.get(elementId);
    if (!team) continue;

    const avgHome = home.length > 0 ? home.reduce((a, b) => a + b, 0) / home.length : 0;
    const avgAway = away.length > 0 ? away.reduce((a, b) => a + b, 0) / away.length : 0;

    const isNextHome = teamNextVenue.get(team);
    if (isNextHome === undefined) {
      rawScores.set(elementId, (avgHome + avgAway) / 2);
      continue;
    }

    // Use the relevant venue average
    const relevantAvg = isNextHome ? avgHome : avgAway;
    rawScores.set(elementId, relevantAvg);
  }

  return percentileNormalize(rawScores);
}

function percentileNormalize(scores: Map<number, number>): Map<number, number> {
  const entries = Array.from(scores.entries());
  entries.sort((a, b) => a[1] - b[1]);

  const result = new Map<number, number>();
  const n = entries.length;
  if (n <= 1) {
    for (const [id] of entries) result.set(id, 50);
    return result;
  }
  for (let i = 0; i < n; i++) {
    const percentile = (i / (n - 1)) * 100;
    result.set(entries[i][0], Math.round(percentile * 10) / 10);
  }

  return result;
}
