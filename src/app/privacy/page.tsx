import Link from "next/link";

export const metadata = {
  title: "プライバシーポリシー | HOLY-CERT",
};

const sections = [
  {
    title: "1. 取得する情報",
    content: `本サービスでは、以下の情報を取得する場合があります。
・氏名、会社名、メールアドレスなどの登録情報
・車両情報（型式、ナンバー、車台番号等）
・施工内容・証明書に関するデータ
・サービス利用に伴うアクセスログ・操作履歴`,
  },
  {
    title: "2. 利用目的",
    content: `取得した情報は以下の目的で利用します。
・本サービスの提供・運営・改善
・お問い合わせ・サポート対応
・利用規約違反等の不正行為の調査
・サービスに関する重要なお知らせの通知`,
  },
  {
    title: "3. 第三者への提供",
    content: `当社は、以下の場合を除き、ご本人の同意なく個人情報を第三者に提供しません。
・法令に基づく場合
・人の生命・身体・財産の保護に必要な場合
・公衆衛生の向上または児童の健全な育成のために必要な場合
・国の機関等が法令の定める事務を遂行するために必要な場合`,
  },
  {
    title: "4. 業務委託",
    content: `サービス運営に必要な範囲で、業務委託先に個人情報を提供する場合があります。
その際は、委託先に対して適切な監督を行います。`,
  },
  {
    title: "5. 安全管理",
    content: `当社は、個人情報の漏えい・滅失・毀損を防止するため、適切な安全管理措置を講じます。
SSL/TLS 暗号化通信、アクセス権限の管理、定期的なセキュリティ評価を実施しています。`,
  },
  {
    title: "6. 開示・訂正・削除",
    content: `ご本人からの個人情報の開示・訂正・削除のご請求には、合理的な期間内に対応いたします。
お問い合わせは下記の連絡先までご連絡ください。`,
  },
  {
    title: "7. Cookie・アクセス解析",
    content: `本サービスでは、利便性向上のためCookieを使用する場合があります。
ブラウザの設定によりCookieを無効にすることができますが、一部機能が利用できなくなる場合があります。`,
  },
  {
    title: "8. プライバシーポリシーの変更",
    content: `本ポリシーは、必要に応じて改定することがあります。
重要な変更がある場合は、本サービス上で通知します。`,
  },
  {
    title: "9. お問い合わせ",
    content: `個人情報の取り扱いに関するお問い合わせは、サービス内のサポート窓口までご連絡ください。`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans">
      <div className="mx-auto max-w-3xl px-6 py-16 space-y-12">
        <div className="space-y-3">
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-700 transition">
            ← トップへ戻る
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            プライバシーポリシー
          </h1>
          <p className="text-sm text-neutral-500">最終更新日：2026年3月13日</p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-8 space-y-8">
          <p className="text-sm text-neutral-600 leading-relaxed">
            HOLY-CERT（以下「当社」）は、本サービスをご利用いただく皆様の個人情報の保護を重要な責務と考え、
            以下のとおりプライバシーポリシーを定めます。
          </p>

          {sections.map((s) => (
            <div key={s.title} className="space-y-2">
              <h2 className="text-base font-semibold text-neutral-900">{s.title}</h2>
              <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{s.content}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-neutral-400">
          <Link href="/terms" className="hover:text-neutral-700 transition">利用規約</Link>
          <Link href="/legal" className="hover:text-neutral-700 transition">特定商取引法に基づく表示</Link>
        </div>
      </div>
    </div>
  );
}
