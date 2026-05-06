/**
 * 資料ダウンロードに登録されている全 PDF をローカルに書き出すスクリプト。
 * 一時的な確認用途。実行後は削除して構いません。
 *
 *   npx tsx scripts/generate-marketing-pdfs.ts [出力先ディレクトリ]
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { RESOURCE_PDFS } from "@/lib/marketing/resourcePdf";

async function main() {
  const outDir = resolve(process.argv[2] ?? "/tmp/ledra-pdfs");
  await mkdir(outDir, { recursive: true });

  const keys = Object.keys(RESOURCE_PDFS);
  console.log(`Generating ${keys.length} PDF(s) into ${outDir}\n`);

  for (const key of keys) {
    const entry = RESOURCE_PDFS[key];
    const filename = entry.filename({ locale: "ja" });
    const path = resolve(outDir, filename);
    const t0 = Date.now();
    const docElement = await entry.doc({ locale: "ja" });
    const buffer = await renderToBuffer(docElement);
    await writeFile(path, buffer);
    const ms = Date.now() - t0;
    const kb = (buffer.length / 1024).toFixed(1);
    console.log(`  ${key.padEnd(22)} -> ${filename}  (${kb} KB, ${ms} ms)`);
  }

  console.log(`\nDone. Open the directory: ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
