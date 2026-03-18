"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export default function SyncManager() {
  const isSyncing = useRef(false);
  const [syncing, setSyncing] = useState(false);

  const triggerSync = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    setSyncing(true);

    try {
      await fetch("/api/sync/all");
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      isSyncing.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Sync on load
    triggerSync();

    // Poll every 10 minutes while tab is open
    const interval = setInterval(triggerSync, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [triggerSync]);

  return (
    <button
      onClick={triggerSync}
      disabled={syncing}
      title={syncing ? "Syncing..." : "Sync data"}
      className="rounded-lg p-2 text-fpl-muted transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
    >
      <RefreshCw
        className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
      />
    </button>
  );
}
