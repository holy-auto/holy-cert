"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import QRCode from "qrcode";
import { fetcher } from "@/lib/swr";
import { formatJpy, formatDate } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";

/* ────────────────────────────────────────────── */
/*  Types                                         */
/* ────────────────────────────────────────────── */

type PosMode = "reservation" | "walkin" | "invoice";

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
  menu_items_json: MenuItem[] | null;
  note: string | null;
}

interface MenuItem {
  menu_item_id?: string;
  name: string;
  unit_price?: number;
  price?: number;
  quantity?: number;
}

interface ReservationsData {
  reservations: Reservation[];
  stats?: { total?: number; today?: number; active?: number };
}

interface MasterMenuItem {
  id: string;
  name: string;
  unit_price: number;
  tax_category: string | null;
  is_active: boolean;
  unit: string | null;
}

interface MenuItemsData {
  items: MasterMenuItem[];
}

interface CartItem {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  amount: number;
}

interface CheckoutResult {
  payment_id: string;
  document_id: string | null;
  amount: number;
  change: number;
  doc_number: string | null;
  status: string;
}

interface InvoiceSummary {
  id: string;
  doc_number: string;
  recipient_name: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  total: number;
  subtotal: number;
  tax: number;
  tax_rate: number | null;
  status: string;
  issued_at: string | null;
  due_date: string | null;
  items_json: Array<{ description: string; quantity: number; unit_price: number; amount: number }> | null;
}

/* ────────────────────────────────────────────── */
/*  QR Code payment types                         */
/* ────────────────────────────────────────────── */
type QrStep = "idle" | "creating" | "showing" | "paid" | "recording" | "error";

/* ────────────────────────────────────────────── */
/*  Constants                                     */
/* ────────────────────────────────────────────── */

const PAYMENT_METHODS = [
  { value: "cash", label: "\u73FE\u91D1", icon: "\uD83D\uDCB4" },
  { value: "card", label: "\u30AB\u30FC\u30C9", icon: "\uD83D\uDCB3" },
  { value: "qr", label: "QR\u6C7A\u6E08", icon: "\uD83D\uDCF1" },
  { value: "bank_transfer", label: "\u632F\u8FBC", icon: "\uD83C\uDFE6" },
  { value: "other", label: "\u305D\u306E\u4ED6", icon: "\uD83D\uDCCB" },
] as const;

const RESERVATION_STATUS_MAP: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info" | "violet"; label: string }> = {
  confirmed: { variant: "info", label: "\u78BA\u5B9A" },
  arrived: { variant: "violet", label: "\u6765\u5E97" },
  in_progress: { variant: "warning", label: "\u4F5C\u696D\u4E2D" },
  completed: { variant: "success", label: "\u5B8C\u4E86" },
  cancelled: { variant: "default", label: "\u53D6\u6D88" },
};

const PAYMENT_STATUS_MAP: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info" | "violet"; label: string }> = {
  unpaid: { variant: "default", label: "\u672A\u4F1A\u8A08" },
  paid: { variant: "success", label: "\u4F1A\u8A08\u6E08" },
  partial: { variant: "warning", label: "\u4E00\u90E8" },
  refunded: { variant: "danger", label: "\u8FD4\u91D1\u6E08" },
};

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

