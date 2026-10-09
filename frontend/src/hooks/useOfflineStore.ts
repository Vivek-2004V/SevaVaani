/**
 * useOfflineStore — IndexedDB-backed session persistence for SEVA VAANI.
 *
 * Stores:
 *   - Confirmed form answers (field id → value) — saved immediately on confirmation
 *   - Session metadata (sessionId, serviceId, language, currentFieldIndex)
 *   - A sync queue for backend writes that failed due to network loss
 *
 * Security notes:
 *   - Raw audio is NEVER stored.
 *   - No passwords or auth tokens are stored in IndexedDB.
 *   - Only confirmed (user-approved) answers are persisted.
 *   - Data is scoped to the current user's session key.
 *   - Cleared on explicit logout or successful backend sync.
 */

import { useCallback, useRef } from 'react';
import { FormField, SupportedLanguage } from '../types';

const DB_NAME = 'seva_vaani_offline';
const DB_VERSION = 1;
const SESSION_STORE = 'session_state';
const SYNC_STORE = 'sync_queue';

export interface PersistedSession {
  id: string;                        // sessionId
  serviceId: string;
  language: SupportedLanguage;
  currentFieldIndex: number;
  confirmedFields: Array<{           // ONLY confirmed answers
    fieldId: string;
    value: string;
    confirmedAt: string;             // ISO timestamp
  }>;
  savedAt: string;                   // ISO timestamp
}

export interface SyncQueueItem {
  id: string;                        // uuid
  sessionId: string;
  type: 'confirm_field' | 'help_request';  // submission is NEVER queued (requires explicit consent)
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SYNC_STORE)) {
        const sq = db.createObjectStore(SYNC_STORE, { keyPath: 'id' });
        sq.createIndex('sessionId', 'sessionId', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

function idbPut<T>(db: IDBDatabase, store: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export function useOfflineStore() {
  const dbRef = useRef<IDBDatabase | null>(null);

  const getDB = useCallback(async (): Promise<IDBDatabase | null> => {
    if (dbRef.current) return dbRef.current;
    try {
      dbRef.current = await openDB();
      return dbRef.current;
    } catch (err) {
      console.warn('[OfflineStore] IndexedDB unavailable:', err);
      return null;
    }
  }, []);

  /**
   * Save or update the current session progress.
   * Call this every time a field is confirmed.
   */
  const saveSession = useCallback(async (
    sessionId: string,
    serviceId: string,
    language: SupportedLanguage,
    currentFieldIndex: number,
    fields: FormField[]
  ): Promise<void> => {
    const db = await getDB();
    if (!db) return;

    const confirmedFields = fields
      .filter(f => f.confirmed && f.value !== undefined)
      .map(f => ({
        fieldId: f.id,
        value: f.value as string,
        confirmedAt: new Date().toISOString(),
      }));

    const session: PersistedSession = {
      id: sessionId,
      serviceId,
      language,
      currentFieldIndex,
      confirmedFields,
      savedAt: new Date().toISOString(),
    };

    try {
      await idbPut(db, SESSION_STORE, session);
    } catch (err) {
      console.warn('[OfflineStore] saveSession failed:', err);
    }
  }, [getDB]);

  /**
   * Restore a previously saved session by sessionId.
   * Returns null if no session found.
   */
  const restoreSession = useCallback(async (
    sessionId: string
  ): Promise<PersistedSession | null> => {
    const db = await getDB();
    if (!db) return null;

    try {
      const session = await idbGet<PersistedSession>(db, SESSION_STORE, sessionId);
      return session || null;
    } catch (err) {
      console.warn('[OfflineStore] restoreSession failed:', err);
      return null;
    }
  }, [getDB]);

  /**
   * Get the most recently saved (incomplete) session — used on app load
   * to offer session recovery to the user.
   */
  const getLatestSession = useCallback(async (): Promise<PersistedSession | null> => {
    const db = await getDB();
    if (!db) return null;

    try {
      const all = await idbGetAll<PersistedSession>(db, SESSION_STORE);
      if (all.length === 0) return null;
      // Sort by savedAt descending
      all.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      return all[0];
    } catch (err) {
      console.warn('[OfflineStore] getLatestSession failed:', err);
      return null;
    }
  }, [getDB]);

  /**
   * Clear a session from IndexedDB after successful completion / logout.
   */
  const clearSession = useCallback(async (sessionId: string): Promise<void> => {
    const db = await getDB();
    if (!db) return;
    try {
      await idbDelete(db, SESSION_STORE, sessionId);
    } catch (err) {
      console.warn('[OfflineStore] clearSession failed:', err);
    }
  }, [getDB]);

  /**
   * Add an operation to the sync queue (for retrying when back online).
   * NOTE: Final form submissions are NEVER added here — they require explicit
   * user consent at submission time, so they must be online.
   */
  const enqueueSyncItem = useCallback(async (
    item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>
  ): Promise<void> => {
    const db = await getDB();
    if (!db) return;

    const full: SyncQueueItem = {
      ...item,
      id: `${item.sessionId}-${item.type}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    // Deduplicate: if same sessionId + type + same payload fieldId already exists, skip
    try {
      const existing = await idbGetAll<SyncQueueItem>(db, SYNC_STORE);
      const isDuplicate = existing.some(
        (e) =>
          e.sessionId === item.sessionId &&
          e.type === item.type &&
          JSON.stringify(e.payload) === JSON.stringify(item.payload)
      );
      if (isDuplicate) {
        console.log('[OfflineStore] Duplicate sync item skipped');
        return;
      }
      await idbPut(db, SYNC_STORE, full);
    } catch (err) {
      console.warn('[OfflineStore] enqueueSyncItem failed:', err);
    }
  }, [getDB]);

  /**
   * Get all pending sync items.
   */
  const getPendingSyncItems = useCallback(async (): Promise<SyncQueueItem[]> => {
    const db = await getDB();
    if (!db) return [];
    try {
      return await idbGetAll<SyncQueueItem>(db, SYNC_STORE);
    } catch {
      return [];
    }
  }, [getDB]);

  /**
   * Remove a sync item after successful retry.
   */
  const removeSyncItem = useCallback(async (id: string): Promise<void> => {
    const db = await getDB();
    if (!db) return;
    try {
      await idbDelete(db, SYNC_STORE, id);
    } catch (err) {
      console.warn('[OfflineStore] removeSyncItem failed:', err);
    }
  }, [getDB]);

  return {
    saveSession,
    restoreSession,
    getLatestSession,
    clearSession,
    enqueueSyncItem,
    getPendingSyncItems,
    removeSyncItem,
  };
}
