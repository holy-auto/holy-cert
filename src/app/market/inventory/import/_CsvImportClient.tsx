"use client";

import { useState } from "react";
import Link from "next/link";

const SAMPLE_CSV = `make,model,grade,year,mileage,color,body_type,fuel_type,transmission,price_man,has_inspection,inspection_expiry,has_repair,repair_notes,description,notes
トヨタ,プリウス,Z,2022,25000,ホワイトパール,ハッチバック,ハイブリッド,CVT,198,1,2025-08-31,0,,ワンオーナー・禁煙車,仕入れ価格 175万
日産,ノート,e-POWER X,2021,40000,ブリリアントシルバー,ハッチバック,ハイブリッド,CVT,155,1,2024-12-31,0,,,
`;

interface ImportResult {
  succeeded: number;
  failed: { row: number; error: string }[];
  total: number;
}

export default function CsvImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/market/listings/import", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "インポートに失敗しました");
    } else {
      setResult(data);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "在庫インポート_サンプル.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* カラム説明 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">CSVフォーマット</h2>
          <button
            onClick={downloadSample}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            サンプルをダウンロード
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 pr-3 font-medium text-gray-500">カラム名</th>
                <th className="text-left py-1.5 pr-3 font-medium text-gray-500">必須</th>
                <th className="text-left py-1.5 font-medium text-gray-500">説明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ["make", "○", "メーカー名（例: トヨタ）"],
                ["model", "○", "モデル名（例: プリウス）"],
                ["grade", "", "グレード"],
                ["year", "", "年式（例: 2022）"],
                ["mileage", "", "走行距離（km）"],
                ["color", "", "色"],
                ["body_type", "", "ボディタイプ（例: SUV）"],
                ["fuel_type", "", "燃料（例: ハイブリッド）"],
                ["transmission", "", "ミッション（例: CVT）"],
                ["price_man", "", "価格（万円単位）"],
                ["has_inspection", "", "車検あり: 1 / なし: 0"],
                ["inspection_expiry", "", "車検有効期限（YYYY-MM-DD）"],
                ["has_repair", "", "修復歴あり: 1 / なし: 0"],
                ["repair_notes", "", "修復歴の詳細"],
                ["description", "", "説明（他業者に公開）"],
                ["notes", "", "内部メモ（自社のみ）"],
              ].map(([col, req, desc]) => (
                <tr key={col}>
                  <td className="py-1.5 pr-3 font-mono text-blue-700">{col}</td>
                  <td className="py-1.5 pr-3 text-red-500">{req}</td>
                  <td className="py-1.5 text-gray-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* アップロード */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">ファイルをアップロード</h2>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(null); }}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4"
        />
        {file && (
          <p className="text-xs text-gray-400 mb-4">{file.name}（{(file.size / 1024).toFixed(1)} KB）</p>
        )}
        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "インポート中..." : "インポート実行"}
        </button>
      </section>

      {/* 結果 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}
      {result && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">インポート結果</h2>
          <div className="flex gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{result.succeeded}</p>
              <p className="text-xs text-gray-500">成功</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{result.failed.length}</p>
              <p className="text-xs text-gray-500">失敗</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">{result.total}</p>
              <p className="text-xs text-gray-500">合計</p>
            </div>
          </div>
          {result.failed.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 text-xs space-y-1">
              {result.failed.map((f) => (
                <p key={f.row} className="text-red-700">行 {f.row}: {f.error}</p>
              ))}
            </div>
          )}
          {result.succeeded > 0 && (
            <Link href="/market/inventory" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
              在庫一覧を確認 →
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
