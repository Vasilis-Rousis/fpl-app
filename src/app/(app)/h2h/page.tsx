import { createServerClient } from "@/lib/supabase/server";
import { Swords, Trophy, Minus, X } from "lucide-react";
import { FPL_MANAGER_ID, H2H_LEAGUE_ID } from "@/lib/fpl/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function H2HPage() {
  const supabase = createServerClient();
  const managerId = parseInt(FPL_MANAGER_ID);
  const leagueId = parseInt(H2H_LEAGUE_ID);

  // Get all H2H matches
  const { data: matches } = await supabase
    .from("h2h_matches")
    .select("*")
    .eq("league_id", leagueId)
    .order("event", { ascending: true });

  // Get next GW for upcoming opponent
  const { data: nextGW } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("is_next", true)
    .single();

  if (!matches || matches.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState />
      </div>
    );
  }

  // Build standings from matches
  const standings = new Map<
    number,
    {
      entry: number;
      name: string;
      playerName: string;
      wins: number;
      draws: number;
      losses: number;
      points: number;
      pointsFor: number;
    }
  >();

  // Split matches into played and upcoming
  const playedMatches = matches.filter(
    (m) => !nextGW || m.event < nextGW.id
  );
  const upcomingMatches = matches.filter(
    (m) => nextGW && m.event >= nextGW.id
  );

  for (const m of playedMatches) {
    for (const side of [1, 2] as const) {
      const entry = side === 1 ? m.entry_1_entry : m.entry_2_entry;
      const name = side === 1 ? m.entry_1_name : m.entry_2_name;
      const playerName =
        side === 1 ? m.entry_1_player_name : m.entry_2_player_name;
      const pts = side === 1 ? m.entry_1_points : m.entry_2_points;

      if (!entry) continue;

      if (!standings.has(entry)) {
        standings.set(entry, {
          entry,
          name,
          playerName,
          wins: 0,
          draws: 0,
          losses: 0,
          points: 0,
          pointsFor: 0,
        });
      }

      const s = standings.get(entry)!;
      s.pointsFor += pts ?? 0;

      // Determine winner by comparing points (FPL API winner field is often null)
      const myPts = pts ?? 0;
      const oppPts = (side === 1 ? m.entry_2_points : m.entry_1_points) ?? 0;

      if (myPts > oppPts) {
        s.wins++;
        s.points += 3;
      } else if (myPts === oppPts) {
        s.draws++;
        s.points += 1;
      } else {
        s.losses++;
      }
    }
  }

  const sortedStandings = Array.from(standings.values()).sort(
    (a, b) => b.points - a.points || b.pointsFor - a.pointsFor
  );

  // Find next GW opponent
  const currentMatch = nextGW
    ? matches.find(
        (m) =>
          m.event === nextGW.id &&
          (m.entry_1_entry === managerId || m.entry_2_entry === managerId)
      )
    : null;

  const opponentEntry = currentMatch
    ? currentMatch.entry_1_entry === managerId
      ? currentMatch.entry_2_entry
      : currentMatch.entry_1_entry
    : null;

  const opponentName = currentMatch
    ? currentMatch.entry_1_entry === managerId
      ? currentMatch.entry_2_player_name
      : currentMatch.entry_1_player_name
    : null;

  // My H2H record (only played matches)
  const myMatches = playedMatches.filter(
    (m) => m.entry_1_entry === managerId || m.entry_2_entry === managerId
  );
  const myUpcoming = upcomingMatches.filter(
    (m) => m.entry_1_entry === managerId || m.entry_2_entry === managerId
  );
  const myWins = myMatches.filter((m) => {
    const isEntry1 = m.entry_1_entry === managerId;
    const myPts = isEntry1 ? m.entry_1_points : m.entry_2_points;
    const oppPts = isEntry1 ? m.entry_2_points : m.entry_1_points;
    return (myPts ?? 0) > (oppPts ?? 0);
  }).length;
  const myDraws = myMatches.filter((m) => {
    const isEntry1 = m.entry_1_entry === managerId;
    const myPts = isEntry1 ? m.entry_1_points : m.entry_2_points;
    const oppPts = isEntry1 ? m.entry_2_points : m.entry_1_points;
    return (myPts ?? 0) === (oppPts ?? 0);
  }).length;
  const myLosses = myMatches.length - myWins - myDraws;

  return (
    <div className="space-y-8">
      <Header />

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatBox
          icon={Trophy}
          label="Wins"
          value={myWins}
          color="text-fpl-green"
        />
        <StatBox
          icon={Minus}
          label="Draws"
          value={myDraws}
          color="text-yellow-400"
        />
        <StatBox
          icon={X}
          label="Losses"
          value={myLosses}
          color="text-fpl-pink"
        />
      </div>

      {/* Current Opponent */}
      {currentMatch && opponentEntry && (
        <div className="rounded-xl border border-fpl-green/30 bg-fpl-green/5 p-6">
          <h2 className="text-lg font-bold">Next Gameweek Opponent</h2>
          <p className="mt-1 text-fpl-muted">
            You&apos;re playing against{" "}
            <span className="font-medium text-white">{opponentName}</span>
          </p>
          <Link
            href="/h2h/matchup"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-fpl-green px-4 py-2 text-sm font-medium text-fpl-purple transition-colors hover:bg-fpl-green/90"
          >
            <Swords className="h-4 w-4" />
            View Matchup Details
          </Link>
        </div>
      )}

      {/* League Table */}
      <section>
        <h2 className="mb-4 text-xl font-bold">League Standings</h2>
        <div className="overflow-x-auto rounded-xl border border-fpl-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-fpl-border bg-fpl-card text-left text-xs font-medium uppercase text-fpl-muted">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3 w-10">W</th>
                <th className="px-4 py-3 w-10">D</th>
                <th className="px-4 py-3 w-10">L</th>
                <th className="px-4 py-3 w-16">PF</th>
                <th className="px-4 py-3 w-16">Pts</th>
              </tr>
            </thead>
            <tbody>
              {sortedStandings.map((s, i) => (
                <tr
                  key={s.entry}
                  className={`border-b border-fpl-border/50 transition-colors hover:bg-fpl-card-hover ${
                    s.entry === managerId ? "bg-fpl-green/5" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 text-sm text-fpl-muted">
                    {i + 1}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-sm font-medium text-white">
                      {s.playerName}
                      {s.entry === managerId && (
                        <span className="ml-1.5 text-xs text-fpl-green">
                          (You)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-fpl-muted">{s.name}</p>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-fpl-green">
                    {s.wins}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-yellow-400">
                    {s.draws}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-fpl-pink">
                    {s.losses}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-fpl-muted">
                    {s.pointsFor}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-bold">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Upcoming Fixtures */}
      {myUpcoming.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Upcoming Fixtures</h2>
          <div className="space-y-2">
            {myUpcoming
              .sort((a, b) => a.event - b.event)
              .map((m) => {
                const isEntry1 = m.entry_1_entry === managerId;
                const oppName = isEntry1
                  ? m.entry_2_player_name
                  : m.entry_1_player_name;

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-fpl-border bg-fpl-card px-4 py-3"
                  >
                    <span className="text-sm text-fpl-muted">GW{m.event}</span>
                    <span className="text-sm">vs {oppName}</span>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-fpl-muted">
                      Upcoming
                    </span>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Match History */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Match History</h2>
        <div className="space-y-2">
          {myMatches.length === 0 && (
            <p className="text-sm text-fpl-muted">No matches played yet.</p>
          )}
          {myMatches
            .sort((a, b) => b.event - a.event)
            .map((m) => {
              const isEntry1 = m.entry_1_entry === managerId;
              const myPoints = isEntry1 ? m.entry_1_points : m.entry_2_points;
              const oppPoints = isEntry1 ? m.entry_2_points : m.entry_1_points;
              const oppName = isEntry1
                ? m.entry_2_player_name
                : m.entry_1_player_name;
              const won = (myPoints ?? 0) > (oppPoints ?? 0);
              const drew = (myPoints ?? 0) === (oppPoints ?? 0);

              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    won
                      ? "border-fpl-green/20 bg-fpl-green/5"
                      : drew
                        ? "border-yellow-400/20 bg-yellow-400/5"
                        : "border-fpl-pink/20 bg-fpl-pink/5"
                  }`}
                >
                  <span className="text-sm text-fpl-muted">GW{m.event}</span>
                  <span className="text-sm">vs {oppName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{myPoints}</span>
                    <span className="text-fpl-muted">-</span>
                    <span className="font-bold">{oppPoints}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        won
                          ? "bg-fpl-green/20 text-fpl-green"
                          : drew
                            ? "bg-yellow-400/20 text-yellow-400"
                            : "bg-fpl-pink/20 text-fpl-pink"
                      }`}
                    >
                      {won ? "W" : drew ? "D" : "L"}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-fpl-pink/10 p-2.5">
        <Swords className="h-6 w-6 text-fpl-pink" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">H2H League</h1>
        <p className="text-sm text-fpl-muted">
          League standings, results, and opponent insights
        </p>
      </div>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Trophy;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-fpl-border bg-fpl-card p-5 text-center">
      <Icon className={`mx-auto h-6 w-6 ${color}`} />
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-fpl-muted">{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-fpl-border bg-fpl-card p-8 text-center">
      <Swords className="mx-auto h-12 w-12 text-fpl-muted" />
      <p className="mt-4 text-fpl-muted">
        No H2H data yet. Sync your league data first.
      </p>
    </div>
  );
}
