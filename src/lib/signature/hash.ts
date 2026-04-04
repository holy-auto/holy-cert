/**
 * Ledra 電子署名 - ハッシュ計算・ペイロード構築
 *
 * 電子署名法第2条第2号（非改ざん性）の技術的基盤。
 * SHA-256 ハッシュにより文書の同一性を保証し、
 * 署名ペイロードの正規化により改ざん検知範囲を明確化する。
 */

import { createHash } from 'crypto';
import { createPublicKey } from 'crypto';

/**
 * PDF バイト列の SHA-256 ハッシュを計算する。
 *
 * これが電子署名法第2条第2号（非改ざん性）の核心実装。
 * 署名前・署名後の両時点でハッシュを記録・比較することで
 * 文書の改ざんを暗号的に検知できる。
 *
 * @param pdfBytes - PDF のバイト列
 * @returns 小文字 HEX 文字列形式の SHA-256 ハッシュ（64文字）
 */
export function computeDocumentHash(pdfBytes: Uint8Array): string {
  return createHash('sha256').update(pdfBytes).digest('hex');
}

/**
 * ECDSA P-256 公開鍵の SHA-256 フィンガープリントを計算する。
 *
 * 鍵ローテーション時に「どの公開鍵で検証すべきか」を
 * 署名レコードに紐付けるために使用する。
 *
 * @param publicKeyPem - PEM 形式の公開鍵
 * @returns 小文字 HEX 文字列形式の SHA-256 フィンガープリント（64文字）
 */
export function computePublicKeyFingerprint(publicKeyPem: string): string {
  const pubKey = createPublicKey(publicKeyPem);
  const der = pubKey.export({ type: 'spki', format: 'der' }) as Buffer;
  return createHash('sha256').update(der).digest('hex');
}

/**
 * 署名対象の正規化ペイロードを構築する。
 *
 * 各フィールドをコロン区切りで結合し、署名の対象範囲を明確に定義する。
 * このペイロードが ECDSA で署名され、改ざん検知の根拠となる。
 *
 * フォーマット（v2: 汎用文書対応）:
 *   "ledra-signature-v2:{document_hash}:{signed_at}:{signer_email}:{document_type}:{document_id}:{session_id}"
 *
 * @param documentHash  - SHA-256(PDF) HEX
 * @param signedAt      - 署名日時 ISO 8601 UTC
 * @param signerEmail   - 署名者メールアドレス
 * @param documentId    - 文書 UUID（certificates.id or documents.id）
 * @param sessionId     - 署名セッション UUID
 * @param documentType  - 'certificate' | 'document'（省略時 'certificate'）
 * @returns 正規化されたペイロード文字列
 */
export function buildSigningPayload(
  documentHash: string,
  signedAt: string,
  signerEmail: string,
  documentId: string,
  sessionId: string,
  documentType: string = 'certificate',
): string {
  return [
    'ledra-signature-v2',
    documentHash.toLowerCase(),
    signedAt,
    signerEmail.toLowerCase().trim(),
    documentType.toLowerCase(),
    documentId.toLowerCase(),
    sessionId.toLowerCase(),
  ].join(':');
}
