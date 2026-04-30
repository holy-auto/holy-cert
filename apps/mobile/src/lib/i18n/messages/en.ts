import type { Messages } from "./ja";

/**
 * 英語メッセージ。日本語版と同じ構造を保つこと（型でガード）。
 * 現状の業務スコープでは ja のみ運用、en はスケルトンとして用意。
 */
export const en: Messages = {
  common: {
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    retry: "Retry",
    delete: "Delete",
    edit: "Edit",
    back: "Back",
    loading: "Loading...",
    error: "An error occurred",
    success: "Done",
  },
  home: {
    today_reservations: "Today's Reservations",
    active_work: "In Progress",
    awaiting_payment: "Awaiting Payment",
    today_payments: "Today's Payments",
    quick_actions: "Quick Actions",
    sales_last_7_days: "Sales (Last 7 Days)",
  },
  pos: {
    register_open: "Open Register",
    register_close: "Close Register",
    cash: "Cash",
    card: "Card",
    qr: "QR",
    bank_transfer: "Bank Transfer",
    receipt: "Receipt",
    payment_complete: "Payment Complete",
    tap_to_pay: "Pay with Tap to Pay",
    tap_card_now: "Tap your card now",
  },
  nfc: {
    write_start: "Start Writing",
    writing: "Writing...",
    verifying: "Verifying...",
    locking: "Locking...",
    success: "Write & Lock Complete",
    lost: "Lost",
    retired: "Retired",
  },
  auth: {
    sign_in: "Sign In",
    email: "Email",
    password: "Password",
    select_store: "Select Store",
  },
};
