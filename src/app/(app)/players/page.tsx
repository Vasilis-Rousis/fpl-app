import { createServerClient } from "@/lib/supabase/server";
import PlayerTable from "@/components/players/PlayerTable";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const supabase = createServerClient();

  // Get next gameweek (scores are stored under next GW)
  const { data: nextGW } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("is_next", true)
    .single();

  // Fetch players
  const { data: players } = await supabase
    .from("players")
    .select(
      "id, web_name, team, element_type, now_cost, total_points, form, goals_scored, assists, clean_sheets, minutes, selected_by_percent, status"
    )
    .order("total_points", { ascending: false });

  // Fetch teams
  const { data: teams } = await supabase
    .from("teams")
    .select("id, short_name")
    .order("name");

  // Fetch scores if available
  let scoreMap: Record<number, number> = {};
  if (nextGW) {
    const { data: scores } = await supabase
      .from("player_scores")
      .select("element, composite_score")
      .eq("gameweek", nextGW.id);

    if (scores) {
      scoreMap = Object.fromEntries(scores.map((s) => [s.element, s.composite_score]));
    }
  }

  // Determine which teams have a blank next GW
  let blankTeamIds = new Set<number>();
  if (nextGW) {
    const { data: nextFixtures } = await supabase
      .from("fixtures")
      .select("team_h, team_a")
      .eq("event", nextGW.id);

    const playingTeams = new Set<number>();
    for (const f of nextFixtures ?? []) {
      playingTeams.add(f.team_h);
      playingTeams.add(f.team_a);
    }
    blankTeamIds = new Set(
      (teams ?? []).map((t) => t.id).filter((id) => !playingTeams.has(id))
    );
  }

  // Build team name map
  const teamMap = Object.fromEntries(
    (teams ?? []).map((t) => [t.id, t.short_name])
  );

  // Combine data
  const playerRows = (players ?? []).map((p) => ({
    ...p,
    team_short_name: teamMap[p.team] ?? "???",
    composite_score: scoreMap[p.id] ?? null,
    has_blank: blankTeamIds.has(p.team),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-500/10 p-2.5">
          <Users className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Player Database</h1>
          <p className="text-sm text-fpl-muted">
            Search, filter, and analyze all Premier League players
          </p>
        </div>
      </div>

      <PlayerTable players={playerRows} teams={teams ?? []} />
    </div>
  );
}
