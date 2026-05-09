// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AnnotatedImage from "../AnnotatedImage";
import type { AnnotationDocument } from "../types";

const sampleDoc: AnnotationDocument = {
  version: 1,
  imageWidth: 800,
  imageHeight: 600,
  annotations: [{ id: "a1", kind: "arrow", color: "#ff3b30", strokeWidth: 4, x1: 10, y1: 10, x2: 200, y2: 200 }],
};

describe("AnnotatedImage", () => {
  it("uses renderedUrl when provided", () => {
    const { container } = render(
      <AnnotatedImage
        imageUrl="/orig.jpg"
        renderedUrl="/rendered.jpg"
        annotations={sampleDoc}
        alt="photo"
        className="thumb"
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/rendered.jpg");
    // SVG オーバーレイは出ない (rendered で焼き込まれている前提)。
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders an SVG overlay when annotations exist and rendered is missing", () => {
    const { container } = render(
      <AnnotatedImage imageUrl="/orig.jpg" annotations={sampleDoc} alt="photo" className="thumb" />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/orig.jpg");
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 800 600");
    // 矢印 line が含まれている。
    expect(svg?.innerHTML).toContain("<line");
  });

  it("falls back to plain <img> when no annotations and no rendered URL", () => {
    const { container } = render(
      <AnnotatedImage imageUrl="/orig.jpg" annotations={null} alt="photo" className="thumb" />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/orig.jpg");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("ignores malformed annotations", () => {
    const { container } = render(
      <AnnotatedImage imageUrl="/orig.jpg" annotations={{ totally: "wrong" }} alt="photo" />,
    );
    expect(container.querySelector("svg")).toBeNull();
  });
});
