import { createServerClient } from "@/lib/supabase/server";
import { ArrowLeftRight, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { DifficultyBadge } from "@/components/ui/ScoreBadge";
import { formatPrice, getPosition } from "@/lib/utils/formatting";
import { FPL_MANAGER_ID } from "@/lib/fpl/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface TransferSuggestion {
  sellPlayer: {
    id: number;
    web_name: string;
    element_type: number;
    now_cost: number;
    team_short_name: string;
    score: number;
  };
  buyPlayer: {
    id: number;
    web_name: string;
    element_type: number;
    now_cost: number;
    team_short_name: string;
    score: number;
  };
  scoreDelta: number;
  costDelta: number;
}

export default async function TransfersPage() {
  const supabase = createServerClient();
  const managerId = parseInt(FPL_MANAGER_ID);

  // Use next gameweek for forward-looking transfers
  const { data: nextGW } = await supabase
    .from("gameweeks")
    .select("id, name")
    .eq("is_next", true)
    .single();

  // Also get current GW for squad picks
  const { data: currentGW } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!nextGW) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState message="No upcoming gameweek found. Sync data first." />
      </div>
    );
  }

  // Get current squad (picks are from the current/latest GW)
  const { data: picks } = await supabase
    .from("manager_picks")
    .select("element, position, is_captain")
    .eq("manager_id", managerId)
    .eq("event", currentGW?.id ?? nextGW.id - 1);

  if (!picks || picks.length === 0) {
    return (
      <div className="space-y-6">
        <Header gwName={nextGW.name} />
        <EmptyState message="No squad data found. Sync manager data first." />
      </div>
    );
  }

  const squadIds = picks.map((p) => p.element);

  // Get teams map
  const { data: teams } = await supabase.from("teams").select("id, short_name");
  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t.short_name]));

  // Get all player scores and details
  const { data: allScored } = await supabase
    .from("player_scores")
    .select(
      "element, composite_score, players:element(id, web_name, element_type, now_cost, team, status)"
    )
    .eq("gameweek", nextGW.id)
    .order("composite_score", { ascending: false });

  if (!allScored) {
    return (
      <div className="space-y-6">
        <Header gwName={nextGW.name} />
        <EmptyState message="No scores computed. Run the scoring algorithm first." />
      </div>
    );
  }

  // Get bank
  const { data: managerHistory } = await supabase
    .from("manager_history")
    .select("bank, value")
    .eq("manager_id", managerId)
    .order("event", { ascending: false })
    .limit(1)
    .single();

  const bank = managerHistory?.bank ?? 0;

  // Generate transfer suggestions
  const suggestions: TransferSuggestion[] = [];

  const squadPlayers = allScored.filter((s) => squadIds.includes(s.element));
  const nonSquadPlayers = allScored.filter(
    (s) =>
      !squadIds.includes(s.element) &&
      (s.players as unknown as { status: string })?.status === "a"
  );

  // For each squad player, find the best replacement
  for (const current of squadPlayers) {
    const currentPlayer = current.players as unknown as {
      id: number;
      web_name: string;
      element_type: number;
      now_cost: number;
      team: number;
    };

    // Find best replacement of same position within budget
    const maxBudget = currentPlayer.now_cost + bank;

    const replacements = nonSquadPlayers
      .filter((r) => {
        const rp = r.players as unknown as { element_type: number; now_cost: number; team: number };
        return (
          rp.element_type === currentPlayer.element_type &&
          rp.now_cost <= maxBudget
        );
      })
      .sort((a, b) => b.composite_score - a.composite_score);

    if (replacements.length > 0) {
      const best = replacements[0];
      const bestPlayer = best.players as unknown as {
        id: number;
        web_name: string;
        element_type: number;
        now_cost: number;
        team: number;
      };

      const scoreDelta = best.composite_score - current.composite_score;
      if (scoreDelta > 1.5) {
        suggestions.push({
          sellPlayer: {
            ...currentPlayer,
            team_short_name: teamMap[currentPlayer.team] ?? "???",
            score: current.composite_score,
          },
          buyPlayer: {
            ...bestPlayer,
            team_short_name: teamMap[bestPlayer.team] ?? "???",
            score: best.composite_score,
          },
          scoreDelta: Math.round(scoreDelta * 10) / 10,
          costDelta: bestPlayer.now_cost - currentPlayer.now_cost,
        });
      }
    }
  }

  // Sort by score improvement
  suggestions.sort((a, b) => b.scoreDelta - a.scoreDelta);

  // Get upcoming fixtures for context
  const { data: upcomingFixtures } = await supabase
    .from("fixtures")
    .select("event, team_h, team_a, team_h_difficulty, team_a_difficulty")
    .gte("event", nextGW.id)
    .lte("event", nextGW.id + 3)
    .eq("finished", false);

  return (
    <div className="space-y-8">
      <Header gwName={nextGW.name} />

      {/* Budget Info */}
      <div className="rounded-xl border border-fpl-border bg-fpl-card p-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-sm text-fpl-muted">Bank</p>
            <p className="text-xl font-bold text-fpl-green">
              {formatPrice(bank)}m
            </p>
          </div>
          <div>
            <p className="text-sm text-fpl-muted">Squad Value</p>
            <p className="text-xl font-bold">
              {managerHistory ? formatPrice(managerHistory.value) : "--"}m
            </p>
          </div>
          <div>
            <p className="text-sm text-fpl-muted">Suggestions</p>
            <p className="text-xl font-bold">{suggestions.length}</p>
          </div>
        </div>
      </div>

      {/* Transfer Suggestions */}
      {suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.slice(0, 10).map((s, i) => (
            <div
              key={i}
              className="rounded-xl border border-fpl-border bg-fpl-card p-5 transition-all hover:border-fpl-green/30"
            >
              <div className="flex flex-wrap items-center gap-4">
                {/* Sell */}
                <div className="flex-1 min-w-[140px]">
                  <p className="text-xs font-medium text-fpl-pink flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" /> SELL
                  </p>
                  <Link
                    href={`/players/${s.sellPlayer.id}`}
                    className="mt-1 block font-bold text-white hover:text-fpl-green"
                  >
                    {s.sellPlayer.web_name}
                  </Link>
                  <p className="text-xs text-fpl-muted">
                    {s.sellPlayer.team_short_name} &middot;{" "}
                    {getPosition(s.sellPlayer.element_type)} &middot;{" "}
                    {formatPrice(s.sellPlayer.now_cost)}m
                  </p>
                  <div className="mt-2">
                    <ScoreBadge score={s.sellPlayer.score} size="sm" />
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center">
                  <ArrowRight className="h-6 w-6 text-fpl-green" />
                  <span className="mt-1 text-xs font-bold text-fpl-green">
                    +{s.scoreDelta}
                  </span>
                </div>

                {/* Buy */}
                <div className="flex-1 min-w-[140px]">
                  <p className="text-xs font-medium text-fpl-green flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> BUY
                  </p>
                  <Link
                    href={`/players/${s.buyPlayer.id}`}
                    className="mt-1 block font-bold text-white hover:text-fpl-green"
                  >
                    {s.buyPlayer.web_name}
                  </Link>
                  <p className="text-xs text-fpl-muted">
                    {s.buyPlayer.team_short_name} &middot;{" "}
                    {getPosition(s.buyPlayer.element_type)} &middot;{" "}
                    {formatPrice(s.buyPlayer.now_cost)}m
                  </p>
                  <div className="mt-2">
                    <ScoreBadge score={s.buyPlayer.score} size="sm" />
                  </div>
                </div>

                {/* Cost delta */}
                <div className="text-right">
                  <p className="text-xs text-fpl-muted">Cost</p>
                  <p
                    className={`text-sm font-bold ${
                      s.costDelta > 0 ? "text-fpl-pink" : "text-fpl-green"
                    }`}
                  >
                    {s.costDelta > 0 ? "+" : ""}
                    {formatPrice(s.costDelta)}m
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No transfer improvements found above threshold. Your squad looks strong!" />
      )}
    </div>
  );
}

function Header({ gwName }: { gwName?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-purple-500/10 p-2.5">
        <ArrowLeftRight className="h-6 w-6 text-purple-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Transfer Recommender</h1>
        <p className="text-sm text-fpl-muted">
          {gwName
            ? `Smart suggestions for ${gwName}`
            : "Transfer suggestions will appear after data sync"}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-fpl-border bg-fpl-card p-8 text-center">
      <ArrowLeftRight className="mx-auto h-12 w-12 text-fpl-muted" />
      <p className="mt-4 text-fpl-muted">{message}</p>
    </div>
  );
}
