"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OperatorSetup({
  userId,
  email,
  tableExists,
}: {
  userId: string;
  email: string;
  tableExists: boolean;
}) {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setRegistering(true);
    setError(null);
    try {
      const res = await fetch("/api/operator/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="glass-card p-8 max-w-lg w-full space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, #e3002b, #d6005b)" }}>
            <span className="text-xl font-bold text-white">O</span>
          </div>
        </div>
        <h1 className="text-xl font-bold text-primary">CARTRUST 運営管理</h1>
        <p className="text-sm text-secondary mt-2">運営者向け管理ページです</p>
      </div>

      {!tableExists ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">DBマイグレーションが必要です</p>
            <p className="text-xs">
              <code>operator_users</code> テーブルがまだ作成されていません。
              Supabase SQL Editorで以下のマイグレーションを実行してください:
            </p>
            <pre className="mt-2 bg-amber-100 rounded-lg p-3 text-[11px] overflow-x-auto whitespace-pre-wrap">
              {`-- supabase/migrations/20260317_support_tickets.sql を実行してください`}
            </pre>
          </div>
          <Link href="/admin" className="btn-secondary w-full text-center block">
            テナント管理画面に戻る
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">運営者として登録</p>
            <p className="text-xs">
              現在のユーザー <span className="font-mono font-medium">{email}</span> を運営者として登録します。
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            className="btn-primary w-full"
            disabled={registering}
            onClick={handleRegister}
          >
            {registering ? "登録中..." : "運営者として登録する"}
          </button>
          <Link href="/admin" className="btn-ghost w-full text-center block">
            テナント管理画面に戻る
          </Link>
        </div>
      )}
    </div>
  );
}
