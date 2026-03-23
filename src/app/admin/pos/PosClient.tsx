"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { formatJpy, formatDate } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";

/* ────────────────────────────────────────────── */
/*  Types                                         */
/* ────────────────────────────────────────────── */

interface Reservation {
  id: string;
  title: string;
  status: string;
  payment_status: string | null;
  scheduled_date: string | null;
  start_time: string | null;
  end_time: string | null;
  estimated_amount: number | null;
  customer_name: string | null;
  customer_id: string | null;
  vehicle_info: string | null;
  vehicle_id: string | null;
  menu_items_json: MenuItemRef[] | null;
  note: string | null;
}

interface MenuItemRef {
  menu_item_id?: string;
  name: string;
  unit_price?: number;
  price?: number;
  quantity?: number;
}

interface MasterMenuItem {
  id: string;
  name: string;
  unit_price: number;
  tax_category: number;
  is_active: boolean;
  unit: string | null;
}

interface CartItem {
  id: string; // menu_item_id or generated key
  name: string;
  unit_price: number;
  quantity: number;
  amount: number;
}

interface ReservationsData {
  reservations: Reservation[];
  stats?: { total?: number; today?: number; active?: number };
}

interface MenuItemsData {
  menuItems: MasterMenuItem[];
}

interface CheckoutResult {
  payment_id: string;
  document_id: string | null;
  amount: number;
  change: number;
  doc_number: string | null;
  status: string;
}

/* ────────────────────────────────────────────── */
/*  Constants                                     */
/* ────────────────────────────────────────────── */

type PosMode = "reservation" | "walkin";

const PAYMENT_METHODS = [
  { value: "cash", label: "現金", icon: "💴" },
  { value: "card", label: "カード", icon: "💳" },
  { value: "qr", label: "QR決済", icon: "📱" },
  { value: "bank_transfer", label: "振込", icon: "🏦" },
  { value: "other", label: "その他", icon: "📋" },
] as const;

const RESERVATION_STATUS_MAP: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info" | "violet"; label: string }> = {
  confirmed: { variant: "info", label: "確定" },
  arrived: { variant: "violet", label: "来店" },
  in_progress: { variant: "warning", label: "作業中" },
  completed: { variant: "success", label: "完了" },
  cancelled: { variant: "default", label: "取消" },
};

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

