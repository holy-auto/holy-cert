"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ManufacturerLoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onLogin = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/manufacturer";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ログインに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-base p-6">
      <div className="glass-card w-full max-w-md space-y-6 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-lg">
            M
          </div>
          <span className="text-xl font-bold text-primary tracking-wide">Ledra</span>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-primary">メーカー ポータル ログイン</h1>
          <p className="text-sm text-muted mt-1">運営から送られた招待メールのリンクからアクセスしてください。</p>
        </div>

        <div className="grid gap-4">
          <label>
            <div className="text-sm text-secondary mb-1">メールアドレス</div>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full"
              placeholder="example@manufacturer.co.jp"
            />
          </label>

          <label>
            <div className="text-sm text-secondary mb-1">パスワード</div>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field w-full"
              onKeyDown={(e) => e.key === "Enter" && !busy && onLogin()}
            />
          </label>

          {err && <div className="text-sm text-red-500">{err}</div>}

          <button onClick={onLogin} disabled={busy} className="btn-primary w-full">
            {busy ? "..." : "ログイン"}
          </button>
        </div>

        <p className="text-center text-xs text-muted">アクセス権限のお問い合わせは Ledra 運営までご連絡ください。</p>
      </div>
    </main>
  );
}
