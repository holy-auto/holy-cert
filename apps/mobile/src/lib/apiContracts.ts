/**
 * モバイル API レスポンスの shape 定義。
 *
 * サーバ側の Next route handlers は `apiOk({ <key>: <data> })` で
 * `{ ok: true, <key>: <data> }` を返す。クライアント側はキー名を
 * 通じてデータを取り出すので、ここではキー含めて型を定義する。
 *
 * 新しいエンドポイントを叩くときは、まずこのファイルに型を追加し、
 * `mobileApi<MobileApi.<TypeName>>(...)` で呼び出すこと。
 */

export namespace MobileApi {
  // ── レジ開閉 ─────────────────────────────────────────
  export interface RegisterSession {
    id: string;
    status: "open" | "closed";
    opened_at: string;
    closed_at: string | null;
    opening_cash: number;
    closing_cash: number | null;
    total_sales: number;
    total_transactions: number;
    expected_cash: number;
  }
  export type OpenRegisterResponse = { register_session: RegisterSession };
  export type CloseRegisterResponse = { register_session: RegisterSession };

  // ── 証明書 ───────────────────────────────────────────
  export interface CertificateRow {
    id: string;
    public_id: string;
    certificate_no: string;
    status: string;
    issued_at: string | null;
    voided_at: string | null;
    void_reason: string | null;
    [key: string]: unknown;
  }
  export type ActivateCertificateResponse = { certificate: CertificateRow };
  export type VoidCertificateResponse = { certificate: CertificateRow };

  // ── 予約 ─────────────────────────────────────────────
  export interface ReservationRow {
    id: string;
    status: string;
    scheduled_date: string;
    scheduled_time: string | null;
    [key: string]: unknown;
  }
  export type CheckinReservationResponse = { reservation: ReservationRow };
  export type StartReservationResponse = { reservation: ReservationRow };
  export type CompleteReservationResponse = { reservation: ReservationRow };

  // ── NFCタグ ─────────────────────────────────────────
  export interface NfcTagRow {
    id: string;
    status: "prepared" | "written" | "attached" | "lost" | "retired" | "error";
    uid: string | null;
    certificate_id: string | null;
    tag_code?: string;
    written_at?: string | null;
    attached_at?: string | null;
  }
  export type WriteNfcTagResponse = { nfc_tag: NfcTagRow };
  export type AttachNfcTagResponse = { nfc_tag: NfcTagRow };
  export type UpdateNfcTagStatusResponse = { nfc_tag: NfcTagRow };

  // ── POS Terminal (Stripe) ───────────────────────────
  export type ConnectionTokenResponse = { secret: string };
  export type TerminalLocationResponse = { location_id: string };
  export type CreatePaymentIntentResponse = {
    client_secret: string;
    payment_intent_id: string;
  };
  export type CapturePaymentResponse = Record<string, unknown>;
  export type QrCheckoutSessionResponse = {
    url: string;
    session_id: string;
  };
  export type QrCheckoutStatusResponse = {
    status: "open" | "complete" | "expired" | "paid";
  };
}
