"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onLogin = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      window.location.href = "/admin/certificates";
    } catch {
      setErr("メールアドレスまたはパスワードが正しくありません。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>Ledra ログイン</h1>

        {err && <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 16 }}>{err}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && onLogin()}
            placeholder="Email"
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 16 }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && onLogin()}
            placeholder="Password"
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 16 }}
          />
          <button
            onClick={onLogin}
            disabled={busy}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#0071e3",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {busy ? "ログイン中..." : "ログイン"}
          </button>
        </div>

        <div style={{ marginTop: 24 }}>
          <a href="/forgot-password" style={{ fontSize: 12, color: "#0071e3" }}>
            パスワードをお忘れですか？
          </a>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>
            アカウントをお持ちでないですか？{" "}
            <a href="/signup" style={{ color: "#0071e3" }}>
              新規登録
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
