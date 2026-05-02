import { continueRender, delayRender } from "remotion";

/**
 * Loads Inter + Noto Sans JP from Google Fonts before Remotion renders any frame.
 * Called at module level so it runs once per Remotion evaluation context.
 */
export const FONT = "'Inter', 'Noto Sans JP', sans-serif";

if (typeof document !== "undefined") {
  const handle = delayRender("Loading Inter + Noto Sans JP");

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700;800&display=block";

  const done = () => continueRender(handle);
  link.addEventListener("load", done);
  link.addEventListener("error", done); // never block render on font failure

  document.head.appendChild(link);

  // Fallback: also wait for document.fonts.ready in case link.onload fires
  // before the font bytes are parsed.
  document.fonts.ready.then(done).catch(done);
}
