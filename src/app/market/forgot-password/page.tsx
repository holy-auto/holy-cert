"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function MarketForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;

    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/market/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(v, { redirectTo });
      if (error) throw error;
      setMsg("再設定メールを送信しました。メール内リンクから新しいパスワードを設定してください。");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
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
            <h2 className="text-xl font-semibold text-gray-900">パスワード再設定</h2>
            <p className="text-sm text-gray-500 mt-1">
              登録済みのメールアドレスに再設定リンクを送信します。
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="dealer@example.com"
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
              disabled={loading || !email.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "送信中..." : "再設定メールを送信"}
            </button>
          </form>

          <div className="pt-4 border-t border-gray-100 text-center">
            <Link href="/market/login" className="text-sm text-blue-600 hover:underline">
              ログインへ戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
