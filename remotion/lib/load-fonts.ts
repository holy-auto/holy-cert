import { continueRender, delayRender, staticFile } from "remotion";

export const FONT = "'Noto Sans JP', sans-serif";

if (typeof document !== "undefined") {
  const handle = delayRender("Loading Noto Sans JP");

  // Safety timeout — always release render within 8s regardless of font load result
  const timer = setTimeout(() => {
    console.warn("[load-fonts] timeout — rendering without custom font");
    continueRender(handle);
  }, 8000);

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
    .catch((e) => console.warn("[load-fonts] load failed:", e))
    .finally(() => {
      clearTimeout(timer);
      continueRender(handle);
    });
}
