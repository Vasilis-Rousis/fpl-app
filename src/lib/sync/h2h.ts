import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { getAllH2HMatches, getH2HStandings } from "@/lib/fpl/api";

export async function syncH2H(leagueId: number) {
  const supabase = createServerClient();
  const allMatches = await getAllH2HMatches(leagueId);

  const matchRows = allMatches.map((m) => ({
    id: m.id,
    league_id: leagueId,
    event: m.event,
    entry_1_entry: m.entry_1_entry,
    entry_1_name: m.entry_1_name,
    entry_1_player_name: m.entry_1_player_name,
    entry_1_points: m.entry_1_points,
    entry_1_win: m.entry_1_win,
    entry_1_draw: m.entry_1_draw,
    entry_1_loss: m.entry_1_loss,
    entry_1_total: m.entry_1_total,
    entry_2_entry: m.entry_2_entry,
    entry_2_name: m.entry_2_name,
    entry_2_player_name: m.entry_2_player_name,
    entry_2_points: m.entry_2_points,
    entry_2_win: m.entry_2_win,
    entry_2_draw: m.entry_2_draw,
    entry_2_loss: m.entry_2_loss,
    entry_2_total: m.entry_2_total,
    is_knockout: m.is_knockout,
    winner: m.winner,
    seed_value: m.seed_value,
    tiebreak: m.tiebreak,
    updated_at: new Date().toISOString(),
  }));

  const BATCH_SIZE = 100;
  for (let i = 0; i < matchRows.length; i += BATCH_SIZE) {
    const batch = matchRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("h2h_matches")
      .upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`H2H sync failed at batch ${i}: ${error.message}`);
  }

  return { matches: matchRows.length };
}

export async function getH2HLeagueStandings(leagueId: number) {
  const response = await getH2HStandings(leagueId);
  return response;
}
