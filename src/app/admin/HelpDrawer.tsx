"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Drawer from "@/components/ui/Drawer";

type GuideStep = {
  title: string;
  description: string;
};

type Guide = {
  id: string;
  icon: string;
  title: string;
  href?: string;
  steps: GuideStep[];
};

type GuideGroup = {
  id: string;
  label: string;
  guides: Guide[];
};

const GUIDE_GROUPS: GuideGroup[] = [
  {
    id: "daily",
    label: "日常業務",
    guides: [
      {
        id: "issue_certificate",
        icon: "🪪",
        title: "施工証明書を発行する",
        href: "/admin/certificates/new",
        steps: [
          {
            title: "車両を選択",
            description:
              "登録済みの車両から選択するか、その場で新規追加できます。前回の証明書から内容を引き継ぐことも可能。",
          },
          {
            title: "施工内容・写真を入力",
            description:
              "テンプレートの種別 (コーティング / PPF / 整備など) によって入力欄が変わります。Standard以上は AI 下書き・音声メモも利用可。",
          },
          {
            title: "発行ボタンを押す",
            description: "QRコードと公開URLが生成され、顧客にそのまま渡せます。発行後も無効化・複製・PDF出力が可能。",
          },
        ],
      },
      {
        id: "register_vehicle",
        icon: "🚗",
        title: "車両を登録する",
        href: "/admin/vehicles/new",
        steps: [
          {
            title: "車検証OCRを使う",
            description:
              "電子車検証の二次元コードをカメラで読むか画像をアップロード → メーカー・車種・年式・車体番号・ナンバー・サイズが自動入力されます。",
          },
          {
            title: "顧客を紐付け",
            description:
              "既存顧客から検索するか、その場で新規顧客を作成できます。後から /admin/vehicles/[id] で変更可能。",
          },
          {
            title: "登録 → 証明書発行へ",
            description: "車両詳細から「証明書発行」ボタンで車両IDを引き継いだまま発行画面に進めます。",
          },
        ],
      },
      {
        id: "register_customer",
        icon: "👤",
        title: "顧客を登録する",
        href: "/admin/customers",
        steps: [
          { title: "「新規追加」をクリック", description: "顧客一覧の右上にあるボタンから登録フォームを開きます。" },
          {
            title: "氏名・連絡先を入力",
            description: "氏名は必須、メール・電話・住所は任意。後から顧客詳細でいつでも編集できます。",
          },
          {
            title: "車両・証明書を紐付け",
            description:
              "顧客詳細画面の各タブから「+ 車両登録」「🪪 証明書発行」「💰 請求書作成」へ顧客IDを保ったまま進めます。",
          },
        ],
      },
      {
        id: "create_invoice",
        icon: "🧾",
        title: "請求書を作成する",
        href: "/admin/invoices",
        steps: [
          { title: "「新規作成」をクリック", description: "請求書管理ページの右上から入力フォームを開きます。" },
          {
            title: "顧客と品目を入力",
            description: "品目マスタから選択するか自由入力。証明書から金額を引き継ぐこともできます。",
          },
          {
            title: "発行 → 顧客に送付",
            description: "PDFダウンロードや共有リンク発行が可能。Stripe Connect 連携済みなら決済リンクも作成できます。",
          },
        ],
      },
      {
        id: "create_reservation",
        icon: "📅",
        title: "予約を登録する",
        href: "/admin/reservations",
        steps: [
          { title: "「+ 新規予約」をクリック", description: "予約管理ページの右上から入力フォームを開きます。" },
          {
            title: "日時・顧客・車両を設定",
            description: "施工メニューや作業時間を入力。Googleカレンダーと連携すれば自動的に同期されます。",
          },
          {
            title: "案件ワークフローへ",
            description:
              "予約詳細から「案件ワークフローを開く」を押すと、チェックイン → 作業 → 完了 → 請求 まで案内に沿って進められます。",
          },
        ],
      },
      {
        id: "walkin_job",
        icon: "🏃",
        title: "飛び込み案件を開始する",
        href: "/admin/jobs/new",
        steps: [
          {
            title: "タイトルを入力 (任意)",
            description: "デフォルトで「飛び込み案件 YYYY-MM-DD」が入っています。そのままでもOK。",
          },
          {
            title: "開始ステータスを選ぶ",
            description: "「来店・受付」または「作業中」を選択。あとから変更できます。",
          },
          {
            title: "顧客・車両は後付けOK",
            description: "案件作成後の画面で既存顧客の検索・新規作成・車両登録ができます。",
          },
        ],
      },
    ],
  },
  {
    id: "settings",
    label: "店舗・チーム設定",
    guides: [
      {
        id: "shop_info",
        icon: "🏬",
        title: "店舗情報を設定する",
        href: "/admin/settings",
        steps: [
          {
            title: "メール・電話・住所を入力",
            description: "証明書PDFや請求書に自動表示されます。連絡先が空欄だと信頼感が下がるので入力推奨。",
          },
          {
            title: "Webサイト URL",
            description: "顧客向けの公開証明書ページに「店舗サイトを見る」リンクとして掲載されます。",
          },
          {
            title: "適格請求書登録番号 (T+13桁)",
            description: "インボイス制度対応の請求書を発行するために必要。未登録の場合は空欄で OK。",
          },
        ],
      },
      {
        id: "logo",
        icon: "🎨",
        title: "ロゴをアップロードする",
        href: "/admin/logo",
        steps: [
          {
            title: "推奨サイズ",
            description: "1:1 (正方形) または 横長 4:1 程度を推奨。背景透過 PNG が綺麗に出ます。",
          },
          {
            title: "ファイルを選択",
            description: "ドラッグ&ドロップ、もしくは「ファイルを選択」から PNG/JPG をアップロード。",
          },
          {
            title: "証明書PDFに自動反映",
            description: "アップロード後に発行する証明書から右上にロゴが入ります。既存証明書は再生成で反映可能。",
          },
        ],
      },
      {
        id: "bank_invoice",
        icon: "💳",
        title: "振込先・インボイス番号を設定する",
        href: "/admin/settings",
        steps: [
          {
            title: "店舗設定 → 口座情報",
            description: "銀行名・支店・口座種別・口座番号・口座名義を入力。請求書PDFの振込先欄に自動印字されます。",
          },
          {
            title: "店舗設定 → インボイス設定",
            description: "適格請求書発行事業者の T+13桁の登録番号を入力。発行する請求書に自動表示されます。",
          },
        ],
      },
      {
        id: "stripe_connect",
        icon: "💰",
        title: "Stripe Connect を連携する",
        href: "/admin/settings",
        steps: [
          {
            title: "店舗設定 → Stripe Connect",
            description: "「連携を開始」を押すと Stripe の本人確認手続き画面に遷移します。",
          },
          {
            title: "本人確認を完了",
            description: "Stripe 側のフォームに事業者情報を入力。完了すると Ledra に戻り「連携済み」と表示されます。",
          },
          {
            title: "請求書から決済リンクを送る",
            description:
              "請求書詳細から「決済リンクを作成」で顧客にカード決済リンクを送れます。入金は自動的に Ledra にも反映されます。",
          },
        ],
      },
      {
        id: "invite_member",
        icon: "👥",
        title: "スタッフを招待する",
        href: "/admin/members",
        steps: [
          {
            title: "メールアドレスと表示名を入力",
            description: "招待先のメールアドレスと表示名を入れます。違うドメインでも招待OK。",
          },
          {
            title: "ロールを選択",
            description: "管理者は全機能、スタッフは日常業務 (証明書・予約・顧客) のみ。後から変更可能。",
          },
          {
            title: "招待先がパスワードを設定",
            description: "招待されたユーザーは案内に従ってサインアップしログインできます。",
          },
        ],
      },
    ],
  },
  {
    id: "advanced",
    label: "便利機能",
    guides: [
      {
        id: "command_palette",
        icon: "⌨️",
        title: "Cmd+K で素早く移動・検索",
        steps: [
          { title: "どの画面でも Cmd+K (Mac) / Ctrl+K (Win)", description: "コマンドパレットが開きます。" },
          {
            title: "ページ名・顧客名・証明書ID で検索",
            description: "入力するとマッチする項目がリアルタイム表示。Enter で開きます。",
          },
          { title: "矢印キーで選択、Esc で閉じる", description: "マウスを使わずに最短経路でページ移動できます。" },
        ],
      },
      {
        id: "service_timeline",
        icon: "🕒",
        title: "車両の施工履歴を一覧で見る",
        steps: [
          { title: "車両詳細を開く", description: "/admin/vehicles/[id] へ移動します。" },
          {
            title: "サービス履歴タイムライン",
            description: "証明書発行・予約・NFC書込み・履歴を1本の時系列で表示。色分けバッジで識別。",
          },
          {
            title: "クリックで該当画面へ",
            description: "証明書イベントは公開証明書、予約イベントは案件ワークフローへ即遷移。",
          },
        ],
      },
      {
        id: "customer_360",
        icon: "🧭",
        title: "顧客の360°ビューで横断管理",
        steps: [
          { title: "顧客詳細を開く", description: "/admin/customers/[id] へ移動します。" },
          {
            title: "車両・証明書・予約・請求のタブ",
            description: "1人のお客様に紐付くデータを横断表示。並列取得で高速。",
          },
          {
            title: "右上のクイックアクション",
            description:
              "「+ 車両登録」「🪪 証明書発行」「💰 請求書作成」「🏃 飛び込み案件」を顧客コンテキストを保ったまま起動。",
          },
        ],
      },
    ],
  },
];

