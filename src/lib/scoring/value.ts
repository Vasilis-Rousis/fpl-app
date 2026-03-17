import "server-only";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Calculate value scores for all players.
 * Based on points-per-million, percentile-ranked within position.
 */
export async function calculateAllValueScores(): Promise<Map<number, number>> {
  const supabase = createServerClient();

  const { data: players } = await supabase
    .from("players")
    .select("id, element_type, total_points, now_cost")
    .gt("minutes", 0);

  if (!players) return new Map();

  // Group by position
  const byPosition = new Map<number, typeof players>();
  for (const p of players) {
    if (!byPosition.has(p.element_type)) byPosition.set(p.element_type, []);
    byPosition.get(p.element_type)!.push(p);
  }

  const result = new Map<number, number>();

  for (const [, posPlayers] of byPosition) {
    // Calculate PPM for each player
    const ppmEntries: { id: number; ppm: number; isBudget: boolean }[] = [];

    for (const p of posPlayers) {
      const ppm = p.now_cost > 0 ? (p.total_points / p.now_cost) * 10 : 0;
      ppmEntries.push({
        id: p.id,
        ppm,
        isBudget: p.now_cost < 60, // Under 6.0m
      });
    }

    // Sort by PPM for percentile ranking
    ppmEntries.sort((a, b) => a.ppm - b.ppm);
    const n = ppmEntries.length;

    for (let i = 0; i < n; i++) {
      let percentile = n > 1 ? (i / (n - 1)) * 100 : 50;

      // Budget enabler bonus: players under 6.0m in top 50% get a boost
      if (ppmEntries[i].isBudget && percentile > 50) {
        percentile = Math.min(100, percentile * 1.1);
      }

      result.set(ppmEntries[i].id, Math.round(percentile * 10) / 10);
    }
  }

  return result;
}