export default function PosClient() {
  // ── Mode ──
  const [mode, setMode] = useState<PosMode>("reservation");

  // ── Data fetch ──
  const { data, isLoading, mutate } = useSWR<ReservationsData>(
    "/api/admin/reservations?status=arrived,in_progress,completed&limit=200",
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 15_000, keepPreviousData: true },
  );

  const { data: menuData } = useSWR<MenuItemsData>(
    "/api/admin/menu-items",
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const reservations = data?.reservations ?? [];
  const masterMenuItems = useMemo(
    () => (menuData?.menuItems ?? []).filter((mi) => mi.is_active),
    [menuData],
  );

  const unpaidReservations = useMemo(
    () => reservations.filter((r) => !r.payment_status || r.payment_status === "unpaid"),
    [reservations],
  );

  const paidReservations = useMemo(
    () => reservations.filter((r) => r.payment_status === "paid"),
    [reservations],
  );

  // ── State ──
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState("");

  // ── Cart from reservation or manual ──
  const checkoutItems = useMemo((): CartItem[] => {
    if (mode === "reservation" && selected?.menu_items_json) {
      return selected.menu_items_json.map((mi, i) => ({
        id: mi.menu_item_id ?? `res-${i}`,
        name: mi.name,
        unit_price: mi.unit_price ?? mi.price ?? 0,
        quantity: mi.quantity ?? 1,
        amount: (mi.quantity ?? 1) * (mi.unit_price ?? mi.price ?? 0),
      }));
    }
    return cart;
  }, [mode, selected, cart]);

  const amount = useMemo(
    () => checkoutItems.reduce((s, item) => s + item.amount, 0),
    [checkoutItems],
  );

  const received = receivedAmount ? parseInt(receivedAmount, 10) : amount;
  const change = paymentMethod === "cash" ? Math.max(0, received - amount) : 0;

  // Filtered menu items for search
  const filteredMenuItems = useMemo(() => {
    if (!menuSearch) return masterMenuItems;
    const q = menuSearch.toLowerCase();
    return masterMenuItems.filter((mi) => mi.name.toLowerCase().includes(q));
  }, [masterMenuItems, menuSearch]);

  // ── Cart actions ──
  const addToCart = useCallback((mi: MasterMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === mi.id);
      if (existing) {
        return prev.map((c) =>
          c.id === mi.id
            ? { ...c, quantity: c.quantity + 1, amount: (c.quantity + 1) * c.unit_price }
            : c,
        );
      }
      return [...prev, { id: mi.id, name: mi.name, unit_price: mi.unit_price, quantity: 1, amount: mi.unit_price }];
    });
  }, []);

  const updateCartQuantity = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.id !== id));
    } else {
      setCart((prev) =>
        prev.map((c) => (c.id === id ? { ...c, quantity: qty, amount: qty * c.unit_price } : c)),
      );
    }
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  // Reset form on mode/selection change
  useEffect(() => {
    setPaymentMethod("cash");
    setReceivedAmount("");
    setNote("");
    setResult(null);
    setError(null);
  }, [selected?.id, mode]);

  // Clear selection when switching modes
  useEffect(() => {
    setSelected(null);
    setCart([]);
    setResult(null);
  }, [mode]);

  // ── Checkout ──
  const canCheckout =
    amount > 0 &&
    !processing &&
    (paymentMethod !== "cash" || received >= amount) &&
    (mode === "walkin" || selected !== null);

  const handleCheckout = useCallback(async () => {
    if (!canCheckout) return;
    setProcessing(true);
    setError(null);
    try {
      const itemsJson = checkoutItems.map((ci) => ({
        description: ci.name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        amount: ci.amount,
      }));
      const res = await fetch("/api/admin/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservation_id: mode === "reservation" ? selected?.id : undefined,
          customer_id: mode === "reservation" ? selected?.customer_id : undefined,
          payment_method: paymentMethod,
          amount,
          received_amount: paymentMethod === "cash" ? received : undefined,
          items_json: itemsJson,
          tax_rate: 10,
          note: note || undefined,
          create_receipt: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
      setResult(j);
      if (mode === "reservation") await mutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "会計処理に失敗しました");
    } finally {
      setProcessing(false);
    }
  }, [canCheckout, checkoutItems, mode, selected, paymentMethod, amount, received, note, mutate]);

  const handleNextCheckout = useCallback(() => {
    setSelected(null);
    setCart([]);
    setResult(null);
    setError(null);
    setReceivedAmount("");
    setNote("");
  }, []);

  // ── Shared checkout panel (right side) ──
  const renderCheckoutPanel = () => {
    if (result) {
      return (
        <div className="glass-card space-y-4 rounded-2xl p-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success-dim">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-success-text">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-primary">会計完了</h3>
            <p className="mt-1 text-sm text-secondary">
              {result.doc_number && <>領収書: {result.doc_number}</>}
            </p>
          </div>
          <div className="space-y-2 rounded-xl bg-surface-hover p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">お会計</span>
              <span className="font-semibold">{formatJpy(result.amount)}</span>
            </div>
            {result.change > 0 && (
              <div className="flex justify-between">
                <span className="text-secondary">お釣り</span>
                <span className="font-semibold text-accent">{formatJpy(result.change)}</span>
              </div>
            )}
          </div>
          <button type="button" onClick={handleNextCheckout} className="btn-primary w-full rounded-xl py-3 text-sm font-medium">
            次の会計へ
          </button>
        </div>
      );
    }

    const hasItems = checkoutItems.length > 0;
    const showForm = mode === "walkin" ? hasItems : selected !== null;

    if (!showForm) {
      return (
        <div className="glass-card flex min-h-[300px] items-center justify-center rounded-2xl p-6 text-center">
          <div>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} className="mx-auto mb-3 text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
            <p className="text-sm text-muted">
              {mode === "reservation" ? "左の一覧から予約を選択してください" : "左の品目一覧から品目を追加してください"}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="glass-card space-y-5 rounded-2xl p-6">
        {/* Header */}
        <div>
          <h3 className="text-base font-semibold text-primary">
            {mode === "reservation" ? (selected?.title || "無題") : "ウォークイン会計"}
          </h3>
          {mode === "reservation" && selected?.customer_name && (
            <p className="mt-0.5 text-xs text-secondary">{selected.customer_name}</p>
          )}
        </div>

        {/* Items */}
        {checkoutItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-secondary">明細</span>
              {mode === "walkin" && (
                <button type="button" onClick={clearCart} className="text-xs text-danger-text hover:underline">
                  全削除
                </button>
              )}
            </div>
            <div className="space-y-1 rounded-xl bg-surface-hover p-3">
              {checkoutItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="flex-1 text-primary">
                    {item.name}
                    {mode === "walkin" ? (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-border-subtle text-xs text-secondary hover:bg-surface"
                        >
                          -
                        </button>
                        <span className="min-w-[1.5rem] text-center text-xs text-secondary">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-border-subtle text-xs text-secondary hover:bg-surface"
                        >
                          +
                        </button>
                      </span>
                    ) : (
                      item.quantity > 1 && <span className="ml-1 text-xs text-secondary">x{item.quantity}</span>
                    )}
                  </span>
                  <span className="font-medium">{formatJpy(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between border-t border-border-subtle pt-3">
          <span className="text-sm font-medium text-secondary">合計</span>
          <span className="text-2xl font-bold text-primary">{formatJpy(amount)}</span>
        </div>

        {/* Payment method */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-secondary">支払方法</span>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => setPaymentMethod(pm.value)}
                className={`rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition-colors ${
                  paymentMethod === pm.value
                    ? "border-accent bg-accent-dim text-accent"
                    : "border-border-subtle bg-surface text-secondary hover:border-border"
                }`}
              >
                <span className="block text-base">{pm.icon}</span>
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Received amount (cash only) */}
        {paymentMethod === "cash" && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-secondary">預り金額</span>
            <input
              type="number"
              inputMode="numeric"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              placeholder={String(amount)}
              className="w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 text-right text-lg font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex flex-wrap gap-1.5">
              {[1000, 5000, 10000, 50000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setReceivedAmount(String(v))}
                  className="rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-xs text-secondary transition-colors hover:border-border hover:text-primary"
                >
                  {formatJpy(v)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setReceivedAmount(String(amount))}
                className="rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-xs text-secondary transition-colors hover:border-border hover:text-primary"
              >
                ぴったり
              </button>
            </div>
            {change > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-accent-dim px-4 py-2.5">
                <span className="text-sm text-accent">お釣り</span>
                <span className="text-lg font-bold text-accent">{formatJpy(change)}</span>
              </div>
            )}
          </div>
        )}

        {/* Note */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-secondary">メモ（任意）</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="備考を入力"
            className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-danger-dim px-4 py-2.5 text-sm text-danger-text">{error}</div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleCheckout}
          disabled={!canCheckout}
          className="btn-primary w-full rounded-xl py-3.5 text-base font-semibold disabled:opacity-40"
        >
          {processing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              処理中...
            </span>
          ) : (
            `${formatJpy(amount)} を会計する`
          )}
        </button>
      </div>
    );
  };

  // ── Main render ──
  return (
    <div className="space-y-6">
      <PageHeader title="POS 会計" tag="POS" description="予約またはウォークインの会計処理を行います" />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="未会計" value={unpaidReservations.length} />
        <StatCard label="本日会計済" value={paidReservations.length} />
        <StatCard
          label="本日売上"
          value={formatJpy(paidReservations.reduce((s, r) => s + (r.estimated_amount ?? 0), 0))}
        />
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 rounded-xl bg-surface-hover p-1">
        <button
          type="button"
          onClick={() => setMode("reservation")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === "reservation" ? "bg-surface text-primary shadow-sm" : "text-secondary hover:text-primary"
          }`}
        >
          予約から会計
        </button>
        <button
          type="button"
          onClick={() => setMode("walkin")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === "walkin" ? "bg-surface text-primary shadow-sm" : "text-secondary hover:text-primary"
          }`}
        >
          予約なし会計
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ── Left panel ── */}
        <div className="flex-1 space-y-3">
          {mode === "reservation" ? (
            <>
              <h2 className="text-sm font-semibold text-secondary">未会計の予約</h2>
              {isLoading && !data ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-hover" />
                  ))}
                </div>
              ) : unpaidReservations.length === 0 ? (
                <div className="rounded-xl border border-border-subtle bg-surface p-8 text-center text-sm text-muted">
                  未会計の予約はありません
                </div>
              ) : (
                <div className="space-y-2">
                  {unpaidReservations.map((r) => {
                    const isSelected = selected?.id === r.id;
                    const statusEntry = RESERVATION_STATUS_MAP[r.status] ?? { variant: "default" as const, label: r.status };
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelected(isSelected ? null : r)}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-accent bg-accent-dim shadow-sm"
                            : "border-border-subtle bg-surface hover:border-border hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-primary">{r.title || "無題"}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={statusEntry.variant}>{statusEntry.label}</Badge>
                            <span className="text-sm font-semibold text-primary">{formatJpy(r.estimated_amount)}</span>
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary">
                          {r.scheduled_date && <span>{formatDate(r.scheduled_date)}</span>}
                          {r.start_time && <span>{r.start_time}〜{r.end_time ?? ""}</span>}
                          {r.customer_name && <span>{r.customer_name}</span>}
                          {r.vehicle_info && <span>{r.vehicle_info}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-secondary">品目を選択</h2>
              {/* Search */}
              <input
                type="text"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="品目名で検索..."
                className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {/* Menu items grid */}
              {filteredMenuItems.length === 0 ? (
                <div className="rounded-xl border border-border-subtle bg-surface p-8 text-center text-sm text-muted">
                  {masterMenuItems.length === 0 ? "品目マスタが未登録です" : "該当する品目がありません"}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {filteredMenuItems.map((mi) => {
                    const inCart = cart.find((c) => c.id === mi.id);
                    return (
                      <button
                        key={mi.id}
                        type="button"
                        onClick={() => addToCart(mi)}
                        className={`relative rounded-xl border p-3 text-left transition-all ${
                          inCart
                            ? "border-accent bg-accent-dim"
                            : "border-border-subtle bg-surface hover:border-border hover:shadow-sm"
                        }`}
                      >
                        <span className="block text-sm font-medium text-primary">{mi.name}</span>
                        <span className="mt-0.5 block text-xs text-secondary">{formatJpy(mi.unit_price)}</span>
                        {inCart && (
                          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                            {inCart.quantity}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: Checkout panel ── */}
        <div className="w-full lg:w-96">
          <div className="sticky top-6 space-y-4">{renderCheckoutPanel()}</div>
        </div>
      </div>
    </div>
  );
}
