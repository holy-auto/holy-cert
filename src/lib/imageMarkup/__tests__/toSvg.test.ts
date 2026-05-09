import { describe, it, expect } from "vitest";
import { annotationsToSvg, escapeXml } from "../toSvg";
import type { AnnotationDocument } from "@/components/imageMarkup/types";

const baseDoc = (annotations: AnnotationDocument["annotations"]): AnnotationDocument => ({
  version: 1,
  imageWidth: 1024,
  imageHeight: 768,
  annotations,
});

describe("escapeXml", () => {
  it("escapes the five XML special characters", () => {
    expect(escapeXml(`<a href="x" id='y'>&hello</a>`)).toBe(
      "&lt;a href=&quot;x&quot; id=&apos;y&apos;&gt;&amp;hello&lt;/a&gt;",
    );
  });
});

describe("annotationsToSvg", () => {
  it("returns a valid svg shell for an empty document", () => {
    const svg = annotationsToSvg(baseDoc([]));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('viewBox="0 0 1024 768"');
    // <defs> は marker が必要なときだけ。
    expect(svg).not.toContain("<defs>");
  });

  it("renders an arrow with marker-end and a defs entry", () => {
    const svg = annotationsToSvg(
      baseDoc([
        {
          id: "a1",
          kind: "arrow",
          color: "#ff3b30",
          strokeWidth: 4,
          x1: 10,
          y1: 20,
          x2: 100,
          y2: 200,
        },
      ]),
    );
    expect(svg).toContain("<defs>");
    expect(svg).toContain("<marker");
    expect(svg).toContain('id="arrowhead-ff3b30"');
    expect(svg).toContain('marker-end="url(#arrowhead-ff3b30)"');
    expect(svg).toContain('<line x1="10" y1="20" x2="100" y2="200"');
  });

  it("dedupes arrowhead markers per color", () => {
    const svg = annotationsToSvg(
      baseDoc([
        { id: "a1", kind: "arrow", color: "#ff3b30", strokeWidth: 4, x1: 0, y1: 0, x2: 1, y2: 1 },
        { id: "a2", kind: "arrow", color: "#ff3b30", strokeWidth: 4, x1: 2, y1: 2, x2: 3, y2: 3 },
        { id: "a3", kind: "arrow", color: "#0080ff", strokeWidth: 4, x1: 4, y1: 4, x2: 5, y2: 5 },
      ]),
    );
    expect(svg.match(/<marker /g)?.length).toBe(2);
  });

  it("renders rect without fill", () => {
    const svg = annotationsToSvg(
      baseDoc([{ id: "r1", kind: "rect", color: "#00ff00", strokeWidth: 5, x: 5, y: 6, width: 100, height: 50 }]),
    );
    expect(svg).toContain('<rect x="5" y="6" width="100" height="50"');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke="#00ff00"');
  });

  it("renders circle without fill", () => {
    const svg = annotationsToSvg(
      baseDoc([{ id: "c1", kind: "circle", color: "#0080ff", strokeWidth: 3, cx: 50, cy: 60, radius: 25 }]),
    );
    expect(svg).toContain('<circle cx="50" cy="60" r="25"');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke="#0080ff"');
  });

  it("renders text with white outline (paint-order=stroke)", () => {
    const svg = annotationsToSvg(
      baseDoc([
        { id: "t1", kind: "text", color: "#ff3b30", strokeWidth: 1, x: 10, y: 30, text: "hello", fontSize: 24 },
      ]),
    );
    expect(svg).toContain('font-size="24"');
    expect(svg).toContain('paint-order="stroke"');
    expect(svg).toContain(">hello</text>");
  });

  it("escapes user-provided text", () => {
    const svg = annotationsToSvg(
      baseDoc([
        {
          id: "t1",
          kind: "text",
          color: "#ff3b30",
          strokeWidth: 1,
          x: 0,
          y: 30,
          text: `<script>alert("x")</script>`,
          fontSize: 24,
        },
      ]),
    );
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("renders a path with an M/L command sequence", () => {
    const svg = annotationsToSvg(
      baseDoc([{ id: "p1", kind: "path", color: "#222222", strokeWidth: 2, points: [0, 0, 10, 10, 20, 5] }]),
    );
    expect(svg).toContain('d="M 0 0 L 10 10 L 20 5"');
    expect(svg).toContain('stroke="#222222"');
  });

  it("ignores degenerate paths with fewer than 2 points", () => {
    const svg = annotationsToSvg(
      baseDoc([{ id: "p1", kind: "path", color: "#222222", strokeWidth: 2, points: [0, 0] }]),
    );
    // <path> 要素は出力されない (空文字列を結合)。
    expect(svg).not.toContain("<path");
  });

  it("falls back to safe color when an invalid color is given", () => {
    const svg = annotationsToSvg(
      baseDoc([
        {
          id: "r1",
          kind: "rect",
          color: "javascript:alert(1)",
          strokeWidth: 2,
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        },
      ]),
    );
    expect(svg).not.toContain("javascript:alert");
    // デフォルト (#ff3b30) にフォールバック
    expect(svg).toContain('stroke="#ff3b30"');
  });
});
