"use client";

import { useCallback, useRef, useState } from "react";

type VerifyResult = {
  sha256: string;
  onChainVerified: boolean;
  anchored: boolean;
  polygonTxHash: string | null;
  polygonNetwork: "polygon" | "amoy" | null;
  explorerUrl: string | null;
  authenticityGrade: string | null;
  c2paVerified: boolean | null;
  capturedAt: string | null;
  deviceModel: string | null;
  imageCreatedAt: string | null;
  certificatePublicId: string | null;
  certificateStatus: string | null;
  shopName: string | null;
};

type Stage = "idle" | "hashing" | "verifying" | "done" | "error";

const GRADE_LABEL: Record<string, { label: string; tone: string }> = {
  premium: { label: "PREMIUM", tone: "text-violet-300 bg-violet-500/10 border-violet-400/30" },
  verified: { label: "VERIFIED", tone: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30" },
  basic: { label: "BASIC", tone: "text-sky-300 bg-sky-500/10 border-sky-400/30" },
  unverified: { label: "UNVERIFIED", tone: "text-amber-300 bg-amber-500/10 border-amber-400/30" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function VerifyClient() {
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [sha256, setSha256] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setStage("idle");
    setFileName(null);
    setSha256(null);
    setResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runVerify = useCallback(async (file: File) => {
    setErrorMsg(null);
    setResult(null);
    setFileName(file.name);
    setStage("hashing");

    let hash: string;
    try {
      hash = await computeSha256(file);
    } catch (e) {
      setStage("error");
      setErrorMsg(
        e instanceof Error
          ? `ハッシュ計算に失敗しました: ${e.message}`
          : "ハッシュ計算に失敗しました。",
      );
      return;
    }
    setSha256(hash);
    setStage("verifying");

    try {
      const res = await fetch("/api/public/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sha256: hash }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStage("error");
        setErrorMsg(json?.message ?? "検証に失敗しました。");
        return;
      }
      setResult(json as VerifyResult);
      setStage("done");
    } catch (e) {
      setStage("error");
      setErrorMsg(e instanceof Error ? e.message : "ネットワークエラーが発生しました。");
    }
  }, []);

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStage("error");
      setErrorMsg("画像ファイルを選択してください。");
      return;
    }
    void runVerify(file);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`glass-card flex flex-col items-center justify-center gap-3 border-2 border-dashed p-10 text-center transition ${
          dragOver ? "border-accent/80 bg-accent/5" : "border-white/10"
        }`}
      >
        <div className="text-sm text-muted">
          証明書画像をここにドロップ、または
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90"
          disabled={stage === "hashing" || stage === "verifying"}
        >
          ファイルを選択
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="text-xs text-muted">
          JPEG / PNG / HEIC など画像ファイル。アップロードされるのはハッシュ値のみ。
        </div>
      </div>

      {/* Progress / file info */}
      {fileName ? (
        <div className="glass-card space-y-2 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate">
              <span className="text-muted">ファイル:</span>{" "}
              <span className="font-medium text-primary">{fileName}</span>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-muted hover:text-primary"
            >
              リセット
            </button>
          </div>
          {sha256 ? (
            <div className="font-mono text-xs break-all text-muted">
              <span className="text-primary">SHA-256:</span> {sha256}
            </div>
          ) : null}
          {stage === "hashing" ? (
            <div className="text-xs text-muted">ブラウザ内でハッシュを計算中…</div>
          ) : null}
          {stage === "verifying" ? (
            <div className="text-xs text-muted">オンチェーン検証中…</div>
          ) : null}
        </div>
      ) : null}

      {/* Error */}
      {stage === "error" && errorMsg ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {errorMsg}
        </div>
      ) : null}

      {/* Result */}
      {result && stage === "done" ? (
        <ResultCard result={result} />
      ) : null}
    </div>
  );
}

function ResultCard({ result }: { result: VerifyResult }) {
  const matched = result.certificatePublicId !== null;
  const verified = result.onChainVerified;

  const badge = matched && verified
    ? { label: "検証成功", tone: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30" }
    : matched && !verified
      ? { label: "DB一致・オンチェーン未記録", tone: "text-amber-300 bg-amber-500/10 border-amber-400/30" }
      : !matched && verified
        ? { label: "オンチェーン記録あり・DB未登録", tone: "text-sky-300 bg-sky-500/10 border-sky-400/30" }
        : { label: "一致する記録なし", tone: "text-red-300 bg-red-500/10 border-red-400/30" };

  const gradeInfo = result.authenticityGrade
    ? (GRADE_LABEL[result.authenticityGrade] ?? null)
    : null;

  return (
    <div className="glass-card space-y-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-muted">RESULT</div>
          <div className="mt-1 text-lg font-semibold text-primary">検証結果</div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge.tone}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Verification grid */}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <InfoRow
          label="オンチェーン検証"
          value={
            verified ? (
              <span className="text-emerald-300">✓ 記録済み</span>
            ) : (
              <span className="text-muted">未記録</span>
            )
          }
        />
        <InfoRow
          label="Polygon ネットワーク"
          value={
            result.polygonNetwork === "amoy"
              ? "Amoy (testnet)"
              : result.polygonNetwork === "polygon"
                ? "Polygon PoS"
                : "—"
          }
        />
        <InfoRow
          label="真正性ランク"
          value={
            gradeInfo ? (
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${gradeInfo.tone}`}>
                {gradeInfo.label}
              </span>
            ) : (
              "—"
            )
          }
        />
        <InfoRow
          label="C2PA 署名"
          value={
            result.c2paVerified === true
              ? "✓ 有効"
              : result.c2paVerified === false
                ? "未検証"
                : "—"
          }
        />
        <InfoRow label="発行店舗" value={result.shopName ?? "—"} />
        <InfoRow
          label="証明書 ID"
          value={
            result.certificatePublicId ? (
              <span className="font-mono">{result.certificatePublicId}</span>
            ) : (
              "—"
            )
          }
        />
        <InfoRow label="証明書ステータス" value={result.certificateStatus ?? "—"} />
        <InfoRow label="撮影日時" value={formatDate(result.capturedAt)} />
        <InfoRow label="撮影端末" value={result.deviceModel ?? "—"} />
        <InfoRow label="発行日時" value={formatDate(result.imageCreatedAt)} />
      </dl>

      {/* Explorer link */}
      {result.explorerUrl && result.polygonTxHash ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
          <div className="text-xs text-muted">ブロックチェーントランザクション</div>
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block font-mono text-xs text-emerald-300 hover:underline break-all"
          >
            {result.polygonTxHash} ↗
          </a>
          <div className="mt-1 text-xs text-muted">
            Polygonscan で独立検証できます。誰でも確認可能。
          </div>
        </div>
      ) : null}

      {/* Explainer when nothing matched */}
      {!matched && !verified ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-muted">
          この画像のハッシュは Ledra 上でも Polygon
          ブロックチェーン上でも見つかりませんでした。画像が Ledra
          経由で発行されていない、もしくは発行後に改変された可能性があります。
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-right text-sm text-primary">{value}</dd>
    </div>
  );
}
