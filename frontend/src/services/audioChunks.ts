/**
 * SevaVaani — Chunked Audio Upload Service
 *
 * Provides reliable audio upload over 2G / low-bandwidth connections by splitting
 * the audio Blob into small sequential HTTP requests (default 32 KB chunks).
 *
 * Usage:
 *   const result = await uploadAudioChunked(audioBlob, sessionId, 'hi', 'applicant_name');
 *
 * Privacy guarantee:
 * - Audio bytes go directly to the backend and are never stored in the browser cache.
 * - Service worker cache rules explicitly exclude /api/* routes.
 */

export interface ChunkedUploadResult {
  transcript: string;
  confidence?: number;
  language?: string;
  language_detected?: string;
  provider?: string;
  assembled_bytes?: number;
  error?: string;
}

interface ChunkUploadMeta {
  chunks_received: number;
  assembled: boolean;
}

const CHUNK_SIZE = 32 * 1024; // 32 KB per chunk — safe for 2G (≈1s at 256 kbps)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function uploadSingleChunk(
  sessionId: string,
  chunkIndex: number,
  totalChunks: number,
  language: string,
  chunkBlob: Blob,
  signal?: AbortSignal
): Promise<ChunkUploadMeta> {
  const form = new FormData();
  form.append('session_id', sessionId);
  form.append('chunk_index', String(chunkIndex));
  form.append('total_chunks', String(totalChunks));
  form.append('language', language);
  form.append('audio_chunk', chunkBlob, `chunk_${chunkIndex}.webm`);

  let lastErr: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch('/api/audio/chunk', {
        method: 'POST',
        body: form,
        signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }

      return (await res.json()) as ChunkUploadMeta;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      lastErr = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1)); // exponential-ish backoff
      }
    }
  }

  throw lastErr ?? new Error(`Failed to upload chunk ${chunkIndex}`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload audio in chunks and return the assembled transcript.
 *
 * @param audioBlob   — The full audio Blob from MediaRecorder
 * @param sessionId   — Current form session UUID
 * @param language    — 'hi' | 'mr' | 'en'
 * @param fieldHint   — Optional form field name for vocabulary biasing
 * @param onProgress  — Optional progress callback (0.0 → 1.0)
 * @param signal      — Optional AbortSignal for cancellation
 */
export async function uploadAudioChunked(
  audioBlob: Blob,
  sessionId: string,
  language: string = 'hi',
  fieldHint?: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<ChunkedUploadResult> {
  // Split blob into equal-sized chunks
  const chunks: Blob[] = [];
  let offset = 0;
  while (offset < audioBlob.size) {
    chunks.push(audioBlob.slice(offset, offset + CHUNK_SIZE));
    offset += CHUNK_SIZE;
  }

  if (chunks.length === 0) {
    return { transcript: '', error: 'Empty audio blob' };
  }

  // Upload all chunks sequentially (preserves order, friendlier to 2G)
  for (let i = 0; i < chunks.length; i++) {
    if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError');

    await uploadSingleChunk(
      sessionId,
      i,
      chunks.length,
      language,
      chunks[i],
      signal
    );

    onProgress?.((i + 1) / chunks.length * 0.9); // 90% = upload done
  }

  // All chunks uploaded — request assembly + transcription
  const assembleRes = await fetch('/api/audio/assemble', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      total_chunks: chunks.length,
      language,
      field_hint: fieldHint ?? null,
    }),
    signal,
  });

  onProgress?.(1.0);

  if (!assembleRes.ok) {
    const body = await assembleRes.json().catch(() => ({}));
    return {
      transcript: '',
      error: body?.detail ?? `Assembly failed: HTTP ${assembleRes.status}`,
    };
  }

  return (await assembleRes.json()) as ChunkedUploadResult;
}

/**
 * Cancel an in-progress upload and clear the server-side buffer.
 */
export async function cancelAudioUpload(sessionId: string): Promise<void> {
  try {
    await fetch(`/api/audio/session/${sessionId}`, { method: 'DELETE' });
  } catch {
    // Best-effort cancel — TTL on server will clean up anyway
  }
}

/**
 * Estimate number of chunks for a given blob size (useful for UI).
 */
export function estimateChunkCount(blobSize: number): number {
  return Math.ceil(blobSize / CHUNK_SIZE);
}
