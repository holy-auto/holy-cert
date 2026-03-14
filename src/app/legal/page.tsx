import Link from "next/link";

export const metadata = {
  title: "特定商取引法に基づく表示 | HOLY-CERT",
};

const items = [
  { label: "販売事業者名", value: "HOLY-CERT 運営事業者" },
  { label: "代表者名", value: "別途お問い合わせください" },
  { label: "所在地", value: "別途お問い合わせください" },
  { label: "電話番号", value: "お問い合わせフォームをご利用ください" },
  { label: "メールアドレス", value: "サービス内サポート窓口よりお問い合わせください" },
  { label: "サービス名", value: "HOLY-CERT（WEB施工証明書）/ HolyMarket（BtoB中古車在庫共有）" },
  {
    label: "販売価格",
    value: "各プランページに記載の通り（税込）\n・Miniプラン：月額料金は管理画面でご確認ください\n・Standardプラン：同上\n・Proプラン：同上",
  },
  {
    label: "支払方法",
    value: "クレジットカード決済（Visa / Mastercard / American Express / JCB）",
  },
  {
    label: "支払時期",
    value: "月額プランは毎月1日に翌月分を自動引き落とし",
  },
  {
    label: "サービス提供時期",
    value: "決済完了後、即時ご利用いただけます",
  },
  {
    label: "解約・キャンセル",
    value: "管理画面より随時解約可能です。解約後の当月末まで引き続きご利用いただけます。\nすでに支払済みの月額料金の返金はいたしかねます。",
  },
  {
    label: "返品・返金",
    value: "サービスの性質上、原則として返品・返金には応じておりません。\nシステム障害等、当社に起因する問題が発生した場合はこの限りではありません。",
  },
  {
    label: "動作環境",
    value: "最新バージョンの Chrome / Safari / Firefox / Edge を推奨します",
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans">
      <div className="mx-auto max-w-3xl px-6 py-16 space-y-12">
        <div className="space-y-3">
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-700 transition">
            ← トップへ戻る
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            特定商取引法に基づく表示
          </h1>
          <p className="text-sm text-neutral-500">最終更新日：2026年3月13日</p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={item.label}
                  className={i % 2 === 0 ? "bg-white" : "bg-neutral-50"}
                >
                  <th className="w-40 px-6 py-4 text-left font-medium text-neutral-700 align-top border-b border-neutral-100 whitespace-nowrap">
                    {item.label}
                  </th>
                  <td className="px-6 py-4 text-neutral-600 align-top border-b border-neutral-100 leading-relaxed whitespace-pre-line">
                    {item.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          ※ 上記の情報は、お問い合わせいただくことで詳細をご案内いたします。<br />
          電話番号等の掲載が必要な場合は、サポート窓口よりお申し出ください。
        </p>

        <div className="flex flex-wrap gap-4 text-xs text-neutral-400">
          <Link href="/privacy" className="hover:text-neutral-700 transition">プライバシーポリシー</Link>
          <Link href="/terms" className="hover:text-neutral-700 transition">利用規約</Link>
        </div>
      </div>
    </div>
  );
}
