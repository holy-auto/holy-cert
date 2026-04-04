/**
 * Ledra 電子署名 - PDF ユーティリティ
 *
 * 証明書・帳票 PDF のバイト列生成と、
 * 署名情報が埋め込まれた PDF の再生成を担当する。
 *
 * 注意: Phase 5 で pdfCertificate.tsx の拡張後に実装を完成させる。
 *       現時点では型定義と骨格のみ提供する。
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { SignatureDocumentType } from './types';

/** PDF に埋め込む署名情報 */
export interface PdfSignatureInfo {
  signedAt:             string;
  signerEmail:          string;       // 表示用（マスク済み）
  signerName?:          string;
  signaturePreview:     string;       // 署名値の省略形（先頭20文字 + "..."）
  publicKeyFingerprint: string;
  verifyUrl:            string;
  documentHash:         string;
}

/**
 * 署名対象文書の PDF バイト列を生成する。
 *
 * 署名前のハッシュ計算に使用する。
 * document_type に応じて証明書 or 帳票の PDF を生成する。
 *
 * @param targetId     - 文書 UUID（certificates.id or documents.id）
 * @param documentType - 'certificate' | 'document'
 * @returns PDF バイト列（Uint8Array）
 * @throws 文書が見つからない場合、PDF 生成失敗時
 *
 * TODO: Phase 5 で実際の PDF 生成を実装
 */
export async function generateDocumentPdfBytes(
  targetId: string,
  documentType: SignatureDocumentType,
): Promise<Uint8Array> {
  const supabase = getSupabaseAdmin();

  if (documentType === 'document') {
    const { data: doc, error } = await supabase
      .from('documents')
      .select('id, doc_number, doc_type')
      .eq('id', targetId)
      .single();

    if (error || !doc) {
      throw new Error(`[pdfUtils] Document not found: ${targetId}`);
    }

    // TODO: Phase 5 で renderDocumentPdf を使って実装
    const placeholder = new TextEncoder().encode(
      `PLACEHOLDER_DOC_PDF_${doc.doc_number}_TODO_REPLACE_IN_PHASE5`,
    );
    return placeholder;
  }

  // certificate
  const { data: cert, error } = await supabase
    .from('certificates')
    .select('id, public_id')
    .eq('id', targetId)
    .single();

  if (error || !cert) {
    throw new Error(`[pdfUtils] Certificate not found: ${targetId}`);
  }

  // TODO: Phase 5 で renderToBuffer(PdfCertificate) を使って実装
  const placeholder = new TextEncoder().encode(
    `PLACEHOLDER_PDF_${cert.public_id}_TODO_REPLACE_IN_PHASE5`,
  );
  return placeholder;
}

/** 後方互換: 証明書 PDF バイト列生成 */
export async function generateCertificatePdfBytes(
  certificateId: string,
): Promise<Uint8Array> {
  return generateDocumentPdfBytes(certificateId, 'certificate');
}

/**
 * 署名情報が埋め込まれた PDF を再生成する。
 *
 * 署名完了後に呼び出し、Supabase Storage に保存する。
 * 非同期で実行するため、呼び出し元は await せず void で使用すること。
 *
 * @param targetId      - 文書 UUID
 * @param documentType  - 'certificate' | 'document'
 * @param signatureInfo - 埋め込む署名情報
 *
 * TODO: Phase 5 で実装
 */
export async function regenerateSignedPdf(
  targetId: string,
  documentType: SignatureDocumentType,
  signatureInfo: PdfSignatureInfo,
): Promise<void> {
  // TODO: Phase 5 で実装
  console.info(
    `[pdfUtils] regenerateSignedPdf called for ${documentType}/${targetId} (Phase 5 TODO)`,
    { verifyUrl: signatureInfo.verifyUrl },
  );
}
