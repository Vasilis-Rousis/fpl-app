import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { getFixtures } from "@/lib/fpl/api";

export async function syncFixtures() {
  const supabase = createServerClient();
  const data = await getFixtures();

  const fixtures = data.map((f) => ({
    id: f.id,
    code: f.code,
    event: f.event,
    team_h: f.team_h,
    team_a: f.team_a,
    team_h_score: f.team_h_score,
    team_a_score: f.team_a_score,
    team_h_difficulty: f.team_h_difficulty,
    team_a_difficulty: f.team_a_difficulty,
    kickoff_time: f.kickoff_time,
    finished: f.finished,
    finished_provisional: f.finished_provisional,
    started: f.started,
    minutes: f.minutes,
    stats: f.stats,
    pulse_id: f.pulse_id,
    updated_at: new Date().toISOString(),
  }));

  const BATCH_SIZE = 100;
  for (let i = 0; i < fixtures.length; i += BATCH_SIZE) {
    const batch = fixtures.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("fixtures")
      .upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`Fixtures sync failed at batch ${i}: ${error.message}`);
  }

  return { fixtures: fixtures.length };
}
