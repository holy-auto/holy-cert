import { continueRender, delayRender, staticFile } from "remotion";

export const FONT = "'Noto Sans JP', 'Noto Sans CJK JP', sans-serif";

if (typeof document !== "undefined") {
  // A browser-side setTimeout safety net is unreliable here: the Remotion
  // render worker can pause page execution while waiting on delayRender to
  // clear, so timers don't fire. Use Remotion's built-in timeout/retries
  // instead — each retry gets a fresh page, which clears any stuck state.
  const handle = delayRender("Loading Noto Sans JP", {
    timeoutInMilliseconds: 30000,
    retries: 3,
  });

  // Fetch the bytes ourselves and pass them to FontFace as an ArrayBuffer.
  // FontFace.load() against a URL has been observed to hang silently inside
  // the render worker; doing the fetch explicitly surfaces network errors
  // immediately so .finally() always runs.
  const loadOne = async (url: string, weight: "400" | "700") => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const buffer = await res.arrayBuffer();
    const face = new FontFace("Noto Sans JP", buffer, {
      weight,
      style: "normal",
    });
    await face.load();
    document.fonts.add(face);
  };

  Promise.allSettled([
    loadOne(staticFile("fonts/NotoSansJP-400.ttf"), "400"),
    loadOne(staticFile("fonts/NotoSansJP-700.ttf"), "700"),
  ]).then((results) => {
    for (const r of results) {
      if (r.status === "rejected") {
        console.warn("[load-fonts] load failed, falling back:", r.reason);
      }
    }
    continueRender(handle);
  });
}
