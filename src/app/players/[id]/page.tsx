import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatPrice, getPositionFull, getStatus, formatNumber } from "@/lib/utils/formatting";
import PlayerFormChart from "@/components/players/PlayerFormChart";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { DifficultyBadge } from "@/components/ui/ScoreBadge";
import { ArrowLeft, TrendingUp, Target, Shield, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  // Fetch player
  const { data: player } = await supabase
    .from("players")
    .select("*, teams:team(name, short_name)")
    .eq("id", parseInt(id))
    .single();

  if (!player) notFound();

  // Fetch player history
  const { data: history } = await supabase
    .from("player_history")
    .select("*")
    .eq("element", parseInt(id))
    .order("round", { ascending: true });

  // Fetch GW context — scores are stored under nextGW
  const { data: nextGW } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("is_next", true)
    .single();

  const { data: currentGW } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("is_current", true)
    .single();

  const scoreGW = nextGW?.id ?? currentGW?.id;
  let score = null;
  if (scoreGW) {
    const { data: scoreData } = await supabase
      .from("player_scores")
      .select("*")
      .eq("element", parseInt(id))
      .eq("gameweek", scoreGW)
      .single();
    score = scoreData;
  }

  // Fetch upcoming fixtures
  const { data: upcomingFixtures } = await supabase
    .from("fixtures")
    .select("event, team_h, team_a, team_h_difficulty, team_a_difficulty, kickoff_time, teams_h:team_h(short_name), teams_a:team_a(short_name)")
    .or(`team_h.eq.${player.team},team_a.eq.${player.team}`)
    .eq("finished", false)
    .order("event", { ascending: true })
    .limit(5);

  // Check if player's team has a blank in the next GW
  const hasBlankNextGW =
    nextGW &&
    upcomingFixtures &&
    !upcomingFixtures.some((f) => f.event === nextGW.id);

  const statusInfo = getStatus(player.status);
  const teamInfo = player.teams as unknown as { name: string; short_name: string };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/players"
        className="inline-flex items-center gap-1.5 text-sm text-fpl-muted hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Players
      </Link>

      {/* Player Header */}
      <div className="rounded-xl border border-fpl-border bg-fpl-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">
                {player.first_name} {player.second_name}
              </h1>
              <span className={`text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="mt-1 text-fpl-muted">
              {teamInfo?.name} &middot; {getPositionFull(player.element_type)} &middot;{" "}
              {formatPrice(player.now_cost)}m
            </p>
            {player.news && (
              <p className="mt-2 text-sm text-yellow-400">{player.news}</p>
            )}
          </div>

          {score && (
            <div className="text-right">
              <p className="text-sm text-fpl-muted">Algorithm Score</p>
              <div className="mt-1">
                <ScoreBadge score={score.composite_score} size="lg" />
              </div>
              {hasBlankNextGW && (
                <div className="mt-2 flex items-center justify-end gap-1 text-yellow-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Blank GW{nextGW.id}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Key Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <MiniStat icon={TrendingUp} label="Total Pts" value={player.total_points} />
          <MiniStat icon={Target} label="Goals" value={player.goals_scored} />
          <MiniStat icon={Target} label="Assists" value={player.assists} />
          <MiniStat icon={Shield} label="CS" value={player.clean_sheets} />
          <MiniStat icon={Clock} label="Minutes" value={formatNumber(player.minutes)} />
          <MiniStat icon={TrendingUp} label="Form" value={player.form} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Chart */}
        <div className="rounded-xl border border-fpl-border bg-fpl-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Points & xGI History</h2>
          {history && history.length > 0 ? (
            <PlayerFormChart history={history} />
          ) : (
            <p className="text-fpl-muted">No history data available yet. Sync player history first.</p>
          )}
        </div>

        {/* Score Breakdown */}
        {score && (
          <div className="rounded-xl border border-fpl-border bg-fpl-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Score Breakdown</h2>
            <div className="space-y-3">
              <ScoreBar label="Form" score={score.form_score} />
              <ScoreBar label="Fixtures" score={score.fixture_score} />
              <ScoreBar label="Consistency" score={score.consistency_score} />
              <ScoreBar label="Value" score={score.value_score} />
              <ScoreBar label="Home/Away" score={score.home_away_score} />
              <div className="border-t border-fpl-border pt-3">
                <ScoreBar label="Captain Score" score={score.captain_score} highlight />
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Fixtures */}
        <div className="rounded-xl border border-fpl-border bg-fpl-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Upcoming Fixtures</h2>
          {upcomingFixtures && (upcomingFixtures.length > 0 || hasBlankNextGW) ? (
            <div className="space-y-2">
              {hasBlankNextGW && (
                <div className="flex items-center justify-between rounded-lg bg-yellow-400/10 border border-yellow-400/20 px-4 py-2.5">
                  <span className="text-sm text-fpl-muted">GW{nextGW.id}</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-yellow-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    No fixture
                  </span>
                  <span className="rounded bg-yellow-400/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                    BLANK
                  </span>
                </div>
              )}
              {upcomingFixtures.map((f) => {
                const isHome = f.team_h === player.team;
                const opponent = isHome
                  ? (f.teams_a as unknown as { short_name: string })?.short_name
                  : (f.teams_h as unknown as { short_name: string })?.short_name;
                const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;

                return (
                  <div
                    key={f.event}
                    className="flex items-center justify-between rounded-lg bg-fpl-darker/50 px-4 py-2.5"
                  >
                    <span className="text-sm text-fpl-muted">GW{f.event}</span>
                    <span className="text-sm font-medium">
                      {opponent} ({isHome ? "H" : "A"})
                    </span>
                    <DifficultyBadge difficulty={difficulty} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-fpl-muted">No upcoming fixtures available.</p>
          )}
        </div>

        {/* xG Stats */}
        <div className="rounded-xl border border-fpl-border bg-fpl-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Expected Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-fpl-muted">xG</p>
              <p className="text-xl font-bold text-white">
                {parseFloat(player.expected_goals || "0").toFixed(2)}
              </p>
              <p className="text-xs text-fpl-muted">
                vs {player.goals_scored} actual
              </p>
            </div>
            <div>
              <p className="text-sm text-fpl-muted">xA</p>
              <p className="text-xl font-bold text-white">
                {parseFloat(player.expected_assists || "0").toFixed(2)}
              </p>
              <p className="text-xs text-fpl-muted">
                vs {player.assists} actual
              </p>
            </div>
            <div>
              <p className="text-sm text-fpl-muted">xGI</p>
              <p className="text-xl font-bold text-white">
                {parseFloat(player.expected_goal_involvements || "0").toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-fpl-muted">ICT Index</p>
              <p className="text-xl font-bold text-white">
                {parseFloat(player.ict_index || "0").toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-fpl-darker/50 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-fpl-muted" />
        <span className="text-xs text-fpl-muted">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function ScoreBar({
  label,
  score,
  highlight = false,
}: {
  label: string;
  score: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className={highlight ? "font-medium text-fpl-green" : "text-fpl-muted"}>
          {label}
        </span>
        <span className={`font-medium ${highlight ? "text-fpl-green" : "text-white"}`}>
          {score.toFixed(1)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-fpl-darker">
        <div
          className={`h-full rounded-full transition-all ${
            highlight ? "bg-fpl-green" : "bg-fpl-green/60"
          }`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}
