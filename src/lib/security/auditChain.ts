/**
 * 監査ログのハッシュチェーン整合性。
 *
 * SOC 2 / ISO 27001 / ISMAP は監査ログの改ざん検知を要求する。
 * 各ログ行に以下を付与することで、過去ログの 1 行でも書き換えられた
 * 場合に後続のチェーン検証で必ず失敗するようにする:
 *
 *   record.hash = sha256( prev.hash || canonicalJson(record) )
 *
 * `audit_log_chain` テーブル (or 既存 admin_audit_logs に列追加) を
 * 想定する。本ヘルパは hash 計算 / 検証ロジックのみを提供し、
 * 永続化はリポジトリ層に任せる。
 *
 * 使用例:
 *   const prevHash = await getLastAuditHash();
 *   const entry = { actor_id, action, target, payload, ts: new Date().toISOString() };
 *   const hash = computeAuditHash(prevHash, entry);
 *   await db.insert("admin_audit_logs", { ...entry, prev_hash: prevHash, hash });
 */

import { createHash } from "node:crypto";

export type AuditRecord = Record<string, unknown>;

/**
 * 安定 JSON 直列化 (キーをソート、undefined を除外)。
 * これがないと同一データに対するハッシュが環境依存でブレる。
 */
export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "null";
    return String(value);
  }
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** prev_hash || canonicalJson(record) の SHA-256 を hex で返す。 */
export function computeAuditHash(prevHash: string | null | undefined, record: AuditRecord): string {
  const prev = prevHash ?? "GENESIS";
  const payload = `${prev}\n${canonicalJson(record)}`;
  return createHash("sha256").update(payload).digest("hex");
}

export type AuditChainEntry = {
  prev_hash: string | null;
  hash: string;
  record: AuditRecord;
};

/**
 * チェーン全体を検証する。先頭から順に hash 再計算 → 一致確認。
 * 一致しないインデックスを返す (整合性違反位置)。すべて OK なら null。
 */
export function verifyAuditChain(entries: AuditChainEntry[]): { ok: true } | { ok: false; brokenAt: number } {
  let prev: string | null = null;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const expected = computeAuditHash(prev, e.record);
    if (e.hash !== expected) return { ok: false, brokenAt: i };
    if ((e.prev_hash ?? null) !== prev) return { ok: false, brokenAt: i };
    prev = e.hash;
  }
  return { ok: true };
}
