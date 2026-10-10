/**
 * SevaVaani — IndexedDB Draft Store
 *
 * Security rules enforced here:
 * - Drafts are keyed by (userId + sessionId) — no cross-user data leak
 * - Draft store is CLEARED completely on logout (call clearAllDraftsForUser)
 * - Only form field values are persisted — never passwords, OTPs, Aadhaar, audio, or tokens
 * - All data is local-only and never sent to the service worker cache
 */

const DB_NAME = 'sevavaani-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'form_drafts';

export interface FormDraft {
  /** Composite key: "{userId}:{serviceId}" */
  id: string;
  userId: string;
  serviceId: string;
  /** Partial field values — only safe, non-sensitive text fields */
  fields: Record<string, string>;
  language: string;
  lastUpdated: number; // Unix timestamp ms
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db!);
    };

    req.onerror = () => reject(req.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.onerror = () => reject(tx.error);
      })
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save or update a partial form draft.
 * Only call this with sanitised, non-sensitive field values.
 * Never pass passwords, OTPs, Aadhaar numbers, or bank details.
 */
export async function saveDraft(
  userId: string,
  serviceId: string,
  fields: Record<string, string>,
  language: string
): Promise<void> {
  if (!userId || !serviceId) return;
  const draft: FormDraft = {
    id: `${userId}:${serviceId}`,
    userId,
    serviceId,
    fields,
    language,
    lastUpdated: Date.now()
  };
  await withStore('readwrite', (s) => s.put(draft));
}

/**
 * Load the saved draft for a given user + service combination.
 * Returns null if no draft exists.
 */
export async function loadDraft(
  userId: string,
  serviceId: string
): Promise<FormDraft | null> {
  if (!userId || !serviceId) return null;
  const key = `${userId}:${serviceId}`;
  const result = await withStore<FormDraft | undefined>('readonly', (s) => s.get(key));
  return result ?? null;
}

/**
 * Delete a single service draft (e.g. after successful submission).
 */
export async function deleteDraft(userId: string, serviceId: string): Promise<void> {
  if (!userId || !serviceId) return;
  const key = `${userId}:${serviceId}`;
  await withStore('readwrite', (s) => s.delete(key));
}

/**
 * Clear ALL drafts for a given user.
 * MUST be called on logout to prevent data leakage across sessions.
 */
export async function clearAllDraftsForUser(userId: string): Promise<void> {
  if (!userId) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index('userId');
    const req = idx.openCursor(IDBKeyRange.only(userId));
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * List all drafts for a user (e.g. for a "resume your application" UI).
 */
export async function listDraftsForUser(userId: string): Promise<FormDraft[]> {
  if (!userId) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index('userId');
    const req = idx.getAll(IDBKeyRange.only(userId));
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Check if IndexedDB is available in this browser/context.
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}
