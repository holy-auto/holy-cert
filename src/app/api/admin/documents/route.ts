import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole, requireMinRole } from "@/lib/auth/checkRole";
import { apiForbidden, apiValidationError } from "@/lib/api/response";
import { DOC_TYPES, type DocType } from "@/types/document";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { parsePagination } from "@/lib/api/pagination";
import { documentCreateSchema, documentUpdateSchema, documentDeleteSchema } from "@/lib/validations/document";

export const dynamic = "force-dynamic";

/** 書類番号自動採番: {PREFIX}-YYYYMM-NNN */
async function generateDocNumber(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  docType: DocType,
): Promise<string> {
  const meta = DOC_TYPES[docType];
  if (!meta) throw new Error(`Unknown doc_type: ${docType}`);

  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `${meta.prefix}-${ym}-`;

  const { data } = await supabase
    .from("documents")
    .select("doc_number")
    .eq("tenant_id", tenantId)
    .eq("doc_type", docType)
    .like("doc_number", `${prefix}%`)
    .order("doc_number", { ascending: false })
    .limit(1);

  let seq = 1;
  if (data && data.length > 0) {
    const last = data[0].doc_number as string;
    const num = parseInt(last.replace(prefix, ""), 10);
    if (!isNaN(num)) seq = num + 1;
  }

  return `${prefix}${String(seq).padStart(3, "0")}`;
}

function calcItems(items: any[], taxRate: number) {
  let subtotal = 0;
  const itemsJson = items.map((item: any) => {
    const qty = parseInt(String(item.quantity || 0), 10);
    const unitPrice = parseInt(String(item.unit_price || 0), 10);
    const amount = qty * unitPrice;
    subtotal += amount;
    const mapped: Record<string, unknown> = {
      description: (item.description ?? "").trim(),
      quantity: qty,
      unit_price: unitPrice,
      amount,
    };
    if (item.tax_category != null) mapped.tax_category = item.tax_category;
    if (item.certificate_id) mapped.certificate_id = item.certificate_id;
    if (item.certificate_public_id) mapped.certificate_public_id = item.certificate_public_id;
    return mapped;
  });

  const tax = Math.floor(subtotal * (taxRate / 100));
  return { itemsJson, subtotal, tax, total: subtotal + tax };
}

