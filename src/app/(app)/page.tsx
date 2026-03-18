import {
  Trophy,
  TrendingUp,
  Users,
  Calendar,
  Swords,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { FPL_MANAGER_ID, H2H_LEAGUE_ID } from "@/lib/fpl/constants";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  let gwLabel = "--";
  let gwDeadline = "Deadline TBD";
  let overallRank = "--";
  let totalPoints = "--";
  let h2hRecord = "--";
  let h2hSubtext = "W-D-L";

  if (isSupabaseConfigured()) {
    const supabase = createServerClient();
    const managerId = parseInt(FPL_MANAGER_ID);
    const leagueId = parseInt(H2H_LEAGUE_ID);

    // Current gameweek
    const { data: currentGW } = await supabase
      .from("gameweeks")
      .select("id, name, deadline_time")
      .eq("is_current", true)
      .single();

    if (currentGW) {
      gwLabel = `GW${currentGW.id}`;
      if (currentGW.deadline_time) {
        gwDeadline = new Date(currentGW.deadline_time).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    // Manager history — latest event
    const { data: latestHistory } = await supabase
      .from("manager_history")
      .select("total_points, overall_rank")
      .eq("manager_id", managerId)
      .order("event", { ascending: false })
      .limit(1)
      .single();

    if (latestHistory) {
      totalPoints = latestHistory.total_points?.toLocaleString() ?? "--";
      overallRank = latestHistory.overall_rank?.toLocaleString() ?? "--";
    }

    // H2H record
    const { data: matches } = await supabase
      .from("h2h_matches")
      .select("entry_1_entry, entry_2_entry, entry_1_points, entry_2_points")
      .eq("league_id", leagueId);

    if (matches && matches.length > 0) {
      let wins = 0;
      let draws = 0;
      let losses = 0;

      for (const m of matches) {
        const isEntry1 = m.entry_1_entry === managerId;
        const isEntry2 = m.entry_2_entry === managerId;
        if (!isEntry1 && !isEntry2) continue;

        const myPts = isEntry1 ? m.entry_1_points : m.entry_2_points;
        const oppPts = isEntry1 ? m.entry_2_points : m.entry_1_points;

        if (myPts == null || oppPts == null) continue;

        if (myPts > oppPts) wins++;
        else if (myPts < oppPts) losses++;
        else draws++;
      }

      h2hRecord = `${wins}-${draws}-${losses}`;
      h2hSubtext = "W-D-L";
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          FPL<span className="text-fpl-green">Edge</span> Dashboard
        </h1>
        <p className="mt-1 text-fpl-muted">
          Your Fantasy Premier League command center
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          label="Current GW"
          value={gwLabel}
          subtext={gwDeadline}
          icon={Calendar}
        />
        <QuickStatCard
          label="Overall Rank"
          value={overallRank}
          subtext="Season 24/25"
          icon={TrendingUp}
        />
        <QuickStatCard
          label="Total Points"
          value={totalPoints}
          subtext="Season 24/25"
          icon={Trophy}
        />
        <QuickStatCard
          label="H2H Record"
          value={h2hRecord}
          subtext={h2hSubtext}
          icon={Swords}
        />
      </div>

      {/* Navigation Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <NavCard
          href="/players"
          title="Player Database"
          description="Search, filter, and analyze all 700+ Premier League players with our scoring algorithm."
          icon={Users}
          color="bg-blue-500/10 text-blue-400"
        />
        <NavCard
          href="/recommendations"
          title="Best Picks"
          description="AI-powered Best XI, captain picks, and player rankings for the upcoming gameweek."
          icon={Trophy}
          color="bg-fpl-green/10 text-fpl-green"
        />
        <NavCard
          href="/recommendations/transfers"
          title="Transfer Recommender"
          description="Smart transfer suggestions based on form, fixtures, and value analysis."
          icon={TrendingUp}
          color="bg-purple-500/10 text-purple-400"
        />
        <NavCard
          href="/h2h"
          title="H2H League"
          description="League standings, opponent analysis, and matchup insights for your H2H league."
          icon={Swords}
          color="bg-fpl-pink/10 text-fpl-pink"
        />
        <NavCard
          href="/fixtures"
          title="Fixture Difficulty"
          description="Visual heatmap of fixture difficulty ratings for all teams across upcoming gameweeks."
          icon={Calendar}
          color="bg-yellow-500/10 text-yellow-400"
        />
      </div>
    </div>
  );
}

function QuickStatCard({
  label,
  value,
  subtext,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: typeof Trophy;
}) {
  return (
    <div className="rounded-xl border border-fpl-border bg-fpl-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-fpl-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          <p className="mt-0.5 text-xs text-fpl-muted">{subtext}</p>
        </div>
        <div className="rounded-lg bg-fpl-green/10 p-3">
          <Icon className="h-6 w-6 text-fpl-green" />
        </div>
      </div>
    </div>
  );
}

function NavCard({
  href,
  title,
  description,
  icon: Icon,
  color,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-fpl-border bg-fpl-card p-6 transition-all hover:border-fpl-green/30 hover:bg-fpl-card-hover"
    >
      <div className={`inline-flex rounded-lg p-2.5 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-fpl-muted">{description}</p>
      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-fpl-green opacity-0 transition-opacity group-hover:opacity-100">
        Explore <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
