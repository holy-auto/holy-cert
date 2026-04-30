import { getDb } from "./db";

export interface QueuedMutation {
  id: string;
  created_at: number;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body: unknown;
  status: "pending" | "in_flight" | "failed";
  attempts: number;
  last_error: string | null;
  next_try_at: number | null;
}

interface RawRow {
  id: string;
  created_at: number;
  method: string;
  path: string;
  body: string | null;
  status: string;
  attempts: number;
  last_error: string | null;
  next_try_at: number | null;
}

function parseRow(row: RawRow): QueuedMutation {
  return {
    id: row.id,
    created_at: row.created_at,
    method: row.method as QueuedMutation["method"],
    path: row.path,
    body: row.body ? safeJsonParse(row.body) : null,
    status: row.status as QueuedMutation["status"],
    attempts: row.attempts,
    last_error: row.last_error,
    next_try_at: row.next_try_at,
  };
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function generateId(): string {
  // expo-sqlite には UUID 生成が無いので簡易版。衝突確率は極小だが、
  // 厳密にユニークにしたい場合は呼び出し元で UUID を生成して渡す。
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Mutation を enqueue。同じ path+method+body の duplicate はチェックしない (呼び出し側責任)。 */
export async function enqueueMutation(input: {
  method: QueuedMutation["method"];
  path: string;
  body?: unknown;
}): Promise<QueuedMutation> {
  const db = await getDb();
  const id = generateId();
  const now = Date.now();
  const bodyJson = input.body == null ? null : JSON.stringify(input.body);

  await db.runAsync(
    `INSERT INTO mutation_queue (id, created_at, method, path, body, status, attempts)
     VALUES (?, ?, ?, ?, ?, 'pending', 0)`,
    id,
    now,
    input.method,
    input.path,
    bodyJson
  );

  return {
    id,
    created_at: now,
    method: input.method,
    path: input.path,
    body: input.body ?? null,
    status: "pending",
    attempts: 0,
    last_error: null,
    next_try_at: null,
  };
}

/** 再送候補を取得 (FIFO、next_try_at が現在以前のもの) */
export async function listPendingMutations(
  now: number = Date.now()
): Promise<QueuedMutation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>(
    `SELECT id, created_at, method, path, body, status, attempts, last_error, next_try_at
     FROM mutation_queue
     WHERE status = 'pending'
       AND (next_try_at IS NULL OR next_try_at <= ?)
     ORDER BY created_at ASC`,
    now
  );
  return rows.map(parseRow);
}

/** 送信成功 → キューから物理削除 */
export async function markMutationDone(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM mutation_queue WHERE id = ?`, id);
}

/**
 * 送信失敗 → attempts++、エラーメッセージと次回試行時刻を記録。
 * MAX_ATTEMPTS を超えたら status = 'failed' で永続失敗扱い。
 */
export async function markMutationFailed(
  id: string,
  error: string,
  opts: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<void> {
  const maxAttempts = opts.maxAttempts ?? 5;
  const baseDelay = opts.baseDelayMs ?? 5_000;

  const db = await getDb();
  // 現在の attempts を取得
  const row = await db.getFirstAsync<{ attempts: number }>(
    `SELECT attempts FROM mutation_queue WHERE id = ?`,
    id
  );
  const attempts = (row?.attempts ?? 0) + 1;

  if (attempts >= maxAttempts) {
    await db.runAsync(
      `UPDATE mutation_queue SET status = 'failed', attempts = ?, last_error = ? WHERE id = ?`,
      attempts,
      error,
      id
    );
    return;
  }

  // 指数バックオフ: baseDelay * 2^(attempts-1)
  const delay = baseDelay * Math.pow(2, attempts - 1);
  const nextTryAt = Date.now() + delay;

  await db.runAsync(
    `UPDATE mutation_queue
     SET status = 'pending', attempts = ?, last_error = ?, next_try_at = ?
     WHERE id = ?`,
    attempts,
    error,
    nextTryAt,
    id
  );
}

/** UI から見せる用: 全件 (失敗含む) を新しい順で取得 */
export async function listAllMutations(): Promise<QueuedMutation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>(
    `SELECT id, created_at, method, path, body, status, attempts, last_error, next_try_at
     FROM mutation_queue
     ORDER BY created_at DESC`
  );
  return rows.map(parseRow);
}

/** 失敗状態のものを再開 (UI から手動リトライ用) */
export async function reopenFailedMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE mutation_queue
     SET status = 'pending', attempts = 0, last_error = NULL, next_try_at = NULL
     WHERE id = ?`,
    id
  );
}

/** クリア (テスト/開発用) */
export async function clearMutationQueue(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM mutation_queue`);
}
