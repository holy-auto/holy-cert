import * as SQLite from "expo-sqlite";

/**
 * オフライン用 SQLite データベースのオープン + スキーマ初期化。
 *
 * テーブル:
 *  - mutation_queue: API呼び出しの再送キュー
 *      id          TEXT PRIMARY KEY
 *      created_at  INTEGER (epoch ms)
 *      method      TEXT
 *      path        TEXT
 *      body        TEXT (JSON)
 *      status      TEXT 'pending' | 'in_flight' | 'failed'
 *      attempts    INTEGER
 *      last_error  TEXT NULLABLE
 *      next_try_at INTEGER NULLABLE (backoff用)
 *
 * Phase 2 で reservations / customers / payments など read-through
 * キャッシュ用テーブルを追加していく想定。
 */

const DB_NAME = "ledra_offline.db";

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await ensureSchema(_db);
  return _db;
}

async function ensureSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS mutation_queue (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      body TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_try_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_mq_status_nexttry
      ON mutation_queue(status, next_try_at);
  `);
}

/** テスト用: DB ハンドルをリセット (各テスト間で in-memory を再構築する想定) */
export function __resetDbForTest() {
  _db = null;
}
