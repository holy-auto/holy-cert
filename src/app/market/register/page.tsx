"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MarketRegisterPage() {
  const [step, setStep] = useState<"invite" | "account">("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleInviteCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setStep("account");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Supabase Auth アカウント作成
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // メール確認が不要な場合はそのままログインして登録APIを叩く
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("アカウント作成後のログインに失敗しました。メール認証が必要な場合があります。");
      setLoading(false);
      return;
    }

    // ディーラー登録 API
    const res = await fetch("/api/market/dealers/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: inviteCode }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "登録に失敗しました");
      setLoading(false);
      return;
    }

    router.push("/market/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HolyMarket</h1>
          <p className="text-gray-500 mt-1 text-sm">業者登録</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {step === "invite" ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">招待コードを入力</h2>
              <p className="text-sm text-gray-500 mb-6">
                参加には管理者から発行された招待コードが必要です。
              </p>
              <form onSubmit={handleInviteCheck} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    招待コード
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder="XXXXXXXX"
                    maxLength={8}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  次へ
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">アカウント設定</h2>
              <p className="text-sm text-gray-500 mb-6">
                招待コード <span className="font-mono font-bold text-gray-800">{inviteCode}</span> でログイン情報を設定します。
              </p>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    パスワード（8文字以上）
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "登録中..." : "登録する"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("invite")}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  戻る
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              すでにアカウントをお持ちの方は
              <Link href="/market/login" className="text-blue-600 hover:underline ml-1">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
