// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BeforeAfterSlider from "../BeforeAfterSlider";

const PROPS = {
  beforeSrc: "https://signed/before.jpg",
  afterSrc: "https://signed/after.jpg",
  caption: "ボンネット施工",
  width: null,
  height: null,
};

function getRangeInput() {
  const el = screen.getByRole("slider") as HTMLInputElement;
  if (!el) throw new Error("range input not found");
  return el;
}

function getAfterImage() {
  return screen.getByAltText("ボンネット施工 (After)") as HTMLImageElement;
}

function clipInsetRight(el: HTMLElement): number {
  const m = el.style.clipPath.match(/inset\(0 (\d+(?:\.\d+)?)% 0 0\)/);
  if (!m) throw new Error(`expected clipPath, got ${el.style.clipPath}`);
  return Number(m[1]);
}

describe("BeforeAfterSlider", () => {
  it("renders with default position = 50% (After 50% visible)", () => {
    render(<BeforeAfterSlider {...PROPS} />);
    const range = getRangeInput();
    expect(range.value).toBe("50");
    const after = getAfterImage();
    expect(clipInsetRight(after)).toBe(50);
    expect(range.getAttribute("aria-valuenow")).toBe("50");
    expect(range.getAttribute("aria-valuetext")).toBe("After 50% / Before 50%");
  });

  it("clip-path mirrors the slider position (pos=80 → inset right 20%)", () => {
    render(<BeforeAfterSlider {...PROPS} />);
    const range = getRangeInput();
    fireEvent.change(range, { target: { value: "80" } });
    expect(getAfterImage().style.clipPath).toBe("inset(0 20% 0 0)");
  });

  it("clamps to MIN at pos=0 (After fully clipped, Before fully visible)", () => {
    render(<BeforeAfterSlider {...PROPS} />);
    const range = getRangeInput();
    fireEvent.change(range, { target: { value: "0" } });
    expect(clipInsetRight(getAfterImage())).toBe(100);
    expect(range.getAttribute("aria-valuetext")).toBe("After 0% / Before 100%");
  });

  it("clamps to MAX at pos=100 (After fully visible, Before clipped away)", () => {
    render(<BeforeAfterSlider {...PROPS} />);
    const range = getRangeInput();
    fireEvent.change(range, { target: { value: "100" } });
    expect(clipInsetRight(getAfterImage())).toBe(0);
    expect(range.getAttribute("aria-valuetext")).toBe("After 100% / Before 0%");
  });

  it("uses width/height to set aspectRatio when provided", () => {
    const { container } = render(<BeforeAfterSlider {...PROPS} width={1920} height={1080} />);
    const figure = container.querySelector("figure");
    const wrap = figure?.querySelector("div") as HTMLElement;
    expect(wrap.style.aspectRatio).toBe("1920 / 1080");
  });

  it("falls back to 4 / 3 aspect ratio when width or height is missing", () => {
    const { container } = render(<BeforeAfterSlider {...PROPS} />);
    const figure = container.querySelector("figure");
    const wrap = figure?.querySelector("div") as HTMLElement;
    expect(wrap.style.aspectRatio).toBe("4 / 3");
  });

  it("exposes an aria-label that describes the slider purpose (uses caption as label)", () => {
    render(<BeforeAfterSlider {...PROPS} />);
    const range = getRangeInput();
    expect(range.getAttribute("aria-label")).toContain("ボンネット施工");
    expect(range.getAttribute("aria-label")).toContain("スライダー");
  });

  it("falls back to a default label when caption is null", () => {
    render(<BeforeAfterSlider {...PROPS} caption={null} />);
    const range = getRangeInput();
    expect(range.getAttribute("aria-label")).toContain("Before / After");
  });

  it("supports keyboard nav via the underlying range input (← / →)", () => {
    render(<BeforeAfterSlider {...PROPS} />);
    const range = getRangeInput();
    range.focus();
    expect(document.activeElement).toBe(range);
    // Native <input type=range> handles ArrowLeft/Right; we verify the
    // element is reachable by keyboard and has correct min/max/step.
    expect(range.min).toBe("0");
    expect(range.max).toBe("100");
    expect(range.step).toBe("1");
  });

  it("renders a caption when provided", () => {
    render(<BeforeAfterSlider {...PROPS} caption="リアバンパー修復" />);
    expect(screen.getByText("リアバンパー修復")).toBeDefined();
  });

  it("does not render a caption when null", () => {
    render(<BeforeAfterSlider {...PROPS} caption={null} />);
    // figcaption only renders when caption is truthy
    expect(document.querySelector("figcaption")).toBeNull();
  });
});
