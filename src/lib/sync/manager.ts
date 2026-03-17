import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import {
  getManagerHistory,
  getManagerPicks,
  getManagerTransfers,
} from "@/lib/fpl/api";

export async function syncManager(managerId: number) {
  const supabase = createServerClient();

  // Sync manager history
  const history = await getManagerHistory(managerId);

  const historyRows = history.current.map((h) => ({
    manager_id: managerId,
    event: h.event,
    points: h.points,
    total_points: h.total_points,
    rank: h.rank,
    overall_rank: h.overall_rank,
    bank: h.bank,
    value: h.value,
    event_transfers: h.event_transfers,
    event_transfers_cost: h.event_transfers_cost,
    points_on_bench: h.points_on_bench,
    updated_at: new Date().toISOString(),
  }));

  if (historyRows.length > 0) {
    const { error } = await supabase
      .from("manager_history")
      .upsert(historyRows, { onConflict: "manager_id,event" });
    if (error) throw new Error(`Manager history sync failed: ${error.message}`);
  }

  // Sync transfers
  const transfers = await getManagerTransfers(managerId);

  const transferRows = transfers.map((t) => ({
    manager_id: managerId,
    element_in: t.element_in,
    element_in_cost: t.element_in_cost,
    element_out: t.element_out,
    element_out_cost: t.element_out_cost,
    entry: t.entry,
    event: t.event,
    time: t.time,
  }));

  if (transferRows.length > 0) {
    const { error } = await supabase
      .from("manager_transfers")
      .upsert(transferRows, { onConflict: "manager_id,event,element_in,element_out" });
    if (error) throw new Error(`Manager transfers sync failed: ${error.message}`);
  }

  return {
    historyRows: historyRows.length,
    transfers: transferRows.length,
  };
}

export async function syncManagerPicks(managerId: number, eventId: number) {
  const supabase = createServerClient();

  const picksData = await getManagerPicks(managerId, eventId);

  const picks = picksData.picks.map((p) => ({
    manager_id: managerId,
    event: eventId,
    element: p.element,
    position: p.position,
    multiplier: p.multiplier,
    is_captain: p.is_captain,
    is_vice_captain: p.is_vice_captain,
    updated_at: new Date().toISOString(),
  }));

  if (picks.length > 0) {
    const { error } = await supabase
      .from("manager_picks")
      .upsert(picks, { onConflict: "manager_id,event,element" });
    if (error) throw new Error(`Manager picks sync failed: ${error.message}`);
  }

  return { picks: picks.length };
}
