"use client";

import { useState } from "react";
import type { ListingImage } from "@/types/market";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export default function PublicImageSlider({ images, alt }: { images: ListingImage[]; alt: string }) {
  const [current, setCurrent] = useState(0);
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  if (sorted.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center text-gray-300">
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  const imgUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/assets/${path}`;
  const prev = () => setCurrent((c) => (c - 1 + sorted.length) % sorted.length);
  const next = () => setCurrent((c) => (c + 1) % sorted.length);

  return (
    <div className="space-y-2">
      <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgUrl(sorted[current].storage_path)} alt={alt} className="w-full h-full object-cover" />
        {sorted.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-lg">‹</button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-lg">›</button>
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded-full">{current + 1} / {sorted.length}</div>
          </>
        )}
      </div>
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((img, i) => (
            <button key={img.id} onClick={() => setCurrent(i)} className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${i === current ? "border-blue-500" : "border-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl(img.storage_path)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
