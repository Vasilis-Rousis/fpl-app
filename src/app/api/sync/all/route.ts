import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { syncBootstrap } from "@/lib/sync/bootstrap";
import { syncFixtures } from "@/lib/sync/fixtures";
import { syncLiveGameweek } from "@/lib/sync/live";
import { syncPlayerHistory } from "@/lib/sync/player-history";
import { syncManager, syncManagerPicks } from "@/lib/sync/manager";
import { syncH2H } from "@/lib/sync/h2h";
import { computeAllScores, storeScores } from "@/lib/scoring/algorithm";
import { FPL_MANAGER_ID, H2H_LEAGUE_ID } from "@/lib/fpl/constants";

const SYNC_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { skipped: true, reason: "Supabase not configured" },
      { status: 200 }
    );
  }

  const supabase = createServerClient();

  // Check last successful sync
  const { data: lastSync } = await supabase
    .from("sync_log")
    .select("completed_at")
    .eq("sync_type", "full_sync")
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (lastSync?.completed_at) {
    const elapsed = Date.now() - new Date(lastSync.completed_at).getTime();
    if (elapsed < SYNC_COOLDOWN_MS) {
      return NextResponse.json({
        skipped: true,
        reason: "Synced recently",
        lastSync: lastSync.completed_at,
        nextSyncIn: Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000),
      });
    }
  }

  // Log sync start
  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({
      sync_type: "full_sync",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  // Run syncs — bootstrap first (teams, gameweeks, players are dependencies)
  try {
    results.bootstrap = await syncBootstrap();
  } catch (e) {
    errors.push(`bootstrap: ${e instanceof Error ? e.message : String(e)}`);
  }

  // These can run after bootstrap
  const parallel = await Promise.allSettled([
    syncFixtures(),
    syncPlayerHistory(),
    syncH2H(parseInt(H2H_LEAGUE_ID)),
    syncManager(parseInt(FPL_MANAGER_ID)),
  ]);

  const names = ["fixtures", "playerHistory", "h2h", "manager"];
  parallel.forEach((r, i) => {
    if (r.status === "fulfilled") {
      results[names[i]] = r.value;
    } else {
      errors.push(`${names[i]}: ${r.reason}`);
    }
  });

  // Live gameweek + scores — needs GW data from bootstrap
  try {
    const { data: currentGW } = await supabase
      .from("gameweeks")
      .select("id")
      .eq("is_current", true)
      .single();

    const { data: nextGW } = await supabase
      .from("gameweeks")
      .select("id")
      .eq("is_next", true)
      .single();

    // Determine the latest completed GW for picks
    const latestPlayedGW = currentGW?.id ?? (nextGW ? nextGW.id - 1 : null);

    if (currentGW) {
      results.live = await syncLiveGameweek(currentGW.id);
    }

    // Sync manager picks for the latest played GW
    if (latestPlayedGW) {
      try {
        results.picks = await syncManagerPicks(
          parseInt(FPL_MANAGER_ID),
          latestPlayedGW
        );
      } catch {
        // Picks may not be available yet
      }

      // Sync H2H opponent's picks and transfers
      try {
        const managerId = parseInt(FPL_MANAGER_ID);
        const leagueId = parseInt(H2H_LEAGUE_ID);
        const targetGW = nextGW?.id ?? currentGW?.id;

        if (targetGW) {
          const { data: h2hMatches } = await supabase
            .from("h2h_matches")
            .select("entry_1_entry, entry_2_entry")
            .eq("league_id", leagueId)
            .eq("event", targetGW);

          const match = h2hMatches?.find(
            (m) =>
              m.entry_1_entry === managerId || m.entry_2_entry === managerId
          );

          if (match) {
            const opponentId =
              match.entry_1_entry === managerId
                ? match.entry_2_entry
                : match.entry_1_entry;

            const [oppPicks, oppManager] = await Promise.allSettled([
              syncManagerPicks(opponentId, latestPlayedGW),
              syncManager(opponentId),
            ]);

            results.opponentPicks =
              oppPicks.status === "fulfilled" ? oppPicks.value : "failed";
            results.opponentManager =
              oppManager.status === "fulfilled" ? oppManager.value : "failed";
          }
        }
      } catch (e) {
        errors.push(
          `opponent sync: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    // Compute scores: algorithm uses currentGW context (looks at GW+1 fixtures)
    // Store under nextGW so display pages can query by is_next
    if (currentGW) {
      const storeUnderGW = nextGW?.id ?? currentGW.id;
      try {
        const scores = await computeAllScores(currentGW.id);
        const stored = await storeScores(scores, storeUnderGW);
        results.scores = { gameweek: storeUnderGW, playersScored: stored };
      } catch (e) {
        errors.push(`scores: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    errors.push(`live: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Update sync log
  const status = errors.length === 0 ? "success" : "partial";
  if (logEntry?.id) {
    await supabase
      .from("sync_log")
      .update({
        status,
        completed_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join("; ") : null,
      })
      .eq("id", logEntry.id);
  }

  return NextResponse.json({
    success: errors.length === 0,
    status,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
