import { createServerClient } from "@/lib/supabase/server";
import { Swords, ArrowLeft, Crown } from "lucide-react";
import { FPL_MANAGER_ID, H2H_LEAGUE_ID } from "@/lib/fpl/constants";
import { formatPrice, getPosition } from "@/lib/utils/formatting";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MatchupPage() {
  const supabase = createServerClient();
  const managerId = parseInt(FPL_MANAGER_ID);
  const leagueId = parseInt(H2H_LEAGUE_ID);

  const { data: currentGW } = await supabase
    .from("gameweeks")
    .select("id, name")
    .eq("is_current", true)
    .single();

  if (!currentGW) {
    return <EmptyPage message="No current gameweek found." />;
  }

  // Find opponent
  const { data: matches } = await supabase
    .from("h2h_matches")
    .select("*")
    .eq("league_id", leagueId)
    .eq("event", currentGW.id);

  const match = matches?.find(
    (m) => m.entry_1_entry === managerId || m.entry_2_entry === managerId
  );

  if (!match) {
    return <EmptyPage message="No H2H match found for this gameweek." />;
  }

  const isEntry1 = match.entry_1_entry === managerId;
  const opponentId = isEntry1 ? match.entry_2_entry : match.entry_1_entry;
  const opponentName = isEntry1
    ? match.entry_2_player_name
    : match.entry_1_player_name;
  const opponentTeamName = isEntry1 ? match.entry_2_name : match.entry_1_name;

  // Fetch both squads
  const [{ data: myPicks }, { data: oppPicks }] = await Promise.all([
    supabase
      .from("manager_picks")
      .select("element, position, multiplier, is_captain, is_vice_captain")
      .eq("manager_id", managerId)
      .eq("event", currentGW.id),
    supabase
      .from("manager_picks")
      .select("element, position, multiplier, is_captain, is_vice_captain")
      .eq("manager_id", opponentId)
      .eq("event", currentGW.id),
  ]);

  // Fetch player details
  const allElementIds = [
    ...(myPicks ?? []).map((p) => p.element),
    ...(oppPicks ?? []).map((p) => p.element),
  ];

  const { data: playerDetails } = await supabase
    .from("players")
    .select("id, web_name, element_type, now_cost, team, total_points, form, teams:team(short_name)")
    .in("id", allElementIds);

  const playerMap = Object.fromEntries(
    (playerDetails ?? []).map((p) => [p.id, p])
  );

  // Calculate differentials
  const myIds = new Set((myPicks ?? []).map((p) => p.element));
  const oppIds = new Set((oppPicks ?? []).map((p) => p.element));

  const myDifferentials = [...myIds].filter((id) => !oppIds.has(id));
  const oppDifferentials = [...oppIds].filter((id) => !myIds.has(id));

  // Opponent captain history
  const { data: oppCaptainHistory } = await supabase
    .from("manager_picks")
    .select("event, element, players:element(web_name)")
    .eq("manager_id", opponentId)
    .eq("is_captain", true)
    .order("event", { ascending: false })
    .limit(10);

  // Opponent transfer history
  const { data: oppTransfers } = await supabase
    .from("manager_transfers")
    .select(
      "event, element_in, element_out, element_in_cost, element_out_cost, players_in:element_in(web_name), players_out:element_out(web_name)"
    )
    .eq("manager_id", opponentId)
    .order("event", { ascending: false })
    .limit(10);

  function renderSquad(
    picks: typeof myPicks,
    label: string,
    highlight: boolean
  ) {
    if (!picks) return null;

    const starting = picks.filter((p) => p.multiplier > 0).sort((a, b) => a.position - b.position);
    const bench = picks.filter((p) => p.multiplier === 0).sort((a, b) => a.position - b.position);

    return (
      <div
        className={`rounded-xl border p-5 ${
          highlight
            ? "border-fpl-green/30 bg-fpl-green/5"
            : "border-fpl-border bg-fpl-card"
        }`}
      >
        <h3 className="mb-3 text-lg font-bold">{label}</h3>

        {/* Starting XI */}
        <div className="space-y-1">
          {starting.map((pick) => {
            const p = playerMap[pick.element];
            if (!p) return null;
            const teamInfo = p.teams as unknown as { short_name: string };

            return (
              <div
                key={pick.element}
                className="flex items-center justify-between rounded-lg bg-fpl-darker/50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {pick.is_captain && (
                    <Crown className="h-3.5 w-3.5 text-yellow-400" />
                  )}
                  <Link
                    href={`/players/${p.id}`}
                    className="text-sm font-medium text-white hover:text-fpl-green"
                  >
                    {p.web_name}
                  </Link>
                  <span className="text-xs text-fpl-muted">
                    {teamInfo?.short_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-fpl-muted">
                    {getPosition(p.element_type)}
                  </span>
                  <span className="text-xs text-fpl-muted">
                    {formatPrice(p.now_cost)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bench */}
        {bench.length > 0 && (
          <>
            <p className="mt-3 mb-1 text-xs text-fpl-muted">Bench</p>
            <div className="space-y-1 opacity-60">
              {bench.map((pick) => {
                const p = playerMap[pick.element];
                if (!p) return null;

                return (
                  <div
                    key={pick.element}
                    className="flex items-center justify-between rounded-lg bg-fpl-darker/30 px-3 py-1.5"
                  >
                    <span className="text-xs text-fpl-muted">
                      {p.web_name}
                    </span>
                    <span className="text-xs text-fpl-muted">
                      {getPosition(p.element_type)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/h2h"
        className="inline-flex items-center gap-1.5 text-sm text-fpl-muted hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to H2H League
      </Link>

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-fpl-pink/10 p-2.5">
          <Swords className="h-6 w-6 text-fpl-pink" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {currentGW.name} Matchup
          </h1>
          <p className="text-sm text-fpl-muted">
            vs {opponentName} ({opponentTeamName})
          </p>
        </div>
      </div>

      {/* Side by side squads */}
      <div className="grid gap-4 md:grid-cols-2">
        {renderSquad(myPicks ?? [], "Your Team", true)}
        {renderSquad(oppPicks ?? [], `${opponentName}'s Team`, false)}
      </div>

      {/* Differentials */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-fpl-green/20 bg-fpl-card p-5">
          <h3 className="mb-3 font-bold text-fpl-green">
            Your Differentials ({myDifferentials.length})
          </h3>
          <div className="space-y-1">
            {myDifferentials.map((id) => {
              const p = playerMap[id];
              if (!p) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded bg-fpl-darker/50 px-3 py-2 text-sm"
                >
                  <span>{p.web_name}</span>
                  <span className="text-fpl-muted">
                    {getPosition(p.element_type)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-fpl-pink/20 bg-fpl-card p-5">
          <h3 className="mb-3 font-bold text-fpl-pink">
            Their Differentials ({oppDifferentials.length})
          </h3>
          <div className="space-y-1">
            {oppDifferentials.map((id) => {
              const p = playerMap[id];
              if (!p) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded bg-fpl-darker/50 px-3 py-2 text-sm"
                >
                  <span>{p.web_name}</span>
                  <span className="text-fpl-muted">
                    {getPosition(p.element_type)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Opponent Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Captain History */}
        <div className="rounded-xl border border-fpl-border bg-fpl-card p-5">
          <h3 className="mb-3 font-bold">Opponent Captain History</h3>
          <div className="space-y-1">
            {(oppCaptainHistory ?? []).map((c) => {
              const player = c.players as unknown as { web_name: string };
              return (
                <div
                  key={c.event}
                  className="flex items-center justify-between rounded bg-fpl-darker/50 px-3 py-2 text-sm"
                >
                  <span className="text-fpl-muted">GW{c.event}</span>
                  <span className="flex items-center gap-1.5">
                    <Crown className="h-3 w-3 text-yellow-400" />
                    {player?.web_name ?? "Unknown"}
                  </span>
                </div>
              );
            })}
            {(!oppCaptainHistory || oppCaptainHistory.length === 0) && (
              <p className="text-sm text-fpl-muted">No captain data available.</p>
            )}
          </div>
        </div>

        {/* Transfer History */}
        <div className="rounded-xl border border-fpl-border bg-fpl-card p-5">
          <h3 className="mb-3 font-bold">Opponent Transfers</h3>
          <div className="space-y-1">
            {(oppTransfers ?? []).map((t, i) => {
              const playerIn = t.players_in as unknown as { web_name: string };
              const playerOut = t.players_out as unknown as { web_name: string };
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded bg-fpl-darker/50 px-3 py-2 text-xs"
                >
                  <span className="text-fpl-muted">GW{t.event}</span>
                  <span>
                    <span className="text-fpl-pink">{playerOut?.web_name}</span>
                    {" → "}
                    <span className="text-fpl-green">{playerIn?.web_name}</span>
                  </span>
                </div>
              );
            })}
            {(!oppTransfers || oppTransfers.length === 0) && (
              <p className="text-sm text-fpl-muted">No transfer data available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyPage({ message }: { message: string }) {
  return (
    <div className="space-y-6">
      <Link
        href="/h2h"
        className="inline-flex items-center gap-1.5 text-sm text-fpl-muted hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to H2H League
      </Link>
      <div className="rounded-xl border border-fpl-border bg-fpl-card p-8 text-center">
        <Swords className="mx-auto h-12 w-12 text-fpl-muted" />
        <p className="mt-4 text-fpl-muted">{message}</p>
      </div>
    </div>
  );
}