export default function PosClient() {
  // ── Mode ──
  const [mode, setMode] = useState<PosMode>("reservation");

  // ── Data fetch: Reservations ──
  const { data, isLoading, mutate } = useSWR<ReservationsData>(
    "/api/admin/reservations?status=arrived,in_progress,completed&limit=200",
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 12_000 + Math.floor(Math.random() * 6_000), keepPreviousData: true },
  );

  const reservations = data?.reservations ?? [];

  const unpaidReservations = useMemo(
    () => reservations.filter((r) => !r.payment_status || r.payment_status === "unpaid"),
    [reservations],
  );

  const paidReservations = useMemo(
    () => reservations.filter((r) => r.payment_status === "paid"),
    [reservations],
  );

  // ── Data fetch: Menu items (walk-in) ──
  const { data: menuData, isLoading: menuLoading } = useSWR<MenuItemsData>(
    mode === "walkin" ? "/api/admin/menu-items" : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const masterMenuItems = useMemo(
    () => (menuData?.items ?? []).filter((mi) => mi.is_active),
    [menuData],
  );

  // ── State ──
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Invoice mode state ──
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceSearchBusy, setInvoiceSearchBusy] = useState(false);
  const [invoiceSearchError, setInvoiceSearchError] = useState<string | null>(null);
  const [loadedInvoice, setLoadedInvoice] = useState<InvoiceSummary | null>(null);

  // ── QR Code payment state ──
  const [qrStep, setQrStep] = useState<QrStep>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Mode switch reset ──
  const handleModeSwitch = useCallback((newMode: PosMode) => {
    setMode(newMode);
    setSelected(null);
    setCart([]);
    setMenuSearch("");
    setResult(null);
    setError(null);
    setPaymentMethod("cash");
    setReceivedAmount("");
    setNote("");
    setQrStep("idle");
    setQrDataUrl(null);
    setQrSessionId(null);
    setQrError(null);
    setInvoiceSearch("");
    setInvoiceSearchError(null);
    setLoadedInvoice(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // ── Invoice search ──
  const handleInvoiceSearch = useCallback(async () => {
    const q = invoiceSearch.trim();
    if (!q) return;
    setInvoiceSearchBusy(true);
    setInvoiceSearchError(null);
    setLoadedInvoice(null);
    try {
      const res = await fetch(`/api/admin/invoices?doc_number=${encodeURIComponent(q)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
      if (!j.found) {
        setInvoiceSearchError(`「${q}」が見つかりません`);
        return;
      }
      if (j.invoice.status === "paid") {
        setInvoiceSearchError(`「${q}」はすでに入金済みです`);
        return;
      }
      if (j.invoice.status === "cancelled") {
        setInvoiceSearchError(`「${q}」はキャンセル済みです`);
        return;
      }
      setLoadedInvoice(j.invoice);
    } catch (e) {
      setInvoiceSearchError(e instanceof Error ? e.message : "検索に失敗しました");
    } finally {
      setInvoiceSearchBusy(false);
    }
  }, [invoiceSearch]);

  // ── Filtered menu items ──
  const filteredMenuItems = useMemo(() => {
    if (!menuSearch.trim()) return masterMenuItems;
    const q = menuSearch.trim().toLowerCase();
    return masterMenuItems.filter((mi) => mi.name.toLowerCase().includes(q));
  }, [masterMenuItems, menuSearch]);

  // ── Cart helpers ──
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

  const updateCartQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.id !== id) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          return { ...c, quantity: newQty, amount: newQty * c.unit_price };
        })
        .filter(Boolean) as CartItem[],
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  // ── Checkout items (unified) ──
  const checkoutItems = useMemo(() => {
    if (mode === "walkin") {
      return cart.map((c) => ({
        description: c.name,
        quantity: c.quantity,
        unit_price: c.unit_price,
        amount: c.amount,
      }));
    }
    if (mode === "invoice") {
      return (loadedInvoice?.items_json ?? []).map((item) => ({
        description: item.description ?? "",
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? 0,
        amount: item.amount ?? 0,
      }));
    }
    // reservation mode
    if (!selected?.menu_items_json) return [];
    return selected.menu_items_json.map((mi) => ({
      description: mi.name,
      quantity: mi.quantity ?? 1,
      unit_price: mi.unit_price ?? mi.price ?? 0,
      amount: (mi.quantity ?? 1) * (mi.unit_price ?? mi.price ?? 0),
    }));
  }, [mode, cart, selected, loadedInvoice]);

  // ── Computed ──
  const amount = useMemo(() => {
    if (mode === "walkin") return cart.reduce((s, c) => s + c.amount, 0);
    if (mode === "invoice") return loadedInvoice?.total ?? 0;
    return selected?.estimated_amount ?? 0;
  }, [mode, cart, selected, loadedInvoice]);

  const received = receivedAmount ? parseInt(receivedAmount, 10) : amount;
  const change = paymentMethod === "cash" ? Math.max(0, received - amount) : 0;
  const hasSelection =
    mode === "reservation" ? !!selected : mode === "invoice" ? !!loadedInvoice : cart.length > 0;
  const canCheckout = amount > 0 && !processing && (paymentMethod !== "cash" || received >= amount);

  // Reset form when selection changes (reservation mode)
  useEffect(() => {
    if (mode !== "reservation") return;
    setPaymentMethod("cash");
    setReceivedAmount("");
    setNote("");
    setResult(null);
    setError(null);
    setQrStep("idle");
    setQrDataUrl(null);
    setQrSessionId(null);
    setQrError(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [selected?.id, mode]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── QR Code card payment flow ──
  const handleCardPaymentQr = useCallback(async () => {
    setQrStep("creating");
    setQrError(null);
    setQrDataUrl(null);
    setQrSessionId(null);

    try {
      // 1. Checkout Session 作成
      const description = checkoutItems.map((i) => i.description).join(", ") || (mode === "reservation" ? selected?.title : "\u30A6\u30A9\u30FC\u30AF\u30A4\u30F3\u4F1A\u8A08") || "POS\u4F1A\u8A08";
      const res = await fetch("/api/admin/pos/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          description,
          reservation_id: mode === "reservation" ? selected?.id : undefined,
          customer_id:
            mode === "reservation"
              ? selected?.customer_id
              : mode === "invoice"
                ? (loadedInvoice?.customer_id ?? undefined)
                : undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Checkout Session \u306E\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F");

      const sessionId = data.session_id as string;
      const checkoutUrl = data.url as string;

      // 2. QR\u30B3\u30FC\u30C9\u751F\u6210
      const qrUrl = await QRCode.toDataURL(checkoutUrl, {
        width: 250,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });

      setQrSessionId(sessionId);
      setQrDataUrl(qrUrl);
      setQrStep("showing");

      // 3. \u30DD\u30FC\u30EA\u30F3\u30B0\u958B\u59CB (2\u79D2\u9593\u9694, \u6700\u59275\u5206)
      let attempts = 0;
      const maxAttempts = 150; // 5\u5206 = 150 x 2\u79D2

      pollingRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setQrError("\u6C7A\u6E08\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002");
          setQrStep("error");
          return;
        }

        try {
          const statusRes = await fetch(`/api/admin/pos/checkout-session?id=${sessionId}`);
          if (!statusRes.ok) return;

          const statusData = await statusRes.json();

          if (statusData.payment_status === "paid") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setQrStep("paid");

            // 4. Ledra DB \u306B\u8A18\u9332
            setQrStep("recording");
            const checkoutRes = await fetch("/api/admin/pos/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reservation_id: mode === "reservation" ? selected?.id : undefined,
                customer_id:
                  mode === "reservation"
                    ? selected?.customer_id
                    : mode === "invoice"
                      ? (loadedInvoice?.customer_id ?? undefined)
                      : undefined,
                payment_method: "card",
                amount,
                items_json: checkoutItems,
                tax_rate: 10,
                note: note || undefined,
                create_receipt: true,
              }),
            });
            const checkoutData = await checkoutRes.json();
            if (!checkoutRes.ok) throw new Error(checkoutData?.error ?? "\u6C7A\u6E08\u306E\u8A18\u9332\u306B\u5931\u6557\u3057\u307E\u3057\u305F");

            setResult(checkoutData);
            if (mode === "invoice" && loadedInvoice) {
              await fetch("/api/admin/invoices", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: loadedInvoice.id,
                  status: "paid",
                  payment_date: new Date().toISOString().slice(0, 10),
                }),
              });
            }
            setQrStep("idle");
            await mutate();
          } else if (statusData.status === "expired") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setQrError("\u30BB\u30C3\u30B7\u30E7\u30F3\u304C\u671F\u9650\u5207\u308C\u306B\u306A\u308A\u307E\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002");
            setQrStep("error");
          }
        } catch {
          // \u30DD\u30FC\u30EA\u30F3\u30B0\u4E2D\u306E\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u30A8\u30E9\u30FC\u306F\u7121\u8996\u3057\u3066\u6B21\u56DE\u30EA\u30C8\u30E9\u30A4
        }
      }, 2000);
    } catch (e) {
      setQrError(e instanceof Error ? e.message : "QR\u30B3\u30FC\u30C9\u306E\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      setQrStep("error");
    }
  }, [selected, loadedInvoice, amount, checkoutItems, note, mutate, mode]);

  // ── Cancel QR payment ──
  const handleCancelQr = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setQrStep("idle");
    setQrDataUrl(null);
    setQrSessionId(null);
    setQrError(null);
    setProcessing(false);
  }, []);

  // ── Main checkout handler ──
  const handleCheckout = useCallback(async () => {
    if (!hasSelection || processing) return;

    // \u30AB\u30FC\u30C9\u6C7A\u6E08: QR\u30B3\u30FC\u30C9\u30D5\u30ED\u30FC
    if (paymentMethod === "card") {
      setProcessing(true);
      setError(null);
      await handleCardPaymentQr();
      setProcessing(false);
      return;
    }

    // \u73FE\u91D1\u30FBQR\u30FB\u632F\u8FBC\u30FB\u305D\u306E\u4ED6: \u5373 pos_checkout
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservation_id: mode === "reservation" ? selected?.id : undefined,
          customer_id:
            mode === "reservation"
              ? selected?.customer_id
              : mode === "invoice"
                ? (loadedInvoice?.customer_id ?? undefined)
                : undefined,
          payment_method: paymentMethod,
          amount,
          received_amount: paymentMethod === "cash" ? received : undefined,
          items_json: checkoutItems,
          tax_rate: 10,
          note: note || undefined,
          create_receipt: true,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
      setResult(j);
      if (mode === "invoice" && loadedInvoice) {
        await fetch("/api/admin/invoices", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: loadedInvoice.id,
            status: "paid",
            payment_date: new Date().toISOString().slice(0, 10),
          }),
        });
      }
      await mutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "\u4F1A\u8A08\u51E6\u7406\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    } finally {
      setProcessing(false);
    }
  }, [hasSelection, processing, paymentMethod, amount, received, checkoutItems, note, mutate, mode, selected, loadedInvoice, handleCardPaymentQr]);

  // ── Render ──
  return (
    <div className="space-y-6">
      <PageHeader title="POS \u4F1A\u8A08" tag="POS" description="\u4E88\u7D04\u306E\u4F1A\u8A08\u51E6\u7406\u30FB\u30A6\u30A9\u30FC\u30AF\u30A4\u30F3\u4F1A\u8A08\u3092\u884C\u3044\u307E\u3059" />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="\u672A\u4F1A\u8A08" value={unpaidReservations.length} />
        <StatCard label="\u672C\u65E5\u4F1A\u8A08\u6E08" value={paidReservations.length} />
        <StatCard
          label="\u672C\u65E5\u58F2\u4E0A"
          value={formatJpy(
            paidReservations.reduce((s, r) => s + (r.estimated_amount ?? 0), 0),
          )}
        />
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 rounded-xl bg-surface-hover p-1">
        <button
          type="button"
          onClick={() => handleModeSwitch("reservation")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "reservation"
              ? "bg-surface text-primary shadow-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          {"\u4E88\u7D04\u304B\u3089\u4F1A\u8A08"}
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("walkin")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "walkin"
              ? "bg-surface text-primary shadow-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          {"\u4E88\u7D04\u306A\u3057\u4F1A\u8A08"}
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("invoice")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "invoice"
              ? "bg-surface text-primary shadow-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          {"\u8ACB\u6C42\u66F8\u304B\u3089\u4F1A\u8A08"}
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ── Left panel ── */}
        <div className="flex-1 space-y-3">
          {mode === "reservation" ? (
            /* ── Reservation list ── */
            <>
              <h2 className="text-sm font-semibold text-secondary">{"\u672A\u4F1A\u8A08\u306E\u4E88\u7D04"}</h2>

              {isLoading && !data ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-hover" />
                  ))}
                </div>
              ) : unpaidReservations.length === 0 ? (
                <div className="rounded-xl border border-border-subtle bg-surface p-8 text-center text-sm text-muted">
                  {"\u672A\u4F1A\u8A08\u306E\u4E88\u7D04\u306F\u3042\u308A\u307E\u305B\u3093"}
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
                          <span className="text-sm font-medium text-primary">{r.title || "\u7121\u984C"}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={statusEntry.variant}>{statusEntry.label}</Badge>
                            <span className="text-sm font-semibold text-primary">
                              {formatJpy(r.estimated_amount)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary">
                          {r.scheduled_date && <span>{formatDate(r.scheduled_date)}</span>}
                          {r.start_time && <span>{r.start_time}{"\u301C"}{r.end_time ?? ""}</span>}
                          {r.customer_name && <span>{r.customer_name}</span>}
                          {r.vehicle_info && <span>{r.vehicle_info}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : mode === "invoice" ? (
            /* ── Invoice lookup ── */
            <>
              <h2 className="text-sm font-semibold text-secondary">{"\u8ACB\u6C42\u66F8\u756A\u53F7\u3067\u8AAD\u307F\u8FBC\u3080"}</h2>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleInvoiceSearch(); }}
                  placeholder="\u4F8B: INV-202604-001"
                  className="flex-1 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={handleInvoiceSearch}
                  disabled={invoiceSearchBusy || !invoiceSearch.trim()}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  {invoiceSearchBusy ? "\u691C\u7D22\u4E2D..." : "\u691C\u7D22"}
                </button>
              </div>

              {invoiceSearchError && (
                <div className="rounded-xl bg-danger-dim px-4 py-2.5 text-sm text-danger-text">
                  {invoiceSearchError}
                </div>
              )}

              {loadedInvoice && (
                <div className="rounded-xl border border-accent bg-accent-dim p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wider text-muted">{"\u8ACB\u6C42\u66F8"}</span>
                    <button
                      type="button"
                      onClick={() => { setLoadedInvoice(null); setInvoiceSearch(""); }}
                      className="text-xs text-muted hover:text-danger-text"
                    >
                      {"\u30AF\u30EA\u30A2"}
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-primary">{loadedInvoice.doc_number}</div>
                  {loadedInvoice.recipient_name && (
                    <div className="text-xs text-secondary">{loadedInvoice.recipient_name}</div>
                  )}
                  {(loadedInvoice.items_json ?? []).length > 0 && (
                    <div className="space-y-1">
                      {(loadedInvoice.items_json ?? []).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-secondary">
                            {item.description}
                            {item.quantity > 1 && <span className="ml-1 text-muted">x{item.quantity}</span>}
                          </span>
                          <span className="font-medium text-primary">{formatJpy(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-accent/30 pt-2 text-sm font-bold">
                    <span className="text-accent">{"\u5408\u8A08"}</span>
                    <span className="text-accent">{formatJpy(loadedInvoice.total)}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── Walk-in: menu item grid ── */
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-secondary">{"\u54C1\u76EE\u3092\u9078\u629E"}</h2>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-danger-text hover:underline"
                  >
                    {"\u30AB\u30FC\u30C8\u3092\u7A7A\u306B\u3059\u308B"}
                  </button>
                )}
              </div>

              {/* Search */}
              <input
                type="text"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder={"\u54C1\u76EE\u540D\u3067\u691C\u7D22..."}
                className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />

              {/* Cart summary */}
              {cart.length > 0 && (
                <div className="space-y-1 rounded-xl border border-accent bg-accent-dim p-3">
                  <span className="text-xs font-medium text-accent">{"\u30AB\u30FC\u30C8"} ({cart.length} {"\u54C1\u76EE"})</span>
                  {cart.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="text-primary">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateCartQty(c.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-border-subtle bg-surface text-xs font-bold text-secondary hover:bg-surface-hover"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">{c.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(c.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-border-subtle bg-surface text-xs font-bold text-secondary hover:bg-surface-hover"
                        >
                          +
                        </button>
                        <span className="ml-1 w-16 text-right text-xs font-medium">{formatJpy(c.amount)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-accent/30 pt-1 text-sm font-semibold">
                    <span className="text-accent">{"\u5408\u8A08"}</span>
                    <span className="text-accent">{formatJpy(amount)}</span>
                  </div>
                </div>
              )}

              {/* Menu item grid */}
              {menuLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-hover" />
                  ))}
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="rounded-xl border border-border-subtle bg-surface p-8 text-center text-sm text-muted">
                  {menuSearch ? "\u8A72\u5F53\u3059\u308B\u54C1\u76EE\u304C\u3042\u308A\u307E\u305B\u3093" : "\u54C1\u76EE\u30DE\u30B9\u30BF\u304C\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093"}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredMenuItems.map((mi) => {
                    const inCart = cart.find((c) => c.id === mi.id);
                    return (
                      <button
                        key={mi.id}
                        type="button"
                        onClick={() => addToCart(mi)}
                        className={`relative rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
                          inCart
                            ? "border-accent bg-accent-dim"
                            : "border-border-subtle bg-surface hover:border-border"
                        }`}
                      >
                        <div className="text-sm font-medium text-primary leading-tight">{mi.name}</div>
                        <div className="mt-1 text-xs font-semibold text-secondary">{formatJpy(mi.unit_price)}</div>
                        {inCart && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
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
          <div className="sticky top-6 space-y-4">
            {result ? (
              /* ── Success ── */
              <div className="glass-card space-y-4 rounded-2xl p-6">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success-dim">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-success-text">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-primary">{"\u4F1A\u8A08\u5B8C\u4E86"}</h3>
                  <p className="mt-1 text-sm text-secondary">
                    {result.doc_number && <>{"\u9818\u53CE\u66F8"}: {result.doc_number}</>}
                  </p>
                </div>

                <div className="space-y-2 rounded-xl bg-surface-hover p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary">{"\u304A\u4F1A\u8A08"}</span>
                    <span className="font-semibold">{formatJpy(result.amount)}</span>
                  </div>
                  {result.change > 0 && (
                    <div className="flex justify-between">
                      <span className="text-secondary">{"\u304A\u91E3\u308A"}</span>
                      <span className="font-semibold text-accent">{formatJpy(result.change)}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setCart([]);
                    setResult(null);
                  }}
                  className="btn-primary w-full rounded-xl py-3 text-sm font-medium"
                >
                  {"\u6B21\u306E\u4F1A\u8A08\u3078"}
                </button>
              </div>
            ) : qrStep !== "idle" && paymentMethod === "card" ? (
              /* ── QR Code payment screen ── */
              <div className="glass-card space-y-4 rounded-2xl p-6">
                {(qrStep === "showing" || qrStep === "paid" || qrStep === "recording") && (
                  <div className="text-center space-y-4">
                    {/* Amount */}
                    <div className="text-3xl font-bold text-primary">
                      {formatJpy(amount)}
                    </div>

                    {qrStep === "showing" && qrDataUrl ? (
                      <>
                        {/* QR Code */}
                        <div className="flex justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrDataUrl}
                            alt="QR Code"
                            width={250}
                            height={250}
                            className="rounded-xl border border-border-subtle"
                          />
                        </div>

                        {/* Instructions */}
                        <p className="text-sm font-semibold text-primary">
                          {"\u304A\u5BA2\u69D8\u306E\u30B9\u30DE\u30FC\u30C8\u30D5\u30A9\u30F3\u3067\u30B9\u30AD\u30E3\u30F3\u3057\u3066\u304A\u652F\u6255\u3044\u304F\u3060\u3055\u3044"}
                        </p>
                        <p className="text-xs text-secondary">
                          {"\u30AB\u30FC\u30C9 / Apple Pay / Google Pay \u304C\u4F7F\u3048\u307E\u3059"}
                        </p>

                        {/* Spinner */}
                        <div className="flex items-center justify-center gap-2 text-sm text-info-text">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-info-text border-t-transparent" />
                          {"\u6C7A\u6E08\u5F85\u3061..."}
                        </div>

                        {/* Cancel button */}
                        <button
                          type="button"
                          onClick={handleCancelQr}
                          className="w-full rounded-xl border border-border-subtle bg-surface py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-surface-hover"
                        >
                          {"\u30AD\u30E3\u30F3\u30BB\u30EB"}
                        </button>
                      </>
                    ) : (qrStep === "paid" || qrStep === "recording") ? (
                      <>
                        {/* Payment success */}
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-dim">
                          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-success-text">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                        <p className="text-lg font-semibold text-success-text">{"\u6C7A\u6E08\u5B8C\u4E86"}</p>
                        <div className="flex items-center justify-center gap-2 text-sm text-secondary">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                          {"\u8A18\u9332\u4E2D..."}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}

                {qrStep === "creating" && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-info-text border-t-transparent" />
                    <p className="text-sm font-medium text-info-text">{"QR\u30B3\u30FC\u30C9\u3092\u751F\u6210\u4E2D..."}</p>
                  </div>
                )}

                {qrStep === "error" && (
                  <div className="space-y-3 text-center py-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-dim">
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-danger-text">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-danger-text">
                      {qrError ?? "QR\u30B3\u30FC\u30C9\u6C7A\u6E08\u306B\u5931\u6557\u3057\u307E\u3057\u305F"}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelQr}
                        className="flex-1 rounded-xl border border-border-subtle bg-surface py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-surface-hover"
                      >
                        {"\u623B\u308B"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCheckout}
                        className="flex-1 rounded-xl bg-[#635BFF] py-2.5 text-sm font-semibold text-white shadow-lg transition-transform active:scale-95"
                      >
                        {"\u518D\u8A66\u884C"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : hasSelection ? (
              /* ── Checkout form ── */
              <div className="glass-card space-y-5 rounded-2xl p-6">
                <div>
                  <h3 className="text-base font-semibold text-primary">
                    {mode === "reservation" ? (selected?.title || "\u7121\u984C") : mode === "invoice" ? (loadedInvoice?.doc_number || "\u8ACB\u6C42\u66F8") : "\u30A6\u30A9\u30FC\u30AF\u30A4\u30F3\u4F1A\u8A08"}
                  </h3>
                  {mode === "reservation" && selected?.customer_name && (
                    <p className="mt-0.5 text-xs text-secondary">{selected.customer_name}</p>
                  )}
                  {mode === "invoice" && loadedInvoice?.recipient_name && (
                    <p className="mt-0.5 text-xs text-secondary">{loadedInvoice.recipient_name}</p>
                  )}
                </div>

                {/* Items */}
                {checkoutItems.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-secondary">{"\u660E\u7D30"}</span>
                    <div className="space-y-1 rounded-xl bg-surface-hover p-3">
                      {checkoutItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-primary">
                            {item.description}
                            {item.quantity > 1 && (
                              <span className="ml-1 text-xs text-secondary">x{item.quantity}</span>
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
                  <span className="text-sm font-medium text-secondary">{"\u5408\u8A08"}</span>
                  <span className="text-2xl font-bold text-primary">{formatJpy(amount)}</span>
                </div>

                {/* Payment method */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-secondary">{"\u652F\u6255\u65B9\u6CD5"}</span>
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
                    <span className="text-xs font-medium text-secondary">{"\u9810\u308A\u91D1\u984D"}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      placeholder={String(amount)}
                      className="w-full rounded-xl border border-border-subtle bg-surface px-4 py-3 text-right text-lg font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    {/* Quick amount buttons */}
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
                        {"\u3074\u3063\u305F\u308A"}
                      </button>
                    </div>
                    {change > 0 && (
                      <div className="flex items-center justify-between rounded-xl bg-accent-dim px-4 py-2.5">
                        <span className="text-sm text-accent">{"\u304A\u91E3\u308A"}</span>
                        <span className="text-lg font-bold text-accent">{formatJpy(change)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Note */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-secondary">{"\u30E1\u30E2\uFF08\u4EFB\u610F\uFF09"}</span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={"\u5099\u8003\u3092\u5165\u529B"}
                    className="w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-xl bg-danger-dim px-4 py-2.5 text-sm text-danger-text">
                    {error}
                  </div>
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
                      {"\u51E6\u7406\u4E2D..."}
                    </span>
                  ) : paymentMethod === "card" ? (
                    `${formatJpy(amount)} \u30AB\u30FC\u30C9\u6C7A\u6E08\u3092\u958B\u59CB`
                  ) : (
                    `${formatJpy(amount)} \u3092\u4F1A\u8A08\u3059\u308B`
                  )}
                </button>
              </div>
            ) : (
              /* ── No selection ── */
              <div className="glass-card flex min-h-[300px] items-center justify-center rounded-2xl p-6 text-center">
                <div>
                  <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} className="mx-auto mb-3 text-muted">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                  </svg>
                  <p className="text-sm text-muted">
                    {mode === "reservation"
                      ? "\u5DE6\u306E\u4E00\u89A7\u304B\u3089\u4E88\u7D04\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044"
                      : mode === "invoice"
                        ? "\u8ACB\u6C42\u66F8\u756A\u53F7\u3092\u5165\u529B\u3057\u3066\u691C\u7D22\u3057\u3066\u304F\u3060\u3055\u3044"
                        : "\u5DE6\u306E\u54C1\u76EE\u3092\u30BF\u30C3\u30D7\u3057\u3066\u30AB\u30FC\u30C8\u306B\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
