"use client";

/**
 * Phase 2: 画像注釈エディタ (Konva ベース)。
 *
 * - SSR 不可: react-konva は window 依存。親コンポーネントで
 *   `dynamic(() => import("./ImageMarkupEditor"), { ssr: false })`
 *   として読み込むこと。
 * - 表示はキャンバス幅にフィットさせ、書き戻しは元解像度に再投影する。
 *   AnnotationDocument の座標は元画像ピクセル空間。
 * - Undo/Redo は履歴スタックで実現。保存後に履歴をリセットする。
 *
 * 操作:
 *   - 矢印 / 矩形 / 円: ドラッグで描画
 *   - 自由線: ドラッグで連続点を追加
 *   - テキスト: クリックで window.prompt → 文字列を確定
 *   - 消しゴム: shape をクリックで削除
 *   - 選択: shape をクリックで選択 → Backspace で削除
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Image as KImage, Rect, Circle as KCircle, Arrow, Line, Text as KText } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";

import MarkupToolbar, { type Tool, TOOLBAR_COLORS, TOOLBAR_STROKE_WIDTHS } from "./Toolbar";
import type { Annotation, AnnotationDocument } from "./types";

type Props = {
  /** 表示・編集対象の画像 URL (CORS 許可されていること)。 */
  imageUrl: string;
  /** 既存の注釈 (新規なら null)。 */
  initial: AnnotationDocument | null;
  /** 保存ボタン押下時の callback。doc.imageWidth / Height は実画像サイズに揃う。 */
  onSave: (doc: AnnotationDocument) => void | Promise<void>;
  /** キャンセル callback。 */
  onCancel: () => void;
  /** 表示幅の上限 (px)。実画像はこの幅にフィットする。デフォルト 800。 */
  maxDisplayWidth?: number;
};

