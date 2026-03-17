import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { getLiveGameweek } from "@/lib/fpl/api";

export async function syncLiveGameweek(eventId: number) {
  const supabase = createServerClient();
  const data = await getLiveGameweek(eventId);

  const liveData = data.elements.map((el) => ({
    event: eventId,
    element: el.id,
    total_points: el.stats.total_points,
    stats: el.stats,
    explain_data: el.explain,
    modified: true,
    updated_at: new Date().toISOString(),
  }));

  const BATCH_SIZE = 100;
  for (let i = 0; i < liveData.length; i += BATCH_SIZE) {
    const batch = liveData.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("live_gameweek")
      .upsert(batch, { onConflict: "event,element" });
    if (error) throw new Error(`Live GW sync failed at batch ${i}: ${error.message}`);
  }

  return { elements: liveData.length };
}
