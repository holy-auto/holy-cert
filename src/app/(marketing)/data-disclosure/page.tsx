/**
 * /data-disclosure
 *
 * 個人情報保護法 第 32 条「保有個人データに関する事項の公表」用ページ。
 * 内容は静的 (法令準拠の固定文言)。多言語化は将来課題。
 */

import type { Metadata } from "next";
import { Container } from "@/components/marketing/Container";

export const metadata: Metadata = {
  title: "保有個人データの取扱いに関する公表事項",
  description: "個人情報保護法 第 32 条に基づき、Ledra が取り扱う保有個人データに関する公表事項を掲載しています。",
  alternates: { canonical: "/data-disclosure" },
};

export default function DataDisclosurePage() {
  return (
    <Container className="prose prose-invert mx-auto max-w-3xl py-12">
      <h1>保有個人データの取扱いに関する公表事項</h1>
      <p>個人情報保護法 第 32 条第 1 項に基づき、Ledra が取り扱う保有個人データに関する事項を公表します。</p>

      <h2>1. 個人情報取扱事業者の名称・住所</h2>
      <p>
        各加盟店 (テナント) が取扱事業者となります。Ledra 運営会社は個人データの「処理者」として、
        加盟店からの委託に基づき個人データを処理します。
      </p>

      <h2>2. 利用目的</h2>
      <ul>
        <li>施工証明書の発行・交付</li>
        <li>顧客ポータル (マイページ) の提供</li>
        <li>予約管理および各種連絡</li>
        <li>請求・帳票発行</li>
        <li>サービス提供のための統計分析 (個人を特定しない形)</li>
      </ul>

      <h2>3. 取得する個人データの項目</h2>
      <ul>
        <li>氏名</li>
        <li>連絡先 (メール、電話番号末尾 4 桁のハッシュ)</li>
        <li>車両情報 (登録番号、車検情報)</li>
        <li>施工履歴・証明書記録</li>
        <li>決済情報 (Stripe 経由で取得 — Ledra はカード番号を保管しません)</li>
      </ul>

      <h2>4. 保有個人データの第三者提供</h2>
      <p>
        以下のサブプロセッサに対して、サービス提供に必要な範囲で個人データを提供します。 詳細は{" "}
        <code>docs/dpa-template.md</code> 第 5 条 をご参照ください。
      </p>
      <ul>
        <li>Supabase Inc. (DB / 認証)</li>
        <li>Vercel Inc. (アプリホスティング)</li>
        <li>Stripe Payments Japan K.K. (決済処理)</li>
        <li>Resend Inc. (メール配信)</li>
        <li>Cloudflare Inc. (CDN / 動画ストリーミング)</li>
      </ul>

      <h2>5. 開示等の請求手続</h2>
      <p>
        ご本人による以下の権利行使に対応します。手数料は <strong>無料</strong>。
      </p>
      <ul>
        <li>
          <strong>開示</strong> (アクセス権): 顧客ポータルの「データをダウンロード」から 即時取得いただけます。
        </li>
        <li>
          <strong>訂正</strong>: 顧客ポータルの「プロフィール」または施工店までご連絡ください。
        </li>
        <li>
          <strong>利用停止・消去</strong>: 顧客ポータルの「データ削除を請求する」から お申し込みいただけます (30
          日のクーリングオフ後に実行)。
        </li>
        <li>
          <strong>第三者提供記録の開示</strong>: 顧客ポータルの「監査ログ」をご確認ください。
        </li>
      </ul>

      <h2>6. 安全管理措置</h2>
      <ul>
        <li>通信の TLS 暗号化、保管時の AES-256 透過暗号化</li>
        <li>アクセス制御 (RBAC + 2要素認証)</li>
        <li>監査ログの保存・定期レビュー</li>
        <li>外部脆弱性診断の年次実施</li>
        <li>従業員教育の年次実施</li>
      </ul>

      <h2>7. 苦情の申出先</h2>
      <p>本サービスにおける個人データの取扱いに関する苦情は、以下のメールアドレスまたは 各加盟店宛にご連絡ください。</p>
      <p>
        <strong>連絡先</strong>: privacy@ledra.co.jp
      </p>

      <hr />
      <p className="text-sm text-muted">最終更新: 2026-05-03</p>
    </Container>
  );
}