type DraftAnnotation = Annotation;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `a-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export default function ImageMarkupEditor({ imageUrl, initial, onSave, onCancel, maxDisplayWidth = 800 }: Props) {
  // 画像をブラウザでロードして Konva に渡す。
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      setImage(img);
      setNaturalSize({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = () => {
      if (cancelled) return;
      setImage(null);
    };
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // 表示スケール (実画像 → キャンバス幅)。
  const scale = useMemo(() => {
    if (!naturalSize) return 1;
    return Math.min(1, maxDisplayWidth / naturalSize.width);
  }, [naturalSize, maxDisplayWidth]);

  const displaySize = useMemo(
    () => ({
      width: naturalSize ? naturalSize.width * scale : maxDisplayWidth,
      height: naturalSize ? naturalSize.height * scale : Math.round((maxDisplayWidth * 9) / 16),
    }),
    [naturalSize, scale, maxDisplayWidth],
  );

  // ── 状態: ツール / 色 / 太さ / annotations ──
  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState<string>(TOOLBAR_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState<number>(TOOLBAR_STROKE_WIDTHS[1]);
  const [annotations, setAnnotations] = useState<DraftAnnotation[]>(() => initial?.annotations ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Undo / Redo スタック (annotations 配列のスナップショット)。
  const undoStack = useRef<DraftAnnotation[][]>([]);
  const redoStack = useRef<DraftAnnotation[][]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const pushHistory = useCallback((snapshot: DraftAnnotation[]) => {
    undoStack.current.push(snapshot);
    redoStack.current = [];
    setHistoryTick((t) => t + 1);
  }, []);

  const commit = useCallback(
    (next: DraftAnnotation[]) => {
      pushHistory(annotations);
      setAnnotations(next);
    },
    [annotations, pushHistory],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(annotations);
    setAnnotations(prev);
    setHistoryTick((t) => t + 1);
  }, [annotations]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(annotations);
    setAnnotations(next);
    setHistoryTick((t) => t + 1);
  }, [annotations]);

  const clearAll = useCallback(() => {
    if (annotations.length === 0) return;
    commit([]);
  }, [annotations, commit]);

  // Backspace で選択中の shape を消す。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Backspace" || e.key === "Delete") && selectedId) {
        const next = annotations.filter((a) => a.id !== selectedId);
        if (next.length !== annotations.length) {
          commit(next);
          setSelectedId(null);
          e.preventDefault();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        undo();
        e.preventDefault();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        redo();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [annotations, commit, redo, selectedId, undo]);

  // ── 描画中の draft ──
  const drawingRef = useRef<DraftAnnotation | null>(null);
  const [drawing, setDrawing] = useState<DraftAnnotation | null>(null);

  /** ステージ座標 → 元画像ピクセル座標に逆変換。 */
  const toNatural = useCallback(
    (stagePos: { x: number; y: number }) => ({
      x: stagePos.x / scale,
      y: stagePos.y / scale,
    }),
    [scale],
  );

  const handleStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!naturalSize) return;
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const p = toNatural(pointer);

      // 空白部分のクリックで選択解除。
      if (tool === "select") {
        if (e.target === stage || e.target.getClassName?.() === "Image") {
          setSelectedId(null);
        }
        return;
      }
      if (tool === "eraser") return;

      const id = newId();
      let draft: DraftAnnotation;
      switch (tool) {
        case "arrow":
          draft = { id, kind: "arrow", color, strokeWidth, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
          break;
        case "rect":
          draft = { id, kind: "rect", color, strokeWidth, x: p.x, y: p.y, width: 0, height: 0 };
          break;
        case "circle":
          draft = { id, kind: "circle", color, strokeWidth, cx: p.x, cy: p.y, radius: 0 };
          break;
        case "path":
          draft = { id, kind: "path", color, strokeWidth, points: [p.x, p.y] };
          break;
        case "text": {
          const text = window.prompt("テキストを入力", "");
          if (!text) return;
          const fontSize = Math.max(16, strokeWidth * 6);
          commit([...annotations, { id, kind: "text", color, strokeWidth, x: p.x, y: p.y, text, fontSize }]);
          return;
        }
        default:
          return;
      }
      drawingRef.current = draft;
      setDrawing(draft);
    },
    [annotations, color, commit, naturalSize, strokeWidth, tool, toNatural],
  );

  const handleStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!drawingRef.current) return;
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const p = toNatural(pointer);
      const d = drawingRef.current;
      switch (d.kind) {
        case "arrow":
          drawingRef.current = { ...d, x2: p.x, y2: p.y };
          break;
        case "rect": {
          // anchor は元の x,y 位置 (drawing 開始位置)。draft 中は width/height のみ更新。
          const anchorX = d.x;
          const anchorY = d.y;
          drawingRef.current = {
            ...d,
            x: Math.min(anchorX, p.x),
            y: Math.min(anchorY, p.y),
            width: Math.abs(p.x - anchorX),
            height: Math.abs(p.y - anchorY),
          };
          break;
        }
        case "circle": {
          const dx = p.x - d.cx;
          const dy = p.y - d.cy;
          drawingRef.current = { ...d, radius: Math.sqrt(dx * dx + dy * dy) };
          break;
        }
        case "path":
          drawingRef.current = { ...d, points: [...d.points, p.x, p.y] };
          break;
        default:
          break;
      }
      setDrawing({ ...drawingRef.current });
    },
    [toNatural],
  );

  const handleStageMouseUp = useCallback(() => {
    const d = drawingRef.current;
    drawingRef.current = null;
    if (!d) return;
    setDrawing(null);
    // 消しゴム/select は draft 自体作らないので、ここでは追加するだけで OK。
    // ただし無意味に小さい shape (誤クリック) は捨てる。
    if (d.kind === "rect" && d.width < 2 && d.height < 2) return;
    if (d.kind === "circle" && d.radius < 2) return;
    if (d.kind === "arrow" && Math.hypot(d.x2 - d.x1, d.y2 - d.y1) < 4) return;
    if (d.kind === "path" && d.points.length < 4) return;
    commit([...annotations, d]);
  }, [annotations, commit]);

  // shape クリック (eraser / select)
  const handleShapeClick = useCallback(
    (id: string) => {
      if (tool === "eraser") {
        const next = annotations.filter((a) => a.id !== id);
        if (next.length !== annotations.length) {
          commit(next);
        }
      } else if (tool === "select") {
        setSelectedId(id);
      }
    },
    [annotations, commit, tool],
  );

  // ── 保存 ──
  const [saving, setSaving] = useState(false);
  const handleSave = useCallback(async () => {
    if (!naturalSize) return;
    setSaving(true);
    try {
      const doc: AnnotationDocument = {
        version: 1,
        imageWidth: naturalSize.width,
        imageHeight: naturalSize.height,
        annotations: annotations,
      };
      await onSave(doc);
      // 履歴リセット (保存後)
      undoStack.current = [];
      redoStack.current = [];
      setHistoryTick((t) => t + 1);
    } finally {
      setSaving(false);
    }
  }, [annotations, naturalSize, onSave]);

  const renderAnnotation = (a: DraftAnnotation, key: string) => {
    const stroke = a.color;
    const lw = a.strokeWidth * scale;
    const isSelected = selectedId === a.id;
    const onClick = () => handleShapeClick(a.id);
    switch (a.kind) {
      case "arrow":
        return (
          <Arrow
            key={key}
            x={0}
            y={0}
            points={[a.x1 * scale, a.y1 * scale, a.x2 * scale, a.y2 * scale]}
            stroke={stroke}
            fill={stroke}
            strokeWidth={lw}
            pointerLength={Math.max(8, lw * 2)}
            pointerWidth={Math.max(8, lw * 2)}
            lineCap="round"
            onClick={onClick}
            onTap={onClick}
            shadowEnabled={isSelected}
            shadowColor="#0080ff"
            shadowBlur={6}
          />
        );
      case "rect":
        return (
          <Rect
            key={key}
            x={a.x * scale}
            y={a.y * scale}
            width={a.width * scale}
            height={a.height * scale}
            stroke={stroke}
            strokeWidth={lw}
            onClick={onClick}
            onTap={onClick}
            shadowEnabled={isSelected}
            shadowColor="#0080ff"
            shadowBlur={6}
          />
        );
      case "circle":
        return (
          <KCircle
            key={key}
            x={a.cx * scale}
            y={a.cy * scale}
            radius={a.radius * scale}
            stroke={stroke}
            strokeWidth={lw}
            onClick={onClick}
            onTap={onClick}
            shadowEnabled={isSelected}
            shadowColor="#0080ff"
            shadowBlur={6}
          />
        );
      case "text":
        return (
          <KText
            key={key}
            x={a.x * scale}
            y={a.y * scale - a.fontSize * scale}
            text={a.text}
            fill={stroke}
            stroke="#ffffff"
            strokeWidth={Math.max(2, a.fontSize * 0.12) * scale}
            fillAfterStrokeEnabled
            fontSize={a.fontSize * scale}
            fontStyle="bold"
            onClick={onClick}
            onTap={onClick}
            shadowEnabled={isSelected}
            shadowColor="#0080ff"
            shadowBlur={6}
          />
        );
      case "path":
        return (
          <Line
            key={key}
            points={a.points.map((n) => n * scale)}
            stroke={stroke}
            strokeWidth={lw}
            lineCap="round"
            lineJoin="round"
            tension={0.4}
            onClick={onClick}
            onTap={onClick}
            shadowEnabled={isSelected}
            shadowColor="#0080ff"
            shadowBlur={6}
          />
        );
    }
  };

  // 履歴ボタンの enable 計算。historyTick で再評価を促す。
  // useRef 経由の値なので useMemo 依存に [historyTick] を入れて再計算をトリガする。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const canUndo = useMemo(() => undoStack.current.length > 0, [historyTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const canRedo = useMemo(() => redoStack.current.length > 0, [historyTick]);

  return (
    <div className="space-y-3">
      <MarkupToolbar
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        canUndo={canUndo}
        canRedo={canRedo}
        saving={saving}
        onToolChange={setTool}
        onColorChange={setColor}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={undo}
        onRedo={redo}
        onClear={clearAll}
        onSave={handleSave}
        onCancel={onCancel}
      />

      <div
        className="relative inline-block overflow-hidden rounded-xl border border-border-default bg-base shadow-sm"
        style={{ width: displaySize.width, height: displaySize.height }}
      >
        {!image ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">画像を読み込み中…</div>
        ) : (
          <Stage
            width={displaySize.width}
            height={displaySize.height}
            onMouseDown={handleStageMouseDown}
            onTouchStart={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onTouchMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onTouchEnd={handleStageMouseUp}
            style={{ cursor: tool === "select" || tool === "eraser" ? "default" : "crosshair" }}
          >
            <Layer listening={false}>
              <KImage image={image} width={displaySize.width} height={displaySize.height} />
            </Layer>
            <Layer>
              {annotations.map((a) => renderAnnotation(a, a.id))}
              {drawing ? renderAnnotation(drawing, "draft") : null}
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
}
