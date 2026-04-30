/**
 * 日本語メッセージ。
 * 既存の日本語ベタ書きをこちらに集約していく。
 *
 * key 命名規則: <screen>.<element>.<state> のドット区切り
 *   common.* — 汎用 (ボタン、ステータス語彙)
 *   home.*   — ホーム画面
 *   pos.*    — POS関連
 *   nfc.*    — NFC関連
 *   auth.*   — ログイン/ストア選択
 */
export const ja: Messages = {
  common: {
    save: "保存",
    cancel: "キャンセル",
    confirm: "確認",
    retry: "再試行",
    delete: "削除",
    edit: "編集",
    back: "戻る",
    loading: "読み込み中...",
    error: "エラーが発生しました",
    success: "完了しました",
  },
  home: {
    today_reservations: "今日の予約",
    active_work: "作業中",
    awaiting_payment: "会計待ち",
    today_payments: "今日の決済",
    quick_actions: "クイックアクション",
    sales_last_7_days: "直近7日の売上",
  },
  pos: {
    register_open: "レジ開け",
    register_close: "レジ締め",
    cash: "現金",
    card: "カード",
    qr: "QR決済",
    bank_transfer: "振込",
    receipt: "レシート",
    payment_complete: "お支払い完了",
    tap_to_pay: "Tap to Pay で決済",
    tap_card_now: "カードをかざしてください",
  },
  nfc: {
    write_start: "書込み開始",
    writing: "書込み中...",
    verifying: "検証中...",
    locking: "ロック中...",
    success: "書込み・ロック完了",
    lost: "紛失",
    retired: "廃棄",
  },
  auth: {
    sign_in: "ログイン",
    email: "メールアドレス",
    password: "パスワード",
    select_store: "店舗を選択",
  },
};

export interface Messages {
  common: {
    save: string;
    cancel: string;
    confirm: string;
    retry: string;
    delete: string;
    edit: string;
    back: string;
    loading: string;
    error: string;
    success: string;
  };
  home: {
    today_reservations: string;
    active_work: string;
    awaiting_payment: string;
    today_payments: string;
    quick_actions: string;
    sales_last_7_days: string;
  };
  pos: {
    register_open: string;
    register_close: string;
    cash: string;
    card: string;
    qr: string;
    bank_transfer: string;
    receipt: string;
    payment_complete: string;
    tap_to_pay: string;
    tap_card_now: string;
  };
  nfc: {
    write_start: string;
    writing: string;
    verifying: string;
    locking: string;
    success: string;
    lost: string;
    retired: string;
  };
  auth: {
    sign_in: string;
    email: string;
    password: string;
    select_store: string;
  };
}
