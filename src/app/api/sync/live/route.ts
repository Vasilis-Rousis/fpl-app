import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/sync/auth";
import { syncLiveGameweek } from "@/lib/sync/live";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the current gameweek
    const supabase = createServerClient();
    const { data: currentGW } = await supabase
      .from("gameweeks")
      .select("id")
      .eq("is_current", true)
      .single();

    if (!currentGW) {
      return NextResponse.json({ message: "No current gameweek found" });
    }

    const result = await syncLiveGameweek(currentGW.id);
    return NextResponse.json({ success: true, event: currentGW.id, ...result });
  } catch (error) {
    console.error("Live sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
