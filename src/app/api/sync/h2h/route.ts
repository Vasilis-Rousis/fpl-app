import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/sync/auth";
import { syncH2H } from "@/lib/sync/h2h";
import { H2H_LEAGUE_ID } from "@/lib/fpl/constants";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leagueId = parseInt(H2H_LEAGUE_ID);
    const result = await syncH2H(leagueId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("H2H sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
