import { createAdminClient } from "@/lib/supabase/admin";

// ──────────────────────────────────────────
// Resend 経由でメールを送信（fetch 直接呼び出し）
// ──────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  const from = (process.env.RESEND_FROM ?? "").trim();

  if (!apiKey || !from) {
    // 環境変数未設定の場合はログだけ出してスキップ（本番前でも動作させるため）
    console.warn("[market/email] RESEND_API_KEY or RESEND_FROM not set, skipping email to", to);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[market/email] Resend failed", res.status, body);
    // メール失敗はサイレント（業務フローを止めない）
  }
}

// ──────────────────────────────────────────
// ディーラーのメールアドレスを取得
// dealer_users → auth.users 経由で取得
// ──────────────────────────────────────────
async function getDealerEmail(dealerId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: dealerUser } = await admin
    .from("dealer_users")
    .select("user_id")
    .eq("dealer_id", dealerId)
    .eq("role", "admin")
    .limit(1)
    .single();

  if (!dealerUser) return null;

  const { data: authUser } = await admin.auth.admin.getUserById(dealerUser.user_id);
  return authUser?.user?.email ?? null;
}

// ──────────────────────────────────────────
// 共通ヘルパー: HTML レイアウト
// ──────────────────────────────────────────
function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">
    <div style="margin-bottom:24px;">
      <span style="font-size:20px;font-weight:700;color:#1d4ed8;">HolyMarket</span>
      <span style="font-size:11px;color:#6b7280;margin-left:8px;">BtoB中古車在庫共有プラットフォーム</span>
    </div>
    ${body}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af;">
      このメールは HolyMarket から自動送信されています。
    </div>
  </div>
</body>
</html>`;
}

function actionButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:10px 24px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${label}</a>`;
}

