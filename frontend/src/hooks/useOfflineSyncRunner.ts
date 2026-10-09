/**
 * useOfflineSyncRunner — retries queued backend writes when connectivity returns.
 *
 * Only syncs non-sensitive field confirmations (not final form submissions).
 * Final submissions ALWAYS require explicit user action while online.
 * Prevents duplicate writes by checking response + removing from queue.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOfflineStore, SyncQueueItem } from './useOfflineStore';
import { confirmField } from '../services/api';
import { NetworkStatus } from './useNetworkStatus';

interface SyncRunnerResult {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
}

export function useOfflineSyncRunner(status: NetworkStatus): SyncRunnerResult {
  const { getPendingSyncItems, removeSyncItem } = useOfflineStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const syncLockRef = useRef(false);

  // Refresh pending count periodically
  const refreshCount = useCallback(async () => {
    const items = await getPendingSyncItems();
    setPendingCount(items.length);
  }, [getPendingSyncItems]);

  // Run sync when we go back online
  const runSync = useCallback(async () => {
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    setIsSyncing(true);

    try {
      const items = await getPendingSyncItems();
      if (items.length === 0) {
        setIsSyncing(false);
        syncLockRef.current = false;
        return;
      }

      for (const item of items) {
        try {
          await syncItem(item);
          await removeSyncItem(item.id);
        } catch (err) {
          // Leave in queue for next retry — don't blow up other items
          console.warn('[SyncRunner] Failed to sync item', item.id, err);
        }
      }

      setLastSyncAt(new Date().toISOString());
    } finally {
      await refreshCount();
      setIsSyncing(false);
      syncLockRef.current = false;
    }
  }, [getPendingSyncItems, removeSyncItem, refreshCount]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Trigger sync when coming back online
  useEffect(() => {
    if (status.isOnline) {
      runSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.isOnline]);

  return { isSyncing, pendingCount, lastSyncAt };
}

async function syncItem(item: SyncQueueItem): Promise<void> {
  if (item.type === 'confirm_field') {
    const { sessionId, fieldId, confirmed, candidateValue } = item.payload as {
      sessionId: string;
      fieldId: string;
      confirmed: boolean;
      candidateValue: string;
    };
    await confirmField(sessionId, fieldId, confirmed, candidateValue);
  }
  // 'help_request' sync is intentionally skipped — agent callback is not critical
  // and should be re-raised by the user when back online.
}