// ─── GET: 帳票一覧 ───
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const docType = url.searchParams.get("doc_type") ?? "";
    const status = url.searchParams.get("status") ?? "";
    const customerId = url.searchParams.get("customer_id") ?? "";
    const { page, perPage, from, to } = parsePagination(req, { maxPerPage: 200 });

    const selectCols = "id, tenant_id, customer_id, doc_type, doc_number, issued_at, due_date, status, subtotal, tax, total, tax_rate, note, is_invoice_compliant, source_document_id, show_seal, show_logo, show_bank_info, recipient_name, created_at, updated_at";

    let query = supabase
      .from("documents")
      .select(selectCols)
      .eq("tenant_id", caller.tenantId)
      .order("created_at", { ascending: false });

    let countQuery = supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", caller.tenantId);

    if (docType) { query = query.eq("doc_type", docType); countQuery = countQuery.eq("doc_type", docType); }
    if (status && status !== "all") { query = query.eq("status", status); countQuery = countQuery.eq("status", status); }
    if (customerId) { query = query.eq("customer_id", customerId); countQuery = countQuery.eq("customer_id", customerId); }

    if (page > 0) {
      query = query.range(from, to);
    }

    const [{ data: docs, error }, { count: totalCount }] = await Promise.all([query, countQuery]);
    if (error) {
      console.error("[documents] db_error:", error.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    // 顧客名を並列取得（メインクエリ完了後すぐにIDを収集）
    const customerIds = [...new Set((docs ?? []).map((d) => d.customer_id).filter(Boolean))];
    const customerNames: Record<string, string> = {};
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name")
        .in("id", customerIds);
      for (const c of customers ?? []) { customerNames[c.id] = c.name; }
    }

    const enriched = (docs ?? []).map((d) => ({
      ...d,
      customer_name: d.customer_id ? (customerNames[d.customer_id] ?? null) : null,
    }));

    // 統計
    const total = enriched.length;
    const unpaidAmount = enriched
      .filter((d) => d.status === "sent" || d.status === "accepted")
      .reduce((sum, d) => sum + (d.total ?? 0), 0);

    return NextResponse.json({
      documents: enriched,
      stats: { total: totalCount ?? total, unpaid_amount: unpaidAmount },
      ...(page > 0 && {
        pagination: {
          page,
          per_page: perPage,
          total: totalCount ?? total,
          total_pages: Math.ceil((totalCount ?? total) / perPage),
        },
      }),
    });
  } catch (e: any) {
    console.error("documents list failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// ─── POST: 帳票作成 ───
export async function POST(req: NextRequest) {
  try {
    const limited = await checkRateLimit(req, "general");
    if (limited) return limited;

    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!requireMinRole(caller, "staff")) return apiForbidden();

    const body = await req.json().catch(() => ({}));
    const parsed = documentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.issues[0]?.message ?? "入力内容に誤りがあります。");
    }
    const d = parsed.data;

    const docType = d.doc_type as DocType;
    if (!DOC_TYPES[docType]) {
      return NextResponse.json({ error: "invalid_doc_type" }, { status: 400 });
    }

    const docNumber = d.doc_number || (await generateDocNumber(supabase, caller.tenantId, docType));
    const customerId = d.customer_id || null;
    const issuedAt = d.issued_at || new Date().toISOString().slice(0, 10);
    const dueDate = d.due_date || null;
    const note = d.note;
    const items = d.items;
    const taxRate = parseInt(String(d.tax_rate), 10);
    const status = d.status;
    const isInvoiceCompliant = d.is_invoice_compliant;
    const sourceDocumentId = d.source_document_id || null;
    const showSeal = d.show_seal;
    const showLogo = d.show_logo;
    const showBankInfo = d.show_bank_info;
    const recipientName = d.recipient_name;
    const metaJson = d.meta_json;

    const { itemsJson, subtotal, tax, total } = calcItems(items, taxRate);

    const row = {
      id: crypto.randomUUID(),
      tenant_id: caller.tenantId,
      customer_id: customerId,
      recipient_name: recipientName,
      doc_type: docType,
      doc_number: docNumber,
      issued_at: issuedAt,
      due_date: dueDate,
      status,
      subtotal,
      tax,
      total,
      tax_rate: taxRate,
      items_json: itemsJson,
      note,
      meta_json: metaJson,
      is_invoice_compliant: isInvoiceCompliant,
      source_document_id: sourceDocumentId,
      show_seal: showSeal,
      show_logo: showLogo,
      show_bank_info: showBankInfo,
    };

    const { data, error } = await supabase.from("documents").insert(row).select().single();
    if (error) {
      console.error("[documents] insert_failed:", error.message);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, document: data });
  } catch (e: any) {
    console.error("document create failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// ─── PUT: 帳票更新 ───
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!requireMinRole(caller, "staff")) return apiForbidden();

    const body = await req.json().catch(() => ({}));
    const parsed = documentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.issues[0]?.message ?? "入力内容に誤りがあります。");
    }
    const { id, ...fields } = parsed.data;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (fields.status !== undefined) updates.status = fields.status;
    if (fields.customer_id !== undefined) updates.customer_id = fields.customer_id || null;
    if (fields.issued_at !== undefined) updates.issued_at = fields.issued_at;
    if (fields.due_date !== undefined) updates.due_date = fields.due_date;
    if (fields.note !== undefined) updates.note = fields.note;
    if (fields.doc_number !== undefined) updates.doc_number = fields.doc_number;
    if (fields.is_invoice_compliant !== undefined) updates.is_invoice_compliant = fields.is_invoice_compliant;
    if (fields.show_seal !== undefined) updates.show_seal = fields.show_seal;
    if (fields.show_logo !== undefined) updates.show_logo = fields.show_logo;
    if (fields.show_bank_info !== undefined) updates.show_bank_info = fields.show_bank_info;
    if (fields.recipient_name !== undefined) updates.recipient_name = fields.recipient_name;
    if (fields.meta_json !== undefined) updates.meta_json = fields.meta_json;

    if (fields.items !== undefined) {
      const taxRate = parseInt(String(fields.tax_rate ?? 10), 10);
      const { itemsJson, subtotal, tax, total } = calcItems(fields.items ?? [], taxRate);
      updates.items_json = itemsJson;
      updates.subtotal = subtotal;
      updates.tax = tax;
      updates.total = total;
      updates.tax_rate = taxRate;
    }

    const { data, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .select()
      .single();

    if (error) {
      console.error("[documents] update_failed:", error.message);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, document: data });
  } catch (e: any) {
    console.error("document update failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// ─── DELETE: 帳票削除（下書きのみ） ───
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!requireMinRole(caller, "staff")) return apiForbidden();

    const body = await req.json().catch(() => ({}));
    const parsed = documentDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.issues[0]?.message ?? "IDが必要です。");
    }
    const { id } = parsed.data;

    const { data: doc } = await supabase
      .from("documents")
      .select("status")
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .single();

    if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (doc.status !== "draft") {
      return NextResponse.json({
        error: "not_draft",
        message: "下書きステータスの帳票のみ削除できます。",
      }, { status: 400 });
    }

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("tenant_id", caller.tenantId);

    if (error) {
      console.error("[documents] delete_failed:", error.message);
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("document delete failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
