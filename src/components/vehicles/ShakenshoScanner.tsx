"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

/** QRが読めない場合にOCRフォールバックを提示するまでの秒数 */
const OCR_HINT_AFTER_MS = 8000;

interface Props {
  open: boolean;
  /** QRスキャン成功時に、デコード済みの生テキストを親へ渡す。 */
  onResult: (rawText: string) => void;
  /**
   * QR検出が一定時間できなかった場合に「写真で読み取る」ボタンから呼ばれる。
   * 現在の映像フレームを JPEG Blob として渡すので、親は
   * `/api/vehicles/parse-shakken` に POST して構造化データに変換する。
   */
  onImageCapture?: (blob: Blob) => void;
  onClose: () => void;
}

/**
 * 車検証 二次元コード 用カメラスキャナ モーダル。
 *
 * 1. `@zxing/browser` でライブ映像から QR を継続検出し、成功時に `onResult` を呼ぶ。
 * 2. OCR_HINT_AFTER_MS 秒間 QR が読めない場合は「写真で読み取る」ボタンを表示し、
 *    タップ時に現フレームを JPEG Blob にして `onImageCapture` を呼ぶ。
 *    これにより、紙車検証や QR が小さい場合も Claude Vision OCR にフォールバックできる。
 */
export default function ShakenshoScanner({ open, onResult, onImageCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const calledRef = useRef(false);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOcrHint, setShowOcrHint] = useState(false);

  useEffect(() => {
    if (!open) return;

    calledRef.current = false;
    setReady(false);
    setError(null);
    setShowOcrHint(false);

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    const videoEl = videoRef.current;
    if (!videoEl) return;

    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoEl, (result) => {
        if (cancelled || calledRef.current) return;
        if (result) {
          calledRef.current = true;
          controlsRef.current?.stop();
          onResult(result.getText());
        }
      })
      .then((c) => {
        if (cancelled) { c.stop(); return; }
        controlsRef.current = c;
        setReady(true);
      })
      .catch((e: Error & { name?: string }) => {
        if (cancelled) return;
        if (e.name === "NotAllowedError") {
          setError("カメラの使用が許可されていません。ブラウザの設定から許可してください。");
        } else if (e.name === "NotFoundError" || e.name === "OverconstrainedError") {
          setError("利用可能なカメラが見つかりませんでした。");
        } else if (e.name === "NotReadableError") {
          setError("カメラが他のアプリで使用されている可能性があります。");
        } else {
          setError("カメラを起動できませんでした。");
        }
      });

    // QR が一定時間読めなければ OCR ヒントを表示
    const hintTimer = setTimeout(() => {
      if (!cancelled && !calledRef.current) setShowOcrHint(true);
    }, OCR_HINT_AFTER_MS);

    return () => {
      cancelled = true;
      clearTimeout(hintTimer);
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onResult]);

  const handleCaptureForOcr = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !onImageCapture) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth || 1280;
    canvas.height = videoEl.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      controlsRef.current?.stop();
      onImageCapture(blob);
    }, "image/jpeg", 0.92);
  }, [onImageCapture]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="車検証の二次元コードスキャナ"
    >
      <div className="flex items-start justify-between gap-3 p-4 text-white">
        <div>
          <div className="text-lg font-semibold">車検証の二次元コードをスキャン</div>
          <div className="mt-0.5 text-xs text-white/80">電子車検証の印字 QR にカメラをかざしてください</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          閉じる
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} playsInline muted className="max-h-full max-w-full" />

        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            カメラを起動しています...
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          </div>
        )}

        {ready && !error && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 inset-y-16 rounded-2xl border-2 border-white/40"
          />
        )}
      </div>

      <div className="flex flex-col items-center gap-3 p-4">
        {showOcrHint && onImageCapture ? (
          <>
            <p className="text-xs text-white/70 text-center">
              QRコードが読み取れません。車検証全体が映っている状態で下のボタンをタップしてください。
            </p>
            <button
              type="button"
              onClick={handleCaptureForOcr}
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90 active:scale-95 transition-transform"
            >
              写真で読み取る（OCR）
            </button>
          </>
        ) : (
          <p className="text-xs text-white/60 text-center">
            QR コードが読み取れない場合、しばらく待つと写真撮影での読み取りに切り替えられます。
          </p>
        )}
      </div>
    </div>
  );
}