function vehicleTitle(make: string, model: string, year?: number | null): string {
  return year ? `${make} ${model}（${year}年）` : `${make} ${model}`;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// ──────────────────────────────────────────
// 通知送信関数
// ──────────────────────────────────────────

/**
 * 問い合わせ受信通知（出品業者へ）
 */
export async function notifyNewInquiry({
  toDealerId,
  fromCompany,
  make,
  model,
  year,
  inquiryId,
  messagePreview,
}: {
  toDealerId: string;
  fromCompany: string;
  make: string;
  model: string;
  year?: number | null;
  inquiryId: string;
  messagePreview: string;
}): Promise<void> {
  const email = await getDealerEmail(toDealerId);
  if (!email) return;

  const car = vehicleTitle(make, model, year);
  const subject = `【HolyMarket】${fromCompany} 様から問い合わせが届きました`;
  const html = wrapHtml(subject, `
    <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 8px;">新しい問い合わせが届きました</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">${fromCompany} 様から <strong>${car}</strong> への問い合わせです。</p>
    <div style="background:#f3f4f6;border-radius:8px;padding:16px;font-size:14px;color:#374151;">
      <p style="margin:0;white-space:pre-line;">${messagePreview.slice(0, 200)}${messagePreview.length > 200 ? "…" : ""}</p>
    </div>
    ${actionButton(`${BASE_URL}/market/inquiries/${inquiryId}`, "メッセージを確認する")}
  `);

  await sendEmail(email, subject, html);
}

/**
 * 返信通知（相手方へ）
 */
export async function notifyInquiryReply({
  toDealerId,
  fromCompany,
  make,
  model,
  year,
  inquiryId,
  messagePreview,
}: {
  toDealerId: string;
  fromCompany: string;
  make: string;
  model: string;
  year?: number | null;
  inquiryId: string;
  messagePreview: string;
}): Promise<void> {
  const email = await getDealerEmail(toDealerId);
  if (!email) return;

  const car = vehicleTitle(make, model, year);
  const subject = `【HolyMarket】${fromCompany} 様から返信が届きました`;
  const html = wrapHtml(subject, `
    <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 8px;">返信が届きました</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 20px;"><strong>${car}</strong> の問い合わせに ${fromCompany} 様から返信がありました。</p>
    <div style="background:#f3f4f6;border-radius:8px;padding:16px;font-size:14px;color:#374151;">
      <p style="margin:0;white-space:pre-line;">${messagePreview.slice(0, 200)}${messagePreview.length > 200 ? "…" : ""}</p>
    </div>
    ${actionButton(`${BASE_URL}/market/inquiries/${inquiryId}`, "返信する")}
  `);

  await sendEmail(email, subject, html);
}

/**
 * 商談開始通知（購入業者へ）
 */
export async function notifyDealStarted({
  buyerDealerId,
  sellerCompany,
  make,
  model,
  year,
  agreedPrice,
  dealId,
}: {
  buyerDealerId: string;
  sellerCompany: string;
  make: string;
  model: string;
  year?: number | null;
  agreedPrice?: number | null;
  dealId: string;
}): Promise<void> {
  const email = await getDealerEmail(buyerDealerId);
  if (!email) return;

  const car = vehicleTitle(make, model, year);
  const priceText = agreedPrice
    ? `合意価格: <strong>${(agreedPrice / 10000).toFixed(0)}万円</strong>`
    : "価格は商談でご確認ください";

  const subject = `【HolyMarket】${sellerCompany} 様との商談が開始されました`;
  const html = wrapHtml(subject, `
    <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 8px;">商談が開始されました</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 20px;"><strong>${car}</strong> について ${sellerCompany} 様との商談が始まりました。</p>
    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:16px;font-size:14px;color:#92400e;">
      <p style="margin:0;">${priceText}</p>
    </div>
    ${actionButton(`${BASE_URL}/market/deals/${dealId}`, "商談の詳細を確認する")}
  `);

  await sendEmail(email, subject, html);
}

/**
 * 商談ステータス変更通知（両者へ）
 */
export async function notifyDealStatusChanged({
  dealId,
  make,
  model,
  year,
  newStatus,
  updaterCompany,
  buyerDealerId,
  sellerDealerId,
  updaterDealerId,
}: {
  dealId: string;
  make: string;
  model: string;
  year?: number | null;
  newStatus: "agreed" | "completed" | "cancelled";
  updaterCompany: string;
  buyerDealerId: string;
  sellerDealerId: string;
  updaterDealerId: string;
}): Promise<void> {
  const car = vehicleTitle(make, model, year);

  const STATUS_INFO: Record<string, { subject: string; heading: string; body: string; bg: string; border: string; text: string }> = {
    agreed: {
      subject: `【HolyMarket】${car} の商談が合意されました`,
      heading: "商談が合意されました",
      body: `<strong>${car}</strong> の商談が合意済みになりました。取引の完了手続きをお願いします。`,
      bg: "#f0fdf4", border: "#bbf7d0", text: "#166534",
    },
    completed: {
      subject: `【HolyMarket】${car} の取引が完了しました`,
      heading: "取引完了！",
      body: `<strong>${car}</strong> の取引が完了しました。ご利用ありがとうございます。`,
      bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af",
    },
    cancelled: {
      subject: `【HolyMarket】${car} の商談がキャンセルされました`,
      heading: "商談がキャンセルされました",
      body: `<strong>${car}</strong> の商談が ${updaterCompany} 様によりキャンセルされました。`,
      bg: "#fef2f2", border: "#fecaca", text: "#991b1b",
    },
  };

  const info = STATUS_INFO[newStatus];
  if (!info) return;

  const html = wrapHtml(info.subject, `
    <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 8px;">${info.heading}</h2>
    <div style="background:${info.bg};border:1px solid ${info.border};border-radius:8px;padding:16px;font-size:14px;color:${info.text};margin-bottom:0;">
      <p style="margin:0;">${info.body}</p>
    </div>
    ${actionButton(`${BASE_URL}/market/deals/${dealId}`, "商談の詳細を確認する")}
  `);

  // 更新者以外に通知（両者に送るが更新者はスキップ）
  const targets = [buyerDealerId, sellerDealerId].filter((id) => id !== updaterDealerId);

  await Promise.all(
    targets.map(async (dealerId) => {
      const email = await getDealerEmail(dealerId);
      if (email) await sendEmail(email, info.subject, html);
    })
  );
}
