import "server-only";
import { createServerClient } from "@/lib/supabase/server";

const RECENCY_WEIGHTS = [0.35, 0.25, 0.2, 0.12, 0.08];

/**
 * Calculate fixture difficulty score for a player's team.
 * Higher score = easier fixtures ahead.
 */
export async function calculateAllFixtureScores(
  currentGameweek: number
): Promise<Map<number, number>> {
  const supabase = createServerClient();

  // Get upcoming fixtures for next 5 GWs
  const endGW = Math.min(38, currentGameweek + 5);
  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("event, team_h, team_a, team_h_difficulty, team_a_difficulty")
    .gt("event", currentGameweek)
    .lte("event", endGW)
    .eq("finished", false);

  if (!fixtures) return new Map();

  // Get all players with their teams
  const { data: players } = await supabase
    .from("players")
    .select("id, team")
    .eq("status", "a");

  if (!players) return new Map();

  // Build team fixture map: team -> [{gw, ease}]
  const teamFixtures = new Map<number, { gw: number; ease: number }[]>();

  for (const f of fixtures) {
    // Home team
    if (!teamFixtures.has(f.team_h)) teamFixtures.set(f.team_h, []);
    teamFixtures.get(f.team_h)!.push({
      gw: f.event,
      ease: 6 - f.team_h_difficulty, // Invert: 5 (hardest) -> 1, 1 (easiest) -> 5
    });

    // Away team
    if (!teamFixtures.has(f.team_a)) teamFixtures.set(f.team_a, []);
    teamFixtures.get(f.team_a)!.push({
      gw: f.event,
      ease: 6 - f.team_a_difficulty,
    });
  }

  // Calculate team scores
  const teamScores = new Map<number, number>();

  for (const [teamId, teamFixs] of teamFixtures) {
    // Sort by GW
    teamFixs.sort((a, b) => a.gw - b.gw);

    // Group by GW (for double gameweeks)
    const gwMap = new Map<number, number[]>();
    for (const f of teamFixs) {
      if (!gwMap.has(f.gw)) gwMap.set(f.gw, []);
      gwMap.get(f.gw)!.push(f.ease);
    }

    // Calculate weighted score
    let totalScore = 0;
    let totalWeight = 0;
    let gwIndex = 0;

    const sortedGWs = Array.from(gwMap.keys()).sort((a, b) => a - b);
    for (const gw of sortedGWs) {
      if (gwIndex >= 5) break;
      const weight = RECENCY_WEIGHTS[gwIndex] ?? 0.05;
      const easeValues = gwMap.get(gw)!;

      // Double GW: sum ease values (more games = better)
      const gwEase = easeValues.reduce((sum, e) => sum + e, 0);
      // Normalize: single GW max = 5, DGW max = 10
      const normalizedEase = gwEase / 5;

      totalScore += normalizedEase * weight;
      totalWeight += weight;
      gwIndex++;
    }

    const rawScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 50;
    teamScores.set(teamId, rawScore);
  }

  // Map player scores from their team scores
  const playerScores = new Map<number, number>();
  for (const player of players) {
    const teamScore = teamScores.get(player.team) ?? 50;
    playerScores.set(player.id, teamScore);
  }

  // Percentile normalize
  return percentileNormalize(playerScores);
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
