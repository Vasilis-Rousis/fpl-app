import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { getElementSummary } from "@/lib/fpl/api";

const BATCH_SIZE = 50; // Players per cron invocation

export async function syncPlayerHistory() {
  const supabase = createServerClient();

  // Get the last synced cursor from sync_log
  const { data: lastSync } = await supabase
    .from("sync_log")
    .select("sync_key")
    .eq("sync_type", "player_history")
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  const lastSyncedId = lastSync?.sync_key ? parseInt(lastSync.sync_key) : 0;

  // Get the next batch of available players sorted by ID
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id")
    .eq("status", "a")
    .gt("id", lastSyncedId)
    .order("id", { ascending: true })
    .limit(BATCH_SIZE);

  if (playersError) throw new Error(`Failed to fetch players: ${playersError.message}`);
  if (!players || players.length === 0) {
    // Wrap around — start from the beginning
    const { data: firstBatch, error: firstError } = await supabase
      .from("players")
      .select("id")
      .eq("status", "a")
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    if (firstError) throw new Error(`Failed to fetch first batch: ${firstError.message}`);
    if (!firstBatch || firstBatch.length === 0) return { synced: 0, lastId: 0 };

    return await syncBatch(supabase, firstBatch.map((p) => p.id));
  }

  return await syncBatch(supabase, players.map((p) => p.id));
}

async function syncBatch(
  supabase: ReturnType<typeof createServerClient>,
  playerIds: number[]
) {
  let synced = 0;
  let lastId = 0;

  for (const playerId of playerIds) {
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
          console.error(`Player ${playerId} history sync failed: ${error.message}`);
          continue;
        }
      }

      synced++;
      lastId = playerId;
    } catch (error) {
      console.error(`Failed to sync player ${playerId}:`, error);
      continue;
    }
  }

  // Log the sync
  if (lastId > 0) {
    await supabase.from("sync_log").insert({
      sync_type: "player_history",
      sync_key: lastId.toString(),
      status: "success",
      completed_at: new Date().toISOString(),
      rows_affected: synced,
    });
  }

  return { synced, lastId };
}
