import "server-only";
import { createServerClient } from "@/lib/supabase/server";

// Recency weights for last 5 gameweeks (most recent first)
const RECENCY_WEIGHTS = [0.35, 0.25, 0.2, 0.12, 0.08];

interface FormResult {
  score: number; // 0-100
  recentPoints: number[];
  weightedAvg: number;
}

/**
 * Calculate form score for a player based on last 5 gameweeks.
 * Uses recency-weighted average with xG regression modifier.
 */
export async function calculateFormScore(
  elementId: number,
  currentGameweek: number
): Promise<FormResult> {
  const supabase = createServerClient();

  const { data: history } = await supabase
    .from("player_history")
    .select("total_points, expected_goals, goals_scored, expected_assists, assists, minutes")
    .eq("element", elementId)
    .lte("round", currentGameweek)
    .order("round", { ascending: false })
    .limit(5);

  if (!history || history.length === 0) {
    return { score: 0, recentPoints: [], weightedAvg: 0 };
  }

  const recentPoints = history.map((h) => h.total_points);

  // Weighted average
  let weightedAvg = 0;
  let totalWeight = 0;
  for (let i = 0; i < history.length; i++) {
    const weight = RECENCY_WEIGHTS[i] ?? 0.05;
    weightedAvg += history[i].total_points * weight;
    totalWeight += weight;
  }
  weightedAvg = weightedAvg / totalWeight;

  // xG regression modifier
  // If actual goals consistently exceed xG, slight penalty (regression likely)
  // If underperforming xG, slight bonus
  let xgModifier = 1.0;
  const gamesWithMinutes = history.filter((h) => h.minutes > 0);
  if (gamesWithMinutes.length >= 3) {
    const totalXG = gamesWithMinutes.reduce(
      (sum, h) => sum + parseFloat(h.expected_goals || "0"),
      0
    );
    const totalGoals = gamesWithMinutes.reduce((sum, h) => sum + h.goals_scored, 0);
    const totalXA = gamesWithMinutes.reduce(
      (sum, h) => sum + parseFloat(h.expected_assists || "0"),
      0
    );
    const totalAssists = gamesWithMinutes.reduce((sum, h) => sum + h.assists, 0);

    const goalDiff = totalGoals - totalXG;
    const assistDiff = totalAssists - totalXA;

    if (goalDiff > 1.5 || assistDiff > 1.0) {
      xgModifier = 0.92; // overperforming, regression likely
    } else if (goalDiff < -1.5 || assistDiff < -1.0) {
      xgModifier = 1.08; // underperforming, improvement likely
    }
  }

  const adjustedAvg = weightedAvg * xgModifier;

  return {
    score: Math.min(100, Math.max(0, adjustedAvg)), // Raw score, will be percentile-normalized later
    recentPoints,
    weightedAvg: adjustedAvg,
  };
}

/**
 * Batch calculate form scores for all players and return percentile-normalized scores.
 */
export async function calculateAllFormScores(
  currentGameweek: number
): Promise<Map<number, number>> {
  const supabase = createServerClient();

  // Get all player histories for last 5 GWs in one query
  const startGW = Math.max(1, currentGameweek - 4);

  const { data: allHistory } = await supabase
    .from("player_history")
    .select("element, round, total_points, expected_goals, goals_scored, expected_assists, assists, minutes")
    .gte("round", startGW)
    .lte("round", currentGameweek)
    .order("round", { ascending: false });

  if (!allHistory) return new Map();

  // Group by player
  const playerHistories = new Map<number, typeof allHistory>();
  for (const row of allHistory) {
    if (!playerHistories.has(row.element)) {
      playerHistories.set(row.element, []);
    }
    playerHistories.get(row.element)!.push(row);
  }

  // Calculate raw scores
  const rawScores = new Map<number, number>();
  for (const [elementId, history] of playerHistories) {
    let weightedAvg = 0;
    let totalWeight = 0;
    for (let i = 0; i < Math.min(history.length, 5); i++) {
      const weight = RECENCY_WEIGHTS[i] ?? 0.05;
      weightedAvg += history[i].total_points * weight;
      totalWeight += weight;
    }
    weightedAvg = weightedAvg / totalWeight;

    // xG modifier
    let xgModifier = 1.0;
    const gamesWithMinutes = history.filter((h) => h.minutes > 0);
    if (gamesWithMinutes.length >= 3) {
      const totalXG = gamesWithMinutes.reduce(
        (sum, h) => sum + parseFloat(h.expected_goals || "0"),
        0
      );
      const totalGoals = gamesWithMinutes.reduce((sum, h) => sum + h.goals_scored, 0);
      const diff = totalGoals - totalXG;
      if (diff > 1.5) xgModifier = 0.92;
      else if (diff < -1.5) xgModifier = 1.08;
    }

    rawScores.set(elementId, weightedAvg * xgModifier);
  }

  // Percentile normalize
  return percentileNormalize(rawScores);
}

function percentileNormalize(scores: Map<number, number>): Map<number, number> {
  const entries = Array.from(scores.entries());
  entries.sort((a, b) => a[1] - b[1]);

  const result = new Map<number, number>();
  const n = entries.length;
  for (let i = 0; i < n; i++) {
    const percentile = (i / (n - 1)) * 100;
    result.set(entries[i][0], Math.round(percentile * 10) / 10);
  }

  return result;
}
