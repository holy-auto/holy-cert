"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ListingImage, ListingWithDealer } from "@/types/market";

const BODY_TYPES = ["セダン","SUV","ミニバン","ハッチバック","ワゴン","クーペ","軽自動車","トラック","バン","その他"];
const FUEL_TYPES = ["ガソリン","ディーゼル","ハイブリッド","電気","その他"];
const TRANSMISSIONS = ["AT","MT","CVT","その他"];
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

interface Props {
  listing?: ListingWithDealer;
}

export default function ListingFormClient({ listing }: Props) {
  const router = useRouter();
  const isEdit = !!listing;

  const [form, setForm] = useState({
    make: listing?.make ?? "",
    model: listing?.model ?? "",
    grade: listing?.grade ?? "",
    year: listing?.year?.toString() ?? "",
    mileage: listing?.mileage?.toString() ?? "",
    color: listing?.color ?? "",
    body_type: listing?.body_type ?? "",
    fuel_type: listing?.fuel_type ?? "",
    transmission: listing?.transmission ?? "",
    price: listing?.price != null ? String(listing.price / 10000) : "",
    has_vehicle_inspection: listing?.has_vehicle_inspection ?? false,
    inspection_expiry: listing?.inspection_expiry ?? "",
    has_repair_history: listing?.has_repair_history ?? false,
    repair_history_notes: listing?.repair_history_notes ?? "",
    description: listing?.description ?? "",
    notes: listing?.notes ?? "",
    status: listing?.status ?? "active",
  });

  // 既存画像の管理（並び替え・削除）
  const [existingImages, setExistingImages] = useState<ListingImage[]>(
    [...(listing?.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  // 新規追加ファイル
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function moveImage(index: number, direction: -1 | 1) {
    const newImages = [...existingImages];
    const target = index + direction;
    if (target < 0 || target >= newImages.length) return;
    [newImages[index], newImages[target]] = [newImages[target], newImages[index]];
    setExistingImages(newImages);
  }

  function markDelete(imageId: string) {
    setDeletedImageIds((prev) => [...prev, imageId]);
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  function removeNewFile(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      make: form.make.trim(),
      model: form.model.trim(),
      grade: form.grade.trim() || undefined,
      year: form.year ? Number(form.year) : undefined,
      mileage: form.mileage ? Number(form.mileage) : undefined,
      color: form.color.trim() || undefined,
      body_type: form.body_type || undefined,
      fuel_type: form.fuel_type || undefined,
      transmission: form.transmission || undefined,
      price: form.price ? Math.round(Number(form.price) * 10000) : undefined,
      has_vehicle_inspection: form.has_vehicle_inspection,
      inspection_expiry: form.has_vehicle_inspection && form.inspection_expiry ? form.inspection_expiry : undefined,
      has_repair_history: form.has_repair_history,
      repair_history_notes: form.has_repair_history && form.repair_history_notes.trim() ? form.repair_history_notes.trim() : undefined,
      description: form.description.trim() || undefined,
      notes: form.notes.trim() || undefined,
      ...(isEdit ? { status: form.status } : {}),
    };

    let listingId: string;

    if (isEdit) {
      const res = await fetch(`/api/market/listings/${listing!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "保存に失敗しました"); setLoading(false); return; }
      listingId = listing!.id;
    } else {
      const res = await fetch("/api/market/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "保存に失敗しました"); setLoading(false); return; }
      listingId = data.listing.id;
    }

    // 既存画像の削除
    for (const id of deletedImageIds) {
      await fetch(`/api/market/listings/${listingId}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: id }),
      });
    }

    // 既存画像の並び順更新
    if (isEdit && existingImages.length > 0) {
      await fetch(`/api/market/listings/${listingId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: existingImages.map((img, i) => ({ id: img.id, sort_order: i })),
        }),
      });
    }

    // 新規画像アップロード
    for (let i = 0; i < imageFiles.length; i++) {
      const formData = new FormData();
      formData.append("file", imageFiles[i]);
      formData.append("sort_order", String(existingImages.length + i));
      await fetch(`/api/market/listings/${listingId}/images`, {
        method: "POST",
        body: formData,
      });
    }

    router.push("/market/inventory");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本情報 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">基本情報</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="メーカー *" required>
            <input type="text" value={form.make} onChange={(e) => set("make", e.target.value)} required placeholder="トヨタ" className="input" />
          </Field>
          <Field label="モデル *" required>
            <input type="text" value={form.model} onChange={(e) => set("model", e.target.value)} required placeholder="プリウス" className="input" />
          </Field>
          <Field label="グレード">
            <input type="text" value={form.grade} onChange={(e) => set("grade", e.target.value)} placeholder="Z" className="input" />
          </Field>
          <Field label="年式">
            <input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2020" min={1900} max={2100} className="input" />
          </Field>
          <Field label="走行距離（km）">
            <input type="number" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} placeholder="50000" min={0} className="input" />
          </Field>
          <Field label="色">
            <input type="text" value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="ホワイトパールクリスタルシャイン" className="input" />
          </Field>
          <Field label="ボディタイプ">
            <select value={form.body_type} onChange={(e) => set("body_type", e.target.value)} className="input">
              <option value="">選択してください</option>
              {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="燃料">
            <select value={form.fuel_type} onChange={(e) => set("fuel_type", e.target.value)} className="input">
              <option value="">選択してください</option>
              {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="ミッション">
            <select value={form.transmission} onChange={(e) => set("transmission", e.target.value)} className="input">
              <option value="">選択してください</option>
              {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="価格（万円）">
            <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="198" min={0} className="input" />
          </Field>
        </div>
      </section>

      {/* 車検・修復歴 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">車検・修復歴</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.has_vehicle_inspection} onChange={(e) => set("has_vehicle_inspection", e.target.checked)} className="rounded border-gray-300 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">車検あり</span>
          </label>
          {form.has_vehicle_inspection && (
            <Field label="車検有効期限">
              <input type="date" value={form.inspection_expiry} onChange={(e) => set("inspection_expiry", e.target.value)} className="input" />
            </Field>
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.has_repair_history} onChange={(e) => set("has_repair_history", e.target.checked)} className="rounded border-gray-300 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">修復歴あり</span>
          </label>
          {form.has_repair_history && (
            <Field label="修復歴の詳細">
              <textarea value={form.repair_history_notes} onChange={(e) => set("repair_history_notes", e.target.value)} rows={2} placeholder="どの部位をどの程度修復したか" className="input resize-none" />
            </Field>
          )}
        </div>
      </section>

      {/* 説明・メモ */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">説明・メモ</h2>
        <div className="space-y-4">
          <Field label="説明（他業者に公開）">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} placeholder="車両の状態、オプション装備、特記事項など" className="input resize-none" />
          </Field>
          <Field label="内部メモ（自社のみ）">
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="仕入れ価格、注意事項など（他業者には非表示）" className="input resize-none" />
          </Field>
        </div>
      </section>

      {/* 写真 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">写真</h2>

        {/* 既存画像（並び替え・削除） */}
        {existingImages.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">登録済み写真（左右ボタンで並び替え、×で削除）</p>
            <div className="flex flex-wrap gap-3">
              {existingImages.map((img, i) => (
                <div key={img.id} className="relative group">
                  <div className="w-28 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${SUPABASE_URL}/storage/v1/object/public/assets/${img.storage_path}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* 削除ボタン */}
                  <button
                    type="button"
                    onClick={() => markDelete(img.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                  {/* 並び替えボタン */}
                  <div className="absolute bottom-0 inset-x-0 flex justify-between px-1 pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => moveImage(i, -1)}
                      disabled={i === 0}
                      className="w-6 h-5 bg-black/50 text-white rounded text-xs disabled:opacity-30 hover:bg-black/70"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(i, 1)}
                      disabled={i === existingImages.length - 1}
                      className="w-6 h-5 bg-black/50 text-white rounded text-xs disabled:opacity-30 hover:bg-black/70"
                    >
                      →
                    </button>
                  </div>
                  {i === 0 && (
                    <span className="absolute top-1 left-1 text-[10px] bg-blue-600 text-white px-1 rounded">表紙</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 新規追加 */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">写真を追加</p>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {imageFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {imageFiles.map((file, i) => (
                <div key={i} className="relative">
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ステータス（編集時のみ） */}
      {isEdit && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">掲載ステータス</h2>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input max-w-xs">
            <option value="active">掲載中</option>
            <option value="reserved">商談中</option>
            <option value="sold">売却済</option>
            <option value="hidden">非公開</option>
          </select>
        </section>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? "保存中..." : isEdit ? "保存する" : "掲載する"}
        </button>
        <button type="button" onClick={() => window.history.back()} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          キャンセル
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          ring: 2px solid #3b82f6;
          border-color: #3b82f6;
        }
      `}</style>
    </form>
  );
}

function Field({ label, required, children }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
