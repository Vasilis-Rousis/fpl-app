import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { getBootstrapStatic } from "@/lib/fpl/api";

export async function syncBootstrap() {
  const supabase = createServerClient();
  const data = await getBootstrapStatic();

  // Upsert teams
  const teams = data.teams.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    short_name: t.short_name,
    strength: t.strength,
    strength_overall_home: t.strength_overall_home,
    strength_overall_away: t.strength_overall_away,
    strength_attack_home: t.strength_attack_home,
    strength_attack_away: t.strength_attack_away,
    strength_defence_home: t.strength_defence_home,
    strength_defence_away: t.strength_defence_away,
    position: t.position,
    played: t.played,
    win: t.win,
    draw: t.draw,
    loss: t.loss,
    points: t.points,
    form: t.form,
    pulse_id: t.pulse_id,
    updated_at: new Date().toISOString(),
  }));

  const { error: teamsError } = await supabase
    .from("teams")
    .upsert(teams, { onConflict: "id" });
  if (teamsError) throw new Error(`Teams sync failed: ${teamsError.message}`);

  // Upsert gameweeks
  const gameweeks = data.events.map((e) => ({
    id: e.id,
    name: e.name,
    deadline_time: e.deadline_time,
    deadline_time_epoch: e.deadline_time_epoch,
    average_entry_score: e.average_entry_score,
    highest_score: e.highest_score,
    finished: e.finished,
    data_checked: e.data_checked,
    is_previous: e.is_previous,
    is_current: e.is_current,
    is_next: e.is_next,
    most_selected: e.most_selected,
    most_captained: e.most_captained,
    most_vice_captained: e.most_vice_captained,
    most_transferred_in: e.most_transferred_in,
    top_element: e.top_element,
    chip_plays: e.chip_plays,
    updated_at: new Date().toISOString(),
  }));

  const { error: gwError } = await supabase
    .from("gameweeks")
    .upsert(gameweeks, { onConflict: "id" });
  if (gwError) throw new Error(`Gameweeks sync failed: ${gwError.message}`);

  // Upsert players in batches of 100
  const players = data.elements.map((p) => ({
    id: p.id,
    code: p.code,
    first_name: p.first_name,
    second_name: p.second_name,
    web_name: p.web_name,
    team: p.team,
    element_type: p.element_type,
    now_cost: p.now_cost,
    status: p.status,
    chance_of_playing_next_round: p.chance_of_playing_next_round,
    chance_of_playing_this_round: p.chance_of_playing_this_round,
    news: p.news,
    news_added: p.news_added,
    form: p.form,
    points_per_game: p.points_per_game,
    selected_by_percent: p.selected_by_percent,
    total_points: p.total_points,
    event_points: p.event_points,
    minutes: p.minutes,
    goals_scored: p.goals_scored,
    assists: p.assists,
    clean_sheets: p.clean_sheets,
    goals_conceded: p.goals_conceded,
    own_goals: p.own_goals,
    penalties_saved: p.penalties_saved,
    penalties_missed: p.penalties_missed,
    yellow_cards: p.yellow_cards,
    red_cards: p.red_cards,
    saves: p.saves,
    bonus: p.bonus,
    bps: p.bps,
    influence: p.influence,
    creativity: p.creativity,
    threat: p.threat,
    ict_index: p.ict_index,
    starts: p.starts,
    expected_goals: p.expected_goals,
    expected_assists: p.expected_assists,
    expected_goal_involvements: p.expected_goal_involvements,
    expected_goals_conceded: p.expected_goals_conceded,
    transfers_in: p.transfers_in,
    transfers_in_event: p.transfers_in_event,
    transfers_out: p.transfers_out,
    transfers_out_event: p.transfers_out_event,
    cost_change_event: p.cost_change_event,
    cost_change_start: p.cost_change_start,
    value_form: p.value_form,
    value_season: p.value_season,
    ep_next: p.ep_next,
    ep_this: p.ep_this,
    corners_and_indirect_freekicks_order: p.corners_and_indirect_freekicks_order,
    penalties_order: p.penalties_order,
    dreamteam_count: p.dreamteam_count,
    in_dreamteam: p.in_dreamteam,
    updated_at: new Date().toISOString(),
  }));

  const BATCH_SIZE = 100;
  for (let i = 0; i < players.length; i += BATCH_SIZE) {
    const batch = players.slice(i, i + BATCH_SIZE);
    const { error: playersError } = await supabase
      .from("players")
      .upsert(batch, { onConflict: "id" });
    if (playersError) throw new Error(`Players sync failed at batch ${i}: ${playersError.message}`);
  }

  return {
    teams: teams.length,
    gameweeks: gameweeks.length,
    players: players.length,
  };
}
