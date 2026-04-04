/**
 * POST /api/signature/request
 *
 * 署名依頼の作成 API。
 * 施工店（管理画面）から呼び出し、顧客への署名URLを発行する。
 * 証明書（certificates）および帳票（documents）の両方に対応。
 *
 * 処理フロー:
 * 1. 認証・課金チェック
 * 2. 対象文書の存在確認（テナント境界チェック）
 * 3. 既存 pending セッションの重複チェック
 * 4. PDF バイト列生成（SHA-256 計算用）
 * 5. 署名セッション作成（ワンタイムURL発行）
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCallerWithRole } from '@/lib/auth/checkRole';
import { apiOk, apiError, apiUnauthorized } from '@/lib/api/response';
import { createSignatureSession, getExistingPendingSession } from '@/lib/signature/session';
import { generateDocumentPdfBytes } from '@/lib/signature/pdfUtils';
import type { SignatureRequestBody, SignatureDocumentType } from '@/lib/signature/types';

export const dynamic = 'force-dynamic';

const SIGN_BASE_URL = process.env.NEXT_PUBLIC_SIGN_BASE_URL ?? '/sign';

export async function POST(req: NextRequest) {
  // 1. 認証チェック
  const supabase = await createClient();
  const caller   = await resolveCallerWithRole(supabase);
  if (!caller) return apiUnauthorized();

  const body: SignatureRequestBody = await req.json();
  const {
    certificate_id,
    document_id,
    document_type,
    signer_name,
    signer_email,
    signer_phone,
    notification_method,
  } = body;

  // 対象文書の特定
  const resolvedDocType: SignatureDocumentType = document_type ?? (certificate_id ? 'certificate' : 'document');
  const resolvedTargetId = document_id ?? certificate_id;

  if (!resolvedTargetId) {
    return apiError({
      code:    'validation_error',
      message: 'certificate_id または document_id は必須です',
      status:  400,
    });
  }

  // 2. 対象文書の存在確認・テナント境界チェック
  if (resolvedDocType === 'document') {
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, tenant_id')
      .eq('id', resolvedTargetId)
      .eq('tenant_id', caller.tenantId)
      .single();

    if (docError || !doc) {
      return apiError({
        code:    'not_found',
        message: '帳票が見つからないか、アクセス権がありません',
        status:  404,
      });
    }
  } else {
    const { data: cert, error: certError } = await supabase
      .from('certificates')
      .select('id, tenant_id, public_id')
      .eq('id', resolvedTargetId)
      .eq('tenant_id', caller.tenantId)
      .single();

    if (certError || !cert) {
      return apiError({
        code:    'not_found',
        message: '証明書が見つからないか、アクセス権がありません',
        status:  404,
      });
    }
  }

  // 3. 既存の有効な pending セッションがあれば再利用
  const existing = await getExistingPendingSession(resolvedTargetId, resolvedDocType);
  if (existing) {
    const signUrl = `${SIGN_BASE_URL}/${existing.token}`;
    return apiOk({
      session_id:  existing.id,
      sign_url:    signUrl,
      expires_at:  existing.expires_at,
      is_existing: true,
      message:     '有効な署名依頼がすでに存在します',
    });
  }

  // 4. PDF バイト列の生成（SHA-256 計算用）
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateDocumentPdfBytes(resolvedTargetId, resolvedDocType);
  } catch (err) {
    console.error('[signature/request] PDF generation failed:', err);
    return apiError({
      code:    'internal_error',
      message: 'PDF の生成に失敗しました',
      status:  500,
    });
  }

  // 5. 署名セッションの作成
  let session;
  try {
    session = await createSignatureSession({
      certificate_id:      resolvedDocType === 'certificate' ? resolvedTargetId : undefined,
      document_id:         resolvedTargetId,
      document_type:       resolvedDocType,
      tenant_id:           caller.tenantId,
      created_by:          caller.userId,
      signer_name,
      signer_email,
      signer_phone,
      notification_method: notification_method ?? 'line',
      pdf_bytes:           pdfBytes,
    });
  } catch (err) {
    console.error('[signature/request] Session creation failed:', err);
    return apiError({
      code:    'db_error',
      message: '署名セッションの作成に失敗しました',
      status:  500,
    });
  }

  const signUrl = `${SIGN_BASE_URL}/${session.token}`;

  return apiOk({
    session_id: session.id,
    sign_url:   signUrl,
    expires_at: session.expires_at,
    notified:   false,
  });
}
