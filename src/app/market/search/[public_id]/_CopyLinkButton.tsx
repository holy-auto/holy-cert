"use client";

import { useState } from "react";

export default function CopyLinkButton({ publicId }: { publicId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/market/p/${publicId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="block w-full py-2 text-center border border-blue-200 bg-blue-50 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors"
    >
      {copied ? "コピーしました！" : "公開リンクをコピー"}
    </button>
  );
}
