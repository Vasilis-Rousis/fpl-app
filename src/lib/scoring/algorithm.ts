import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { calculateAllFormScores } from "./form";
import { calculateAllFixtureScores } from "./fixtures";
import { calculateAllConsistencyScores } from "./consistency";
import { calculateAllValueScores } from "./value";
import { calculateAllHomeAwayScores } from "./home-away";

// Position-specific weights
const WEIGHTS: Record<number, {
  form: number;
  fixture: number;
  consistency: number;
  value: number;
  homeAway: number;
}> = {
  1: { form: 0.25, fixture: 0.30, consistency: 0.25, value: 0.10, homeAway: 0.10 }, // GKP
  2: { form: 0.25, fixture: 0.30, consistency: 0.20, value: 0.10, homeAway: 0.15 }, // DEF
  3: { form: 0.30, fixture: 0.25, consistency: 0.15, value: 0.15, homeAway: 0.15 }, // MID
  4: { form: 0.35, fixture: 0.20, consistency: 0.10, value: 0.15, homeAway: 0.20 }, // FWD
};

export interface PlayerScore {
  element: number;
  elementType: number;
  compositeScore: number;
  formScore: number;
  fixtureScore: number;
  consistencyScore: number;
  valueScore: number;
  homeAwayScore: number;
  captainScore: number;
}

/**
 * Compute composite scores for all players for a given gameweek.
 */
export async function computeAllScores(currentGameweek: number): Promise<PlayerScore[]> {
  // Run all sub-score calculations in parallel
  const [formScores, fixtureScores, consistencyScores, valueScores, homeAwayScores] =
    await Promise.all([
      calculateAllFormScores(currentGameweek),
      calculateAllFixtureScores(currentGameweek),
      calculateAllConsistencyScores(currentGameweek),
      calculateAllValueScores(),
      calculateAllHomeAwayScores(currentGameweek),
    ]);

  // Get player positions and metadata
  const supabase = createServerClient();
  const { data: players } = await supabase
    .from("players")
    .select("id, element_type, penalties_order, selected_by_percent")
    .eq("status", "a");

  if (!players) return [];

  // Check for DGW
  const { data: nextFixtures } = await supabase
    .from("fixtures")
    .select("team_h, team_a")
    .eq("event", currentGameweek + 1);

  const teamFixtureCount = new Map<number, number>();
  if (nextFixtures) {
    for (const f of nextFixtures) {
      teamFixtureCount.set(f.team_h, (teamFixtureCount.get(f.team_h) ?? 0) + 1);
      teamFixtureCount.set(f.team_a, (teamFixtureCount.get(f.team_a) ?? 0) + 1);
    }
  }

  const results: PlayerScore[] = [];

  for (const player of players) {
    const w = WEIGHTS[player.element_type] ?? WEIGHTS[3];

    const form = formScores.get(player.id) ?? 0;
    const fixture = fixtureScores.get(player.id) ?? 0;
    const consistency = consistencyScores.get(player.id) ?? 0;
    const value = valueScores.get(player.id) ?? 0;
    const homeAway = homeAwayScores.get(player.id) ?? 0;

    const composite =
      w.form * form +
      w.fixture * fixture +
      w.consistency * consistency +
      w.value * value +
      w.homeAway * homeAway;

    // Captain score modifiers
    let captainMultiplier = 1.0;

    // Penalty taker bonus
    if (player.penalties_order === 1) captainMultiplier *= 1.15;

    // High ownership penalty for H2H (less differential value)
    const ownership = parseFloat(player.selected_by_percent || "0");
    if (ownership > 50) captainMultiplier *= 0.95;

    const captainScore = composite * captainMultiplier;

    results.push({
      element: player.id,
      elementType: player.element_type,
      compositeScore: Math.round(composite * 10) / 10,
      formScore: Math.round(form * 10) / 10,
      fixtureScore: Math.round(fixture * 10) / 10,
      consistencyScore: Math.round(consistency * 10) / 10,
      valueScore: Math.round(value * 10) / 10,
      homeAwayScore: Math.round(homeAway * 10) / 10,
      captainScore: Math.round(captainScore * 10) / 10,
    });
  }

  // Sort by composite score descending
  results.sort((a, b) => b.compositeScore - a.compositeScore);

  return results;
}

/**
 * Store computed scores to Supabase.
 */
export async function storeScores(
  scores: PlayerScore[],
  gameweek: number
): Promise<number> {
  const supabase = createServerClient();

  const rows = scores.map((s) => ({
    element: s.element,
    gameweek,
    composite_score: s.compositeScore,
    form_score: s.formScore,
    fixture_score: s.fixtureScore,
    consistency_score: s.consistencyScore,
    value_score: s.valueScore,
    home_away_score: s.homeAwayScore,
    captain_score: s.captainScore,
    computed_at: new Date().toISOString(),
  }));

  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("player_scores")
      .upsert(batch, { onConflict: "element,gameweek" });
    if (error) throw new Error(`Score storage failed at batch ${i}: ${error.message}`);
  }

  return rows.length;
}
