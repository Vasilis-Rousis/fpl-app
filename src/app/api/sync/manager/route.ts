import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/sync/auth";
import { syncManager, syncManagerPicks } from "@/lib/sync/manager";
import { createServerClient } from "@/lib/supabase/server";
import { FPL_MANAGER_ID } from "@/lib/fpl/constants";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const managerId = parseInt(FPL_MANAGER_ID);
    const result = await syncManager(managerId);

    // Also sync picks for the current gameweek
    const supabase = createServerClient();
    const { data: currentGW } = await supabase
      .from("gameweeks")
      .select("id")
      .eq("is_current", true)
      .single();

    let picksResult = { picks: 0 };
    if (currentGW) {
      try {
        picksResult = await syncManagerPicks(managerId, currentGW.id);
      } catch {
        // Picks may not be available yet
      }
    }

    return NextResponse.json({ success: true, ...result, ...picksResult });
  } catch (error) {
    console.error("Manager sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
