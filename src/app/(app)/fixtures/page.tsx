import { createServerClient } from "@/lib/supabase/server";
import { Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  const supabase = createServerClient();

  // Get current GW
  const { data: currentGW } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("is_current", true)
    .single();

  const startGW = currentGW ? currentGW.id + 1 : 1;
  const endGW = Math.min(38, startGW + 5);

  // Get teams
  const { data: teams } = await supabase
    .from("teams")
    .select("id, short_name, name")
    .order("name");

  // Get fixtures for next 6 GWs
  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(
      "event, team_h, team_a, team_h_difficulty, team_a_difficulty, teams_h:team_h(short_name), teams_a:team_a(short_name)"
    )
    .gte("event", startGW)
    .lte("event", endGW)
    .order("event");

  if (!teams || !fixtures) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-xl border border-fpl-border bg-fpl-card p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-fpl-muted" />
          <p className="mt-4 text-fpl-muted">
            No fixture data available. Sync data first.
          </p>
        </div>
      </div>
    );
  }

  // Build heatmap data: team -> [{gw, opponent, difficulty, isHome}]
  const teamFixtures = new Map<
    number,
    { gw: number; opponent: string; difficulty: number; isHome: boolean }[]
  >();

  for (const f of fixtures) {
    const teamsH = f.teams_h as unknown as { short_name: string };
    const teamsA = f.teams_a as unknown as { short_name: string };

    // Home team entry
    if (!teamFixtures.has(f.team_h)) teamFixtures.set(f.team_h, []);
    teamFixtures.get(f.team_h)!.push({
      gw: f.event,
      opponent: teamsA?.short_name ?? "???",
      difficulty: f.team_h_difficulty,
      isHome: true,
    });

    // Away team entry
    if (!teamFixtures.has(f.team_a)) teamFixtures.set(f.team_a, []);
    teamFixtures.get(f.team_a)!.push({
      gw: f.event,
      opponent: teamsH?.short_name ?? "???",
      difficulty: f.team_a_difficulty,
      isHome: false,
    });
  }

  const gwNumbers = Array.from(
    { length: endGW - startGW + 1 },
    (_, i) => startGW + i
  );

  const fdrColors: Record<number, string> = {
    1: "bg-[#257d5a] text-white",
    2: "bg-[#01fc7a] text-[#1a1a2e]",
    3: "bg-[#e7e7e7] text-[#1a1a2e]",
    4: "bg-[#ff1751] text-white",
    5: "bg-[#80072d] text-white",
  };

  return (
    <div className="space-y-6">
      <Header />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-fpl-muted">Difficulty:</span>
        {[1, 2, 3, 4, 5].map((d) => (
          <div key={d} className="flex items-center gap-1.5">
            <div
              className={`h-5 w-5 rounded text-center text-xs font-bold leading-5 ${fdrColors[d]}`}
            >
              {d}
            </div>
            <span className="text-xs text-fpl-muted">
              {d === 1
                ? "Very Easy"
                : d === 2
                  ? "Easy"
                  : d === 3
                    ? "Medium"
                    : d === 4
                      ? "Hard"
                      : "Very Hard"}
            </span>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto rounded-xl border border-fpl-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-fpl-border bg-fpl-card">
              <th className="sticky left-0 z-10 bg-fpl-card px-4 py-3 text-left text-xs font-medium uppercase text-fpl-muted">
                Team
              </th>
              {gwNumbers.map((gw) => (
                <th
                  key={gw}
                  className="px-3 py-3 text-center text-xs font-medium uppercase text-fpl-muted"
                >
                  GW{gw}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const tFixtures = teamFixtures.get(team.id) ?? [];

              return (
                <tr
                  key={team.id}
                  className="border-b border-fpl-border/50 hover:bg-fpl-card-hover/50"
                >
                  <td className="sticky left-0 z-10 bg-fpl-darker px-4 py-2 text-sm font-medium">
                    {team.short_name}
                  </td>
                  {gwNumbers.map((gw) => {
                    const gwFixtures = tFixtures.filter((f) => f.gw === gw);

                    return (
                      <td key={gw} className="px-1 py-1">
                        <div className="flex flex-col gap-0.5">
                          {gwFixtures.length > 0 ? (
                            gwFixtures.map((f, fi) => (
                              <div
                                key={fi}
                                className={`rounded px-2 py-1.5 text-center text-xs font-bold ${
                                  fdrColors[f.difficulty] ??
                                  "bg-gray-500 text-white"
                                }`}
                              >
                                {f.opponent}
                                <span className="ml-0.5 font-normal opacity-70">
                                  ({f.isHome ? "H" : "A"})
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="rounded bg-fpl-border/30 px-2 py-1.5 text-center text-xs text-fpl-muted">
                              -
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-yellow-500/10 p-2.5">
        <Calendar className="h-6 w-6 text-yellow-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Fixture Difficulty</h1>
        <p className="text-sm text-fpl-muted">
          Color-coded fixture difficulty ratings for all teams
        </p>
      </div>
    </div>
  );
}
