import Link from "next/link";

export const metadata = {
  title: "利用規約 | HOLY-CERT",
};

const sections = [
  {
    title: "第1条（適用）",
    content: `本規約は、HOLY-CERT（以下「当社」）が提供する WEB施工証明書サービス及び HolyMarket（以下「本サービス」）の利用に関する条件を定めるものです。
ご利用者（以下「ユーザー」）は本規約に同意の上、本サービスをご利用ください。`,
  },
  {
    title: "第2条（利用登録）",
    content: `本サービスの利用を希望する方は、当社の定める方法により利用登録を申請し、当社が承認することで利用登録が完了します。
当社は、以下の場合に利用登録を拒否することがあります。
・虚偽の情報を登録した場合
・反社会的勢力と関係がある場合
・その他、当社が不適当と判断した場合`,
  },
  {
    title: "第3条（料金・支払い）",
    content: `本サービスの有料プランをご利用の場合、当社が定める料金をお支払いいただきます。
支払いは、当社が指定する決済サービス（Stripe等）を通じて行われます。
月額プランは、解約手続きを行うまで自動更新されます。`,
  },
  {
    title: "第4条（禁止事項）",
    content: `ユーザーは以下の行為を行ってはなりません。
・法令または公序良俗に違反する行為
・当社または第三者の知的財産権を侵害する行為
・虚偽の情報を入力・送信する行為
・不正アクセスまたはシステムへの攻撃行為
・本サービスを通じたスパムまたは迷惑行為
・その他、当社が不適切と判断する行為`,
  },
  {
    title: "第5条（サービスの停止・変更）",
    content: `当社は、以下の場合に事前通知なくサービスを停止・変更することがあります。
・システムの保守・更新が必要な場合
・天災・事変その他不可抗力による場合
・その他、当社が必要と判断した場合`,
  },
  {
    title: "第6条（免責事項）",
    content: `当社は、本サービスの利用によってユーザーに生じた損害について、当社の故意または重過失による場合を除き、責任を負いません。
本サービスはシステム障害・メンテナンス等により一時的に利用できない場合があります。`,
  },
  {
    title: "第7条（知的財産権）",
    content: `本サービスに関する知的財産権は、当社または正当な権利者に帰属します。
ユーザーが本サービスに投稿したデータの権利はユーザーに帰属しますが、サービス提供に必要な範囲で当社が利用できるものとします。`,
  },
  {
    title: "第8条（個人情報）",
    content: `個人情報の取り扱いについては、別途定めるプライバシーポリシーに従います。`,
  },
  {
    title: "第9条（退会・解約）",
    content: `ユーザーはいつでも退会・解約の手続きを行うことができます。
解約後のデータ保持期間については、当社が別途定める規定に従います。`,
  },
  {
    title: "第10条（規約の変更）",
    content: `当社は本規約を変更する場合、本サービス上で通知します。
変更後に本サービスをご利用いただいた場合、変更後の規約に同意したものとみなします。`,
  },
  {
    title: "第11条（準拠法・管轄）",
    content: `本規約の解釈は日本法に準拠するものとし、本サービスに関する一切の紛争については、当社所在地を管轄する裁判所を専属的合意管轄裁判所とします。`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans">
      <div className="mx-auto max-w-3xl px-6 py-16 space-y-12">
        <div className="space-y-3">
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-700 transition">
            ← トップへ戻る
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            利用規約
          </h1>
          <p className="text-sm text-neutral-500">最終更新日：2026年3月13日</p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-8 space-y-8">
          {sections.map((s) => (
            <div key={s.title} className="space-y-2">
              <h2 className="text-base font-semibold text-neutral-900">{s.title}</h2>
              <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{s.content}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-neutral-400">
          <Link href="/privacy" className="hover:text-neutral-700 transition">プライバシーポリシー</Link>
          <Link href="/legal" className="hover:text-neutral-700 transition">特定商取引法に基づく表示</Link>
        </div>
      </div>
    </div>
  );
}
