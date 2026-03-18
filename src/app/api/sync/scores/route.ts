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

    const { data: nextGW } = await supabase
      .from("gameweeks")
      .select("id")
      .eq("is_next", true)
      .single();

    const computeGW = currentGW?.id ?? (nextGW ? nextGW.id - 1 : null);
    if (!computeGW) {
      return NextResponse.json({ message: "No gameweek found" });
    }

    const storeGW = nextGW?.id ?? computeGW;
    const scores = await computeAllScores(computeGW);
    const stored = await storeScores(scores, storeGW);

    return NextResponse.json({
      success: true,
      computedWith: computeGW,
      storedUnder: storeGW,
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