const TOUR_DONE_KEY = "ledra_tour_done";
const GUIDE_KEY_PREFIX = "ledra_guide_";

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpDrawer({ open, onClose }: HelpDrawerProps) {
  const router = useRouter();
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const replayTour = () => {
    try {
      localStorage.removeItem(TOUR_DONE_KEY);
    } catch {
      /* noop */
    }
    onClose();
    router.push("/admin");
    // /admin にすでに居る場合 router.push は no-op になるのでリロードして tour を起動させる
    setTimeout(() => {
      if (window.location.pathname === "/admin") window.location.reload();
    }, 50);
  };

  const resetAllInlineGuides = () => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(GUIDE_KEY_PREFIX));
      keys.forEach((k) => localStorage.removeItem(k));
      setResetMsg(`${keys.length} 個のガイドを再表示します。次回それぞれの画面で表示されます。`);
      setTimeout(() => setResetMsg(null), 4000);
    } catch {
      setResetMsg("リセットに失敗しました。");
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="操作ガイド">
      <div className="space-y-6">
        {/* Quick start */}
        <section className="rounded-xl border border-accent/30 bg-accent-dim/30 p-4 space-y-3">
          <div className="text-sm font-semibold text-primary flex items-center gap-2">
            <span aria-hidden>🚀</span>
            クイックスタート
          </div>
          <p className="text-xs text-muted leading-relaxed">
            初回ツアーをもう一度見たり、各画面のヒントを再表示したりできます。
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={replayTour} className="btn-primary text-xs px-3 py-1.5">
              ツアーを再生
            </button>
            <button type="button" onClick={resetAllInlineGuides} className="btn-secondary text-xs px-3 py-1.5">
              ヒントを再表示
            </button>
          </div>
          {resetMsg && <p className="text-xs text-success">{resetMsg}</p>}
        </section>

        {/* Guide groups */}
        {GUIDE_GROUPS.map((group) => (
          <section key={group.id} className="space-y-2">
            <h3 className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">{group.label}</h3>
            <ul className="space-y-1.5">
              {group.guides.map((guide) => {
                const isOpen = openGuide === guide.id;
                return (
                  <li
                    key={guide.id}
                    className={`rounded-lg border transition-colors ${
                      isOpen ? "border-accent/40 bg-accent-dim/20" : "border-border-default bg-surface-hover/30"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenGuide(isOpen ? null : guide.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <span className="text-lg shrink-0" aria-hidden>
                        {guide.icon}
                      </span>
                      <span className="flex-1 text-sm font-medium text-primary">{guide.title}</span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border-subtle">
                        <ol className="space-y-2 mt-2">
                          {guide.steps.map((step, idx) => (
                            <li key={idx} className="flex gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-primary">{step.title}</div>
                                <div className="text-[11px] text-muted leading-relaxed mt-0.5">{step.description}</div>
                              </div>
                            </li>
                          ))}
                        </ol>
                        {guide.href && (
                          <Link
                            href={guide.href}
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 mt-1 text-xs text-accent hover:underline"
                          >
                            この画面を開く →
                          </Link>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {/* Support link */}
        <section className="rounded-xl border border-border-default bg-surface-hover/30 p-4">
          <div className="text-sm font-semibold text-primary mb-1">解決しないときは</div>
          <p className="text-xs text-muted leading-relaxed mb-3">
            運営チームへ直接お問い合わせいただけます。チャット感覚でメッセージを送れます。
          </p>
          <Link href="/admin/support" onClick={onClose} className="btn-secondary text-xs px-3 py-1.5 inline-block">
            サポートを開く →
          </Link>
        </section>
      </div>
    </Drawer>
  );
}
