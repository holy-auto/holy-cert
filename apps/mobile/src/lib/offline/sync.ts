import { mobileApi } from "@/lib/api";
import {
  listPendingMutations,
  markMutationDone,
  markMutationFailed,
  type QueuedMutation,
} from "./queue";

/**
 * キュー内の pending mutation を順次 mobileApi で送信する。
 * 1件失敗しても次のを試行する。失敗は markMutationFailed で
 * バックオフ + 最大試行回数で永続失敗扱いになる。
 *
 * 呼び出しタイミング:
 *  - アプリ起動時 (root layout の effect)
 *  - ネットワーク復帰時 (NetInfo を導入したらそのリスナで)
 *  - 任意のユーザートリガ (Settings > 「同期を試行」など)
 */
export interface SyncResult {
  attempted: number;
  succeeded: number;
  failed: number;
  failures: { id: string; path: string; error: string }[];
}

export async function processMutationQueue(): Promise<SyncResult> {
  const pending = await listPendingMutations();
  const result: SyncResult = {
    attempted: pending.length,
    succeeded: 0,
    failed: 0,
    failures: [],
  };

  for (const m of pending) {
    try {
      await sendMutation(m);
      await markMutationDone(m.id);
      result.succeeded += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markMutationFailed(m.id, msg);
      result.failed += 1;
      result.failures.push({ id: m.id, path: m.path, error: msg });
    }
  }

  return result;
}

async function sendMutation(m: QueuedMutation): Promise<unknown> {
  return mobileApi(m.path, {
    method: m.method,
    body: m.body ?? undefined,
  });
}
