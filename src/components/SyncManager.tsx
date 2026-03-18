"use client";

import { useEffect, useRef } from "react";

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export default function SyncManager() {
  const isSyncing = useRef(false);

  useEffect(() => {
    async function triggerSync() {
      if (isSyncing.current) return;
      isSyncing.current = true;

      try {
        await fetch("/api/sync/all");
      } catch (e) {
        console.error("Sync failed:", e);
      } finally {
        isSyncing.current = false;
      }
    }

    // Sync on load
    triggerSync();

    // Poll every 10 minutes while tab is open
    const interval = setInterval(triggerSync, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return null;
}
