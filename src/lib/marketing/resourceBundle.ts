/**
 * Bundle every entry in `RESOURCE_PDFS` into a single ZIP.
 *
 * Used by:
 * - `GET /api/marketing/resources/all/zip` to serve the full pack.
 * - `sendLeadAutoReply` to attach the pack when a lead requests `all`.
 */

import JSZip from "jszip";
import { renderToBuffer } from "@react-pdf/renderer";
import { RESOURCE_PDFS } from "./resourcePdf";

/** Special `resource_key` value that maps to "every PDF". */
export const RESOURCE_BUNDLE_KEY = "all";
export const RESOURCE_BUNDLE_FILENAME = "Ledra_Resources.zip";

export function isResourceBundleKey(key: string | null | undefined): boolean {
  return key === RESOURCE_BUNDLE_KEY;
}

/**
 * Render every registered PDF and return a single ZIP buffer. Each PDF
 * is named per the registry's locale-aware filename.
 */
export async function renderResourceBundle(): Promise<Buffer> {
  const zip = new JSZip();
  const entries = Object.entries(RESOURCE_PDFS);

  // `renderToBuffer` is CPU-bound; running them in `Promise.all` is no
  // faster than serial in single-threaded Node, but keeps the code
  // readable and lets any IO inside the doc factories overlap.
  const files = await Promise.all(
    entries.map(async ([, entry]) => {
      const docElement = await entry.doc({ locale: "ja" });
      const buffer = await renderToBuffer(docElement);
      return { filename: entry.filename({ locale: "ja" }), buffer };
    }),
  );

  for (const f of files) {
    zip.file(f.filename, f.buffer);
  }

  return await zip.generateAsync({ type: "nodebuffer" });
}
