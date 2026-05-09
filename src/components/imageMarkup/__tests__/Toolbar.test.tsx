// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MarkupToolbar, { TOOLBAR_COLORS, TOOLBAR_STROKE_WIDTHS } from "../Toolbar";

function renderToolbar(overrides: Partial<Parameters<typeof MarkupToolbar>[0]> = {}) {
  const defaults = {
    tool: "arrow" as const,
    color: TOOLBAR_COLORS[0],
    strokeWidth: TOOLBAR_STROKE_WIDTHS[1],
    canUndo: true,
    canRedo: true,
    onToolChange: vi.fn(),
    onColorChange: vi.fn(),
    onStrokeWidthChange: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onClear: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };
  const props = { ...defaults, ...overrides };
  const utils = render(<MarkupToolbar {...props} />);
  return { ...utils, props };
}

describe("MarkupToolbar a11y", () => {
  it("renders a labelled toolbar", () => {
    renderToolbar();
    expect(screen.getByRole("toolbar", { name: "画像注釈ツール" })).toBeDefined();
  });

  it("marks the active tool with aria-pressed=true", () => {
    renderToolbar({ tool: "rect" });
    const rect = screen.getByRole("button", { name: "矩形ツール" });
    expect(rect.getAttribute("aria-pressed")).toBe("true");
    const arrow = screen.getByRole("button", { name: "矢印ツール" });
    expect(arrow.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onToolChange when a tool is clicked", () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: "円ツール" }));
    expect(props.onToolChange).toHaveBeenCalledWith("circle");
  });

  it("calls onColorChange when a color is clicked", () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: `色 ${TOOLBAR_COLORS[2]}` }));
    expect(props.onColorChange).toHaveBeenCalledWith(TOOLBAR_COLORS[2]);
  });

  it("disables undo/redo when not available", () => {
    renderToolbar({ canUndo: false, canRedo: false });
    const undo = screen.getByRole("button", { name: "元に戻す" });
    const redo = screen.getByRole("button", { name: "やり直し" });
    expect(undo.hasAttribute("disabled")).toBe(true);
    expect(redo.hasAttribute("disabled")).toBe(true);
  });

  it("save button is reachable by keyboard (Tab order via DOM order)", () => {
    renderToolbar();
    const save = screen.getByRole("button", { name: /保存/ });
    save.focus();
    expect(document.activeElement).toBe(save);
  });
});
