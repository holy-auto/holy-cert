"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MarketResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.replace("/market/login?error=session_required");
        return;
      }
      setReady(true);
    })();
  }, [router, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!password || password.length < 8) {
      setErr("パスワードは8文字以上にしてください。");
      return;
    }
    if (password !== confirm) {
      setErr("確認用パスワードが一致しません。");
      return;
    }

    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg("パスワードを更新しました。ログイン画面へ移動します。");
      setTimeout(() => {
        router.replace("/market/login?reset=done");
      }, 800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-sm text-gray-500">
          セッションを確認しています...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HolyMarket</h1>
          <p className="text-gray-500 mt-1 text-sm">BtoB 中古車在庫共有プラットフォーム</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">新しいパスワードを設定</h2>
            <p className="text-sm text-gray-500 mt-1">8文字以上で設定してください。</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                確認用パスワード
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {msg && (
              <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">{msg}</p>
            )}
            {err && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "更新中..." : "パスワードを更新"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
