import "server-only";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Calculate consistency scores for all players.
 * Based on minutes played stability, starts ratio, and blank avoidance.
 */
export async function calculateAllConsistencyScores(
  currentGameweek: number
): Promise<Map<number, number>> {
  const supabase = createServerClient();

  const startGW = Math.max(1, currentGameweek - 9); // Last 10 GWs

  const { data: allHistory } = await supabase
    .from("player_history")
    .select("element, minutes, starts, total_points, round")
    .gte("round", startGW)
    .lte("round", currentGameweek);

  if (!allHistory) return new Map();

  // Group by player
  const playerHistories = new Map<number, typeof allHistory>();
  for (const row of allHistory) {
    if (!playerHistories.has(row.element)) {
      playerHistories.set(row.element, []);
    }
    playerHistories.get(row.element)!.push(row);
  }

  const rawScores = new Map<number, number>();

  for (const [elementId, history] of playerHistories) {
    if (history.length < 3) {
      rawScores.set(elementId, 0);
      continue;
    }

    // Minutes consistency: 1 - (stddev / 90), clamped to 0-1
    const minutes = history.map((h) => h.minutes);
    const avgMinutes = minutes.reduce((a, b) => a + b, 0) / minutes.length;
    const variance =
      minutes.reduce((sum, m) => sum + Math.pow(m - avgMinutes, 2), 0) / minutes.length;
    const stddev = Math.sqrt(variance);
    const minutesConsistency = Math.max(0, Math.min(1, 1 - stddev / 90));

    // Starts ratio
    const totalStarts = history.reduce((sum, h) => sum + (h.starts || 0), 0);
    const startsRatio = totalStarts / history.length;

    // Blank avoidance (games with more than 2 points)
    const nonBlanks = history.filter((h) => h.total_points > 2).length;
    const blankAvoidance = nonBlanks / history.length;

    const rawScore =
      0.5 * minutesConsistency + 0.3 * startsRatio + 0.2 * blankAvoidance;

    rawScores.set(elementId, rawScore * 100);
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
