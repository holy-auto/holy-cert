import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { createSignedAssetUrl } from "@/lib/signedUrl";

const NOTO_SANS_JP =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-400-normal.ttf";
const NOTO_SANS_JP_BOLD =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-700-normal.ttf";

Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: NOTO_SANS_JP, fontWeight: 400 },
    { src: NOTO_SANS_JP_BOLD, fontWeight: 700 },
  ],
});

type InvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  certificate_public_id?: string | null;
};

type BankInfo = {
  bank_name?: string | null;
  branch_name?: string | null;
  account_type?: string | null;
  account_number?: string | null;
  account_holder?: string | null;
};

export type InvoiceForPdf = {
  id: string;
  invoice_number: string;
  status: string;
  issued_at: string | null;
  due_date: string | null;
  subtotal: number;
  tax: number;
  total: number;
  tax_rate?: number;
  note: string | null;
  items_json: InvoiceItem[];
  is_invoice_compliant?: boolean;
  show_seal?: boolean;
  show_logo?: boolean;
  show_bank_info?: boolean;
  recipient_name?: string | null;
};

export type TenantForPdf = {
  name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  registration_number: string | null;
  logo_asset_path: string | null;
  company_seal_path: string | null;
  bank_info: BankInfo | null;
};

function fmtJpy(n: number | null | undefined): string {
  if (n == null) return "-";
  return `¥${n.toLocaleString("ja-JP")}`;
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}年${m}月${day}日`;
}

/* ── Board-style layout ── */
const s = StyleSheet.create({
  page: {
    padding: 40,
    paddingTop: 36,
    paddingBottom: 36,
    fontSize: 9,
    fontFamily: "NotoSansJP",
    color: "#333",
  },
  /* Title bar */
  titleBar: {
    backgroundColor: "#2c3e50",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderRadius: 2,
  },
  titleText: {
    fontSize: 18,
    fontWeight: 700,
    color: "#fff",
    textAlign: "center",
    letterSpacing: 8,
  },
  /* Invoice meta - top right */
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metaLeft: {
    flex: 1,
  },
  metaRight: {
    width: 200,
  },
  metaLine: {
    fontSize: 9,
    color: "#555",
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 8,
    color: "#888",
    width: 60,
  },
  metaValue: {
    fontSize: 9,
    color: "#333",
  },
  /* Customer section */
  customerSection: {
    marginBottom: 20,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a1a1a",
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: "#333",
  },
  honorific: {
    fontSize: 12,
    fontWeight: 400,
    color: "#555",
  },
  /* Total highlight */
  totalHighlight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 2,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  totalHighlightLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#333",
  },
  totalHighlightValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1a1a1a",
  },
  /* Two-column: Issuer info (left) + meta (right) */
  row2col: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 20,
  },
  colHalf: {
    flex: 1,
  },
  /* Issuer block with seal overlay */
  issuerBlock: {
    position: "relative",
    flex: 1,
  },
  issuerName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 3,
  },
  issuerLine: {
    fontSize: 8,
    color: "#555",
    marginBottom: 2,
  },
  regNumLine: {
    fontSize: 7,
    color: "#888",
    marginTop: 2,
  },
  /* Seal: positioned overlapping the issuer address */
  sealOverlay: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 56,
    height: 56,
    opacity: 0.85,
  },
  sealFallback: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: "#c00",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  },
  sealFallbackText: {
    fontSize: 16,
    color: "#c00",
    fontWeight: 700,
  },
  /* Logo */
  logoImg: {
    height: 28,
    maxWidth: 120,
    marginBottom: 6,
  },
  /* Table */
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#f1f3f5",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#dee2e6",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e9ecef",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colNo: { width: 28, textAlign: "center" },
  colDesc: { flex: 3, paddingRight: 4 },
  colQty: { width: 50, textAlign: "right" },
  colUnit: { width: 70, textAlign: "right" },
  colAmount: { width: 80, textAlign: "right" },
  thText: { fontSize: 8, color: "#555", fontWeight: 700 },
  tdText: { fontSize: 9, color: "#333" },
  /* Totals - right aligned */
  totalsWrap: {
    alignItems: "flex-end",
    marginTop: 12,
  },
  totalsBox: {
    width: 220,
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 2,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e9ecef",
  },
  totalLabel: { color: "#555", fontSize: 9 },
  totalValue: { fontSize: 9, color: "#333" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "#f8f9fa",
  },
  grandTotalLabel: { fontSize: 11, fontWeight: 700, color: "#333" },
  grandTotalValue: { fontSize: 11, fontWeight: 700, color: "#1a1a1a" },
  /* Bank info */
  bankSection: {
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
    paddingTop: 10,
    marginTop: 16,
  },
  bankTitle: { fontSize: 9, fontWeight: 700, color: "#555", marginBottom: 4 },
  bankLine: { fontSize: 8, color: "#555", marginTop: 1 },
  /* Note */
  noteSection: {
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
    paddingTop: 10,
    marginTop: 12,
  },
  noteLabel: { fontSize: 8, fontWeight: 700, color: "#555" },
  noteText: { fontSize: 8, color: "#555", marginTop: 2, lineHeight: 1.5 },
  /* Compliance footer */
  compliance: {
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
    paddingTop: 8,
    marginTop: 12,
    fontSize: 7,
    color: "#999",
  },
});

export async function renderInvoicePdf(
  invoice: InvoiceForPdf,
  tenant: TenantForPdf,
  customerName: string | null,
) {
  let logoUrl: string | null = null;
  try {
    logoUrl =
      invoice.show_logo && tenant.logo_asset_path
        ? await createSignedAssetUrl(tenant.logo_asset_path, 3600)
        : null;
  } catch {
    logoUrl = null;
  }

  let sealUrl: string | null = null;
  try {
    sealUrl =
      invoice.show_seal && tenant.company_seal_path
        ? await createSignedAssetUrl(tenant.company_seal_path, 3600)
        : null;
  } catch {
    sealUrl = null;
  }

  const items = invoice.items_json ?? [];
  const recipientName = invoice.recipient_name || customerName;
  const bank = tenant.bank_info;

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Title Bar ── */}
        <View style={s.titleBar}>
          <Text style={s.titleText}>請 求 書</Text>
        </View>

        {/* ── Meta row: customer left, doc info right ── */}
        <View style={s.metaRow}>
          {/* Customer */}
          <View style={s.metaLeft}>
            {recipientName && (
              <View style={s.customerSection}>
                <Text style={s.customerName}>
                  {recipientName}{" "}
                  <Text style={s.honorific}>御中</Text>
                </Text>
              </View>
            )}
            {/* Grand total highlight */}
            <View style={s.totalHighlight}>
              <Text style={s.totalHighlightLabel}>ご請求金額</Text>
              <Text style={s.totalHighlightValue}>{fmtJpy(invoice.total)}</Text>
            </View>
          </View>

          {/* Invoice info */}
          <View style={s.metaRight}>
            <View style={{ flexDirection: "row", marginBottom: 3 }}>
              <Text style={s.metaLabel}>請求書番号</Text>
              <Text style={s.metaValue}>{invoice.invoice_number}</Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 3 }}>
              <Text style={s.metaLabel}>発行日</Text>
              <Text style={s.metaValue}>{fmtDate(invoice.issued_at)}</Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 3 }}>
              <Text style={s.metaLabel}>支払期限</Text>
              <Text style={s.metaValue}>{fmtDate(invoice.due_date)}</Text>
            </View>
            {invoice.is_invoice_compliant && tenant.registration_number && (
              <View style={{ flexDirection: "row", marginBottom: 3 }}>
                <Text style={s.metaLabel}>登録番号</Text>
                <Text style={s.metaValue}>{tenant.registration_number}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Issuer block with seal overlay ── */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 8, color: "#888", marginBottom: 4 }}>差出人</Text>
          <View style={s.issuerBlock}>
            {logoUrl && (
              <Image src={logoUrl} style={s.logoImg} />
            )}
            <Text style={s.issuerName}>{tenant.name}</Text>
            {tenant.address && <Text style={s.issuerLine}>{tenant.address}</Text>}
            {tenant.contact_phone && (
              <Text style={s.issuerLine}>TEL: {tenant.contact_phone}</Text>
            )}
            {tenant.contact_email && (
              <Text style={s.issuerLine}>{tenant.contact_email}</Text>
            )}
            {invoice.is_invoice_compliant && tenant.registration_number && (
              <Text style={s.regNumLine}>
                適格請求書発行事業者登録番号: {tenant.registration_number}
              </Text>
            )}

            {/* Seal overlay - positioned over the issuer address area */}
            {sealUrl ? (
              <Image src={sealUrl} style={s.sealOverlay} />
            ) : invoice.show_seal ? (
              <View style={s.sealFallback}>
                <Text style={s.sealFallbackText}>印</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Items table ── */}
        <View style={s.tableHead}>
          <Text style={{ ...s.thText, ...s.colNo }}>No.</Text>
          <Text style={{ ...s.thText, ...s.colDesc }}>品目・内容</Text>
          <Text style={{ ...s.thText, ...s.colQty }}>数量</Text>
          <Text style={{ ...s.thText, ...s.colUnit }}>単価</Text>
          <Text style={{ ...s.thText, ...s.colAmount }}>金額</Text>
        </View>
        {items.map((item, idx) => (
          <View key={idx} style={s.tableRow}>
            <Text style={{ ...s.tdText, ...s.colNo }}>{idx + 1}</Text>
            <Text style={{ ...s.tdText, ...s.colDesc }}>
              {item.description || "-"}
              {item.certificate_public_id ? ` [証明書: ${item.certificate_public_id}]` : ""}
            </Text>
            <Text style={{ ...s.tdText, ...s.colQty }}>{item.quantity}</Text>
            <Text style={{ ...s.tdText, ...s.colUnit }}>{fmtJpy(item.unit_price)}</Text>
            <Text style={{ ...s.tdText, ...s.colAmount }}>{fmtJpy(item.amount)}</Text>
          </View>
        ))}

        {/* ── Totals ── */}
        <View style={s.totalsWrap}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>小計</Text>
              <Text style={s.totalValue}>{fmtJpy(invoice.subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>
                消費税（{invoice.tax_rate ?? 10}%）
              </Text>
              <Text style={s.totalValue}>{fmtJpy(invoice.tax)}</Text>
            </View>
            <View style={s.grandTotalRow}>
              <Text style={s.grandTotalLabel}>合計</Text>
              <Text style={s.grandTotalValue}>{fmtJpy(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Bank info ── */}
        {invoice.show_bank_info && bank && (
          <View style={s.bankSection}>
            <Text style={s.bankTitle}>お振込先</Text>
            {bank.bank_name && (
              <Text style={s.bankLine}>
                {bank.bank_name}
                {bank.branch_name ? ` ${bank.branch_name}` : ""}
              </Text>
            )}
            {bank.account_type && (
              <Text style={s.bankLine}>
                {bank.account_type} {bank.account_number ?? ""}
              </Text>
            )}
            {bank.account_holder && (
              <Text style={s.bankLine}>口座名義: {bank.account_holder}</Text>
            )}
          </View>
        )}

        {/* ── Note ── */}
        {invoice.note && (
          <View style={s.noteSection}>
            <Text style={s.noteLabel}>備考</Text>
            <Text style={s.noteText}>{invoice.note}</Text>
          </View>
        )}

        {/* ── Compliance ── */}
        {invoice.is_invoice_compliant && (
          <View style={s.compliance}>
            <Text>
              ※ この書類は適格請求書等保存方式（インボイス制度）に対応した請求書です。
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );

  return await renderToBuffer(doc);
}
