import {
  Trophy,
  TrendingUp,
  Users,
  Calendar,
  Swords,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export const revalidate = 300; // ISR: revalidate every 5 minutes

export default function Dashboard() {
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
          value="--"
          subtext="Deadline TBD"
          icon={Calendar}
        />
        <QuickStatCard
          label="Overall Rank"
          value="--"
          subtext="Syncing..."
          icon={TrendingUp}
        />
        <QuickStatCard
          label="Total Points"
          value="--"
          subtext="Season 24/25"
          icon={Trophy}
        />
        <QuickStatCard
          label="H2H Record"
          value="--"
          subtext="W-D-L"
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

      {/* Setup Notice */}
      <div className="rounded-xl border border-fpl-border bg-fpl-card p-6">
        <h2 className="text-lg font-semibold text-white">Getting Started</h2>
        <p className="mt-2 text-sm text-fpl-muted">
          To populate your dashboard with live data, you need to:
        </p>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-fpl-muted">
          <li>
            Create a Supabase project and run the SQL schema from{" "}
            <code className="rounded bg-fpl-border px-1.5 py-0.5 text-xs text-fpl-green">
              supabase/schema.sql
            </code>
          </li>
          <li>
            Add your Supabase URL and keys to{" "}
            <code className="rounded bg-fpl-border px-1.5 py-0.5 text-xs text-fpl-green">
              .env.local
            </code>
          </li>
          <li>
            Trigger the initial data sync by visiting{" "}
            <code className="rounded bg-fpl-border px-1.5 py-0.5 text-xs text-fpl-green">
              /api/sync/bootstrap
            </code>
          </li>
        </ol>
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
