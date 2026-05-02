import { continueRender, delayRender, staticFile } from "remotion";

/**
 * Loads Noto Sans JP from the bundled public/fonts/ TTF files.
 * Uses delayRender so Remotion waits for the font before rendering any frame.
 */
export const FONT = "'Noto Sans JP', sans-serif";

if (typeof document !== "undefined") {
  const handle = delayRender("Loading Noto Sans JP");

  const loadFonts = async () => {
    const [f400, f700] = await Promise.all([
      new FontFace(
        "Noto Sans JP",
        `url(${staticFile("fonts/NotoSansJP-400.ttf")}) format("truetype")`,
        { weight: "400", style: "normal" }
      ).load(),
      new FontFace(
        "Noto Sans JP",
        `url(${staticFile("fonts/NotoSansJP-700.ttf")}) format("truetype")`,
        { weight: "700", style: "normal" }
      ).load(),
    ]);
    document.fonts.add(f400);
    document.fonts.add(f700);
  };

  loadFonts()
    .catch((e) => console.warn("Font load failed, falling back:", e))
    .finally(() => continueRender(handle));
}
