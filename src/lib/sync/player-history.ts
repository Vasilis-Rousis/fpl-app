import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { getElementSummary } from "@/lib/fpl/api";

const CONCURRENCY = 5;
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours between full syncs

export async function syncPlayerHistory(force = false) {
  const supabase = createServerClient();

  // Check if we synced recently
  const { data: lastSync } = await supabase
    .from("sync_log")
    .select("completed_at")
    .eq("sync_type", "player_history")
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (!force && lastSync?.completed_at) {
    const elapsed = Date.now() - new Date(lastSync.completed_at).getTime();
    if (elapsed < COOLDOWN_MS) {
      return { skipped: true, nextSyncIn: Math.ceil((COOLDOWN_MS - elapsed) / 1000 / 60) };
    }
  }

  // Get all available players
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id")
    .eq("status", "a")
    .order("id", { ascending: true });

  if (playersError)
    throw new Error(`Failed to fetch players: ${playersError.message}`);
  if (!players || players.length === 0) return { synced: 0, total: 0 };

  const playerIds = players.map((p) => p.id);
  let synced = 0;

  // Process in concurrent batches
  for (let i = 0; i < playerIds.length; i += CONCURRENCY) {
    const batch = playerIds.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map((playerId) => syncSinglePlayer(supabase, playerId))
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) synced++;
    }
  }

  // Log the sync
  await supabase.from("sync_log").insert({
    sync_type: "player_history",
    sync_key: playerIds[playerIds.length - 1].toString(),
    status: "success",
    completed_at: new Date().toISOString(),
    rows_affected: synced,
  });

  return { synced, total: playerIds.length };
}

async function syncSinglePlayer(
  supabase: ReturnType<typeof createServerClient>,
  playerId: number
): Promise<boolean> {
  try {
    const summary = await getElementSummary(playerId);

    const historyRows = summary.history.map((h) => ({
      element: h.element,
      fixture: h.fixture,
      opponent_team: h.opponent_team,
      round: h.round,
      was_home: h.was_home,
      kickoff_time: h.kickoff_time,
      total_points: h.total_points,
      minutes: h.minutes,
      goals_scored: h.goals_scored,
      assists: h.assists,
      clean_sheets: h.clean_sheets,
      goals_conceded: h.goals_conceded,
      own_goals: h.own_goals,
      penalties_saved: h.penalties_saved,
      penalties_missed: h.penalties_missed,
      yellow_cards: h.yellow_cards,
      red_cards: h.red_cards,
      saves: h.saves,
      bonus: h.bonus,
      bps: h.bps,
      influence: h.influence,
      creativity: h.creativity,
      threat: h.threat,
      ict_index: h.ict_index,
      starts: h.starts,
      expected_goals: h.expected_goals,
      expected_assists: h.expected_assists,
      expected_goal_involvements: h.expected_goal_involvements,
      expected_goals_conceded: h.expected_goals_conceded,
      value: h.value,
      transfers_balance: h.transfers_balance,
      selected: h.selected,
      transfers_in: h.transfers_in,
      transfers_out: h.transfers_out,
    }));

    if (historyRows.length > 0) {
      const { error } = await supabase
        .from("player_history")
        .upsert(historyRows, { onConflict: "element,round" });
      if (error) {
        console.error(
          `Player ${playerId} history sync failed: ${error.message}`
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(`Failed to sync player ${playerId}:`, error);
    return false;
  }
}
