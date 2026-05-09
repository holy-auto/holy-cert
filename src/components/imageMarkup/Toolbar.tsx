"use client";

import type { AnnotationKind } from "./types";

/**
 * 注釈エディタのツールバー。
 *
 * - ツール選択 (arrow/rect/circle/text/path/eraser/select)
 * - 色 (5 色プリセット)
 * - 太さ (3 段階)
 * - Undo / Redo / Clear / Save / Cancel
 *
 * a11y: 全ボタンは role="button" で Tab/Enter 操作可能。
 *      現在選択中のツールは aria-pressed="true"。
 */

export type Tool = AnnotationKind | "eraser" | "select";

export const TOOLBAR_COLORS: readonly string[] = ["#ff3b30", "#ff9500", "#ffd60a", "#00cc66", "#0080ff"];
export const TOOLBAR_STROKE_WIDTHS: readonly number[] = [3, 6, 12];

type Props = {
  tool: Tool;
  color: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  saving?: boolean;
  onToolChange: (t: Tool) => void;
  onColorChange: (c: string) => void;
  onStrokeWidthChange: (w: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onCancel: () => void;
};

const TOOL_BUTTONS: { key: Tool; label: string; aria: string }[] = [
  { key: "select", label: "選択", aria: "選択ツール" },
  { key: "arrow", label: "矢印", aria: "矢印ツール" },
  { key: "rect", label: "□", aria: "矩形ツール" },
  { key: "circle", label: "○", aria: "円ツール" },
  { key: "path", label: "✎", aria: "自由線ツール" },
  { key: "text", label: "T", aria: "テキストツール" },
  { key: "eraser", label: "消", aria: "消しゴム" },
];

export default function MarkupToolbar({
  tool,
  color,
  strokeWidth,
  canUndo,
  canRedo,
  saving,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onCancel,
}: Props) {
  return (
    <div
      role="toolbar"
      aria-label="画像注釈ツール"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-border-default bg-surface px-3 py-2"
    >
      {/* ── ツール ── */}
      <div className="flex items-center gap-1" role="group" aria-label="ツール">
        {TOOL_BUTTONS.map((b) => {
          const active = tool === b.key;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => onToolChange(b.key)}
              aria-pressed={active}
              aria-label={b.aria}
              className={`min-w-[36px] rounded-lg border px-2 py-1 text-sm font-medium transition-colors ${
                active
                  ? "border-accent bg-accent-dim text-accent-text"
                  : "border-border-default bg-surface text-secondary hover:bg-surface-hover"
              }`}
            >
              {b.label}
            </button>
          );
        })}
      </div>

      {/* ── 色 ── */}
      <div className="flex items-center gap-1" role="group" aria-label="色">
        {TOOLBAR_COLORS.map((c) => {
          const active = color.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              aria-pressed={active}
              aria-label={`色 ${c}`}
              className={`h-7 w-7 rounded-full border-2 transition-transform ${
                active ? "border-primary scale-110" : "border-border-default"
              }`}
              style={{ background: c }}
            />
          );
        })}
      </div>

      {/* ── 太さ ── */}
      <div className="flex items-center gap-1" role="group" aria-label="太さ">
        {TOOLBAR_STROKE_WIDTHS.map((w) => {
          const active = strokeWidth === w;
          return (
            <button
              key={w}
              type="button"
              onClick={() => onStrokeWidthChange(w)}
              aria-pressed={active}
              aria-label={`太さ ${w}`}
              className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                active ? "border-accent bg-accent-dim" : "border-border-default bg-surface"
              }`}
            >
              <span
                className="block rounded-full bg-primary"
                style={{ width: `${w}px`, height: `${w}px` }}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {/* ── Undo / Redo / Clear ── */}
      <div className="flex items-center gap-1 ml-auto" role="group" aria-label="編集">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="元に戻す"
          className="rounded-lg border border-border-default bg-surface px-2 py-1 text-sm text-secondary hover:bg-surface-hover disabled:opacity-40"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="やり直し"
          className="rounded-lg border border-border-default bg-surface px-2 py-1 text-sm text-secondary hover:bg-surface-hover disabled:opacity-40"
        >
          ↷
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="全消去"
          className="rounded-lg border border-border-default bg-surface px-2 py-1 text-sm text-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-300"
        >
          全消去
        </button>
      </div>

      {/* ── Save / Cancel ── */}
      <div className="flex items-center gap-2" role="group" aria-label="保存">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border-default bg-surface px-3 py-1 text-sm text-secondary hover:bg-surface-hover"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-accent px-3 py-1 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}
