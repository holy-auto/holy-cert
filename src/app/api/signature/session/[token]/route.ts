/**
 * GET /api/signature/session/[token]
 *
 * 署名ページ表示用のセッション情報取得 API（公開エンドポイント）。
 * 証明書・帳票の両方に対応。
 */

import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { apiOk, apiError, apiInternalError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    const ua = req.headers.get('user-agent') ?? 'unknown';

    const supabase = getSupabaseAdmin();

    // セッション取得
    const { data: session, error } = await supabase
      .from('signature_sessions')
      .select(`
        id,
        status,
        expires_at,
        signer_name,
        document_hash,
        certificate_id,
        document_id,
        document_type
      `)
      .eq('token', token)
      .single();

    if (error || !session) {
      return apiError({
        code:    'not_found',
        message: '署名リンクが見つかりません',
        status:  404,
      });
    }

    // 期限切れチェック
    if (
      session.status === 'pending' &&
      new Date(session.expires_at) < new Date()
    ) {
      await supabase
        .from('signature_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id);

      await supabase.from('signature_audit_logs').insert({
        session_id: session.id,
        event:      'expired',
        ip,
        user_agent: ua,
        metadata:   { expired_at: new Date().toISOString() },
      });

      return apiOk({
        status:  'expired',
        message: '署名リンクの有効期限が切れています。再送を依頼してください。',
      });
    }

    // 署名済み・キャンセル済みの場合
    if (session.status !== 'pending') {
      return apiOk({
        status:  session.status,
        message:
          session.status === 'signed'
            ? 'この署名リンクはすでに使用されています'
            : '無効な署名リンクです',
      });
    }

    // page_opened 監査ログを記録
    await supabase.from('signature_audit_logs').insert({
      session_id: session.id,
      event:      'page_opened',
      ip,
      user_agent: ua,
      metadata:   { opened_at: new Date().toISOString() },
    });

    // 文書種別に応じて関連情報を取得
    let certData = null;
    let docData  = null;
    let pdfUrl: string | null = null;

    if (session.document_type === 'document' && session.document_id) {
      // 帳票
      const { data: doc } = await supabase
        .from('documents')
        .select('id, doc_type, doc_number, recipient_name, issued_at, note')
        .eq('id', session.document_id)
        .single();

      if (doc) {
        docData = doc;
        pdfUrl = `/admin/documents/pdf?id=${encodeURIComponent(doc.id)}`;
      }
    } else if (session.certificate_id) {
      // 証明書
      const { data: cert } = await supabase
        .from('certificates')
        .select(`
          id,
          public_id,
          created_at,
          cert_type,
          vehicles ( car_number, car_name ),
          stores   ( name )
        `)
        .eq('id', session.certificate_id)
        .single();

      if (cert) {
        certData = cert as unknown as {
          id: string;
          public_id: string;
          created_at: string;
          cert_type: string | null;
          vehicles: { car_number: string | null; car_name: string | null } | null;
          stores:   { name: string } | null;
        };
        pdfUrl = certData.public_id
          ? `/api/certificate/pdf?pid=${encodeURIComponent(certData.public_id)}`
          : null;
      }
    }

    return apiOk({
      status:        'pending',
      session_id:    session.id,
      signer_name:   session.signer_name,
      expires_at:    session.expires_at,
      document_type: session.document_type ?? 'certificate',
      pdf_url:       pdfUrl,
      certificate:   certData,
      document:      docData,
    });
  } catch (e) {
    return apiInternalError(e, "signature/session/token");
  }
}
