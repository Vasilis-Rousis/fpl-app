import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/sync/auth";
import { syncPlayerHistory } from "@/lib/sync/player-history";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncPlayerHistory();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Player history sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
