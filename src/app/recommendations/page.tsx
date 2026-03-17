import { createServerClient } from "@/lib/supabase/server";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { Trophy, Crown, Star } from "lucide-react";
import Link from "next/link";
import { formatPrice, getPosition } from "@/lib/utils/formatting";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const supabase = createServerClient();

  const { data: currentGW } = await supabase
    .from("gameweeks")
    .select("id, name")
    .eq("is_current", true)
    .single();

  if (!currentGW) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState />
      </div>
    );
  }

  // Fetch scored players with their details
  const { data: scoredPlayers } = await supabase
    .from("player_scores")
    .select(
      "element, composite_score, form_score, fixture_score, captain_score, players:element(id, web_name, team, element_type, now_cost, total_points, form, selected_by_percent, teams:team(short_name))"
    )
    .eq("gameweek", currentGW.id)
    .order("composite_score", { ascending: false })
    .limit(50);

  // Captain picks (top by captain_score)
  const { data: captainPicks } = await supabase
    .from("player_scores")
    .select(
      "element, captain_score, composite_score, players:element(id, web_name, team, element_type, now_cost, teams:team(short_name))"
    )
    .eq("gameweek", currentGW.id)
    .order("captain_score", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <Header gwName={currentGW.name} />

      {/* Captain Picks */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Crown className="h-5 w-5 text-yellow-400" />
          Captain Picks
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(captainPicks ?? []).map((pick, i) => {
            const player = pick.players as unknown as {
              id: number;
              web_name: string;
              element_type: number;
              now_cost: number;
              teams: { short_name: string };
            };

            return (
              <Link
                key={pick.element}
                href={`/players/${player.id}`}
                className={`rounded-xl border p-4 transition-all hover:bg-fpl-card-hover ${
                  i === 0
                    ? "border-yellow-400/30 bg-yellow-400/5"
                    : "border-fpl-border bg-fpl-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-fpl-muted">#{i + 1}</span>
                  {i === 0 && <Crown className="h-4 w-4 text-yellow-400" />}
                </div>
                <p className="mt-2 font-bold text-white">{player.web_name}</p>
                <p className="text-xs text-fpl-muted">
                  {player.teams?.short_name} &middot;{" "}
                  {getPosition(player.element_type)} &middot;{" "}
                  {formatPrice(player.now_cost)}m
                </p>
                <div className="mt-3">
                  <ScoreBadge score={pick.captain_score} size="sm" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Top Ranked Players by Position */}
      {[
        { type: 1, label: "Goalkeepers", icon: "🧤" },
        { type: 2, label: "Defenders", icon: "🛡️" },
        { type: 3, label: "Midfielders", icon: "⚡" },
        { type: 4, label: "Forwards", icon: "⚽" },
      ].map(({ type, label }) => {
        const posPlayers = (scoredPlayers ?? []).filter((p) => {
          const player = p.players as unknown as { element_type: number };
          return player?.element_type === type;
        });

        return (
          <section key={type}>
            <h2 className="mb-3 text-lg font-bold">{label}</h2>
            <div className="overflow-x-auto rounded-xl border border-fpl-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-fpl-border bg-fpl-card text-left text-xs font-medium uppercase text-fpl-muted">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Form</th>
                    <th className="px-4 py-3">Fixtures</th>
                    <th className="px-4 py-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {posPlayers.slice(0, 10).map((sp, i) => {
                    const player = sp.players as unknown as {
                      id: number;
                      web_name: string;
                      now_cost: number;
                      teams: { short_name: string };
                    };

                    return (
                      <tr
                        key={sp.element}
                        className="border-b border-fpl-border/50 hover:bg-fpl-card-hover"
                      >
                        <td className="px-4 py-2.5 text-sm text-fpl-muted">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/players/${player.id}`}
                            className="text-sm font-medium text-white hover:text-fpl-green"
                          >
                            {player.web_name}
                            <span className="ml-1.5 text-xs text-fpl-muted">
                              {player.teams?.short_name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-sm">
                          {formatPrice(player.now_cost)}
                        </td>
                        <td className="px-4 py-2.5">
                          <ScoreBadge score={sp.form_score} size="sm" />
                        </td>
                        <td className="px-4 py-2.5">
                          <ScoreBadge score={sp.fixture_score} size="sm" />
                        </td>
                        <td className="px-4 py-2.5">
                          <ScoreBadge score={sp.composite_score} size="sm" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Header({ gwName }: { gwName?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-fpl-green/10 p-2.5">
        <Trophy className="h-6 w-6 text-fpl-green" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Best Picks</h1>
        <p className="text-sm text-fpl-muted">
          {gwName
            ? `Algorithm-ranked players for ${gwName}`
            : "Player rankings will appear after data sync"}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-fpl-border bg-fpl-card p-8 text-center">
      <Star className="mx-auto h-12 w-12 text-fpl-muted" />
      <p className="mt-4 text-fpl-muted">
        No scores computed yet. Sync data and run the scoring algorithm first.
      </p>
    </div>
  );
}
