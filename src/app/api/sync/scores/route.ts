import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/sync/auth";
import { computeAllScores, storeScores } from "@/lib/scoring/algorithm";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Find the current gameweek
    const { data: currentGW } = await supabase
      .from("gameweeks")
      .select("id")
      .eq("is_current", true)
      .single();

    if (!currentGW) {
      return NextResponse.json({ message: "No current gameweek found" });
    }

    const scores = await computeAllScores(currentGW.id);
    const stored = await storeScores(scores, currentGW.id);

    return NextResponse.json({
      success: true,
      gameweek: currentGW.id,
      playersScored: stored,
    });
  } catch (error) {
    console.error("Score computation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
