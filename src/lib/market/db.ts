import { createAdminClient } from "@/lib/supabase/admin";
import { makePublicId } from "@/lib/publicId";
import type {
  InventoryListing,
  ListingImage,
  ListingWithDealer,
  ListingSearchParams,
  CreateListingInput,
  UpdateListingInput,
  ListingInquiry,
  InquiryMessage,
  InquiryWithDetails,
  Deal,
  DealWithDetails,
  CreateInquiryInput,
  CreateDealInput,
} from "@/types/market";

// ──────────────────────────────────────────
// Listings
// ──────────────────────────────────────────

export async function createListing(
  dealerId: string,
  input: CreateListingInput
): Promise<InventoryListing> {
  const admin = createAdminClient();
  const publicId = makePublicId(16);

  const { data, error } = await admin
    .from("inventory_listings")
    .insert({
      dealer_id: dealerId,
      public_id: publicId,
      make: input.make,
      model: input.model,
      grade: input.grade ?? null,
      year: input.year ?? null,
      mileage: input.mileage ?? null,
      color: input.color ?? null,
      body_type: input.body_type ?? null,
      fuel_type: input.fuel_type ?? null,
      transmission: input.transmission ?? null,
      price: input.price ?? null,
      has_vehicle_inspection: input.has_vehicle_inspection ?? false,
      inspection_expiry: input.inspection_expiry ?? null,
      has_repair_history: input.has_repair_history ?? false,
      repair_history_notes: input.repair_history_notes ?? null,
      description: input.description ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as InventoryListing;
}

export async function updateListing(
  listingId: string,
  dealerId: string,
  input: UpdateListingInput
): Promise<InventoryListing> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("inventory_listings")
    .update({ ...input })
    .eq("id", listingId)
    .eq("dealer_id", dealerId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as InventoryListing;
}

export async function getListingByPublicId(publicId: string): Promise<ListingWithDealer | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("inventory_listings")
    .select(`
      *,
      dealer:dealers(id, company_name, prefecture),
      images:listing_images(id, storage_path, sort_order)
    `)
    .eq("public_id", publicId)
    .single();

  if (!data) return null;
  return data as unknown as ListingWithDealer;
}

export async function getListingById(id: string): Promise<ListingWithDealer | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("inventory_listings")
    .select(`
      *,
      dealer:dealers(id, company_name, prefecture),
      images:listing_images(id, storage_path, sort_order)
    `)
    .eq("id", id)
    .single();

  if (!data) return null;
  return data as unknown as ListingWithDealer;
}

export async function searchListings(params: ListingSearchParams): Promise<{
  listings: ListingWithDealer[];
  total: number;
}> {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 100);
  const offset = (page - 1) * limit;

  let query = admin
    .from("inventory_listings")
    .select(`
      *,
      dealer:dealers(id, company_name, prefecture),
      images:listing_images(id, storage_path, sort_order)
    `, { count: "exact" });

  // 公開中のみ（ハードコード：検索は active + reserved のみ）
  query = query.in("status", params.status ? [params.status] : ["active", "reserved"]);

  if (params.q) {
    query = query.or(`make.ilike.%${params.q}%,model.ilike.%${params.q}%,description.ilike.%${params.q}%`);
  }
  if (params.make) query = query.ilike("make", `%${params.make}%`);
  if (params.prefecture) {
    // dealer の prefecture でフィルタリング（JOIN 後）
    query = query.eq("dealers.prefecture", params.prefecture);
  }
  if (params.body_type) query = query.eq("body_type", params.body_type);
  if (params.fuel_type) query = query.eq("fuel_type", params.fuel_type);
  if (params.transmission) query = query.eq("transmission", params.transmission);
  if (params.year_min) query = query.gte("year", params.year_min);
  if (params.year_max) query = query.lte("year", params.year_max);
  if (params.price_min) query = query.gte("price", params.price_min);
  if (params.price_max) query = query.lte("price", params.price_max);
  if (params.mileage_max != null) query = query.lte("mileage", params.mileage_max);
  if (params.has_vehicle_inspection != null) query = query.eq("has_vehicle_inspection", params.has_vehicle_inspection);
  if (params.has_repair_history != null) query = query.eq("has_repair_history", params.has_repair_history);

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    listings: (data ?? []) as unknown as ListingWithDealer[],
    total: count ?? 0,
  };
}

export async function getDealerListings(dealerId: string): Promise<ListingWithDealer[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("inventory_listings")
    .select(`
      *,
      dealer:dealers(id, company_name, prefecture),
      images:listing_images(id, storage_path, sort_order)
    `)
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ListingWithDealer[];
}

// ──────────────────────────────────────────
// Images
// ──────────────────────────────────────────

export async function addListingImage(
  listingId: string,
  storagePath: string,
  sortOrder: number
): Promise<ListingImage> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("listing_images")
    .insert({ listing_id: listingId, storage_path: storagePath, sort_order: sortOrder })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ListingImage;
}

export async function deleteListingImage(imageId: string, dealerId: string): Promise<void> {
  const admin = createAdminClient();
  // dealer_id の検証のため listing 経由で確認
  const { data: img } = await admin
    .from("listing_images")
    .select("listing_id")
    .eq("id", imageId)
    .single();

  if (!img) return;

  const { data: listing } = await admin
    .from("inventory_listings")
    .select("dealer_id")
    .eq("id", img.listing_id)
    .single();

  if (!listing || listing.dealer_id !== dealerId) {
    throw new Error("Forbidden");
  }

  await admin.from("listing_images").delete().eq("id", imageId);
}

// ──────────────────────────────────────────
// Inquiries
// ──────────────────────────────────────────

export async function createInquiry(
  fromDealerId: string,
  input: CreateInquiryInput
): Promise<ListingInquiry> {
  const admin = createAdminClient();

  // 掲載情報から出品業者を取得
  const { data: listing } = await admin
    .from("inventory_listings")
    .select("dealer_id, status")
    .eq("id", input.listing_id)
    .single();

  if (!listing) throw new Error("Listing not found");
  if (listing.status !== "active") throw new Error("Listing is not available");
  if (listing.dealer_id === fromDealerId) throw new Error("Cannot inquire own listing");

  // 既存チェック（UNIQUE制約があるがメッセージも作るため先に確認）
  const { data: existing } = await admin
    .from("listing_inquiries")
    .select("id")
    .eq("listing_id", input.listing_id)
    .eq("from_dealer_id", fromDealerId)
    .single();

  let inquiryId: string;

  if (existing) {
    inquiryId = existing.id;
  } else {
    const { data: newInquiry, error } = await admin
      .from("listing_inquiries")
      .insert({
        listing_id: input.listing_id,
        from_dealer_id: fromDealerId,
        to_dealer_id: listing.dealer_id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    inquiryId = newInquiry.id;
  }

  // メッセージを追加
  await admin.from("inquiry_messages").insert({
    inquiry_id: inquiryId,
    sender_dealer_id: fromDealerId,
    message: input.message,
  });

  // updated_at を更新
  await admin
    .from("listing_inquiries")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", inquiryId);

  const { data: inquiry } = await admin
    .from("listing_inquiries")
    .select("*")
    .eq("id", inquiryId)
    .single();

  return inquiry as ListingInquiry;
}

export async function replyInquiry(
  inquiryId: string,
  senderDealerId: string,
  message: string
): Promise<InquiryMessage> {
  const admin = createAdminClient();

  // 送信者がこの問い合わせの当事者であることを確認
  const { data: inquiry } = await admin
    .from("listing_inquiries")
    .select("from_dealer_id, to_dealer_id, status")
    .eq("id", inquiryId)
    .single();

  if (!inquiry) throw new Error("Inquiry not found");
  if (
    inquiry.from_dealer_id !== senderDealerId &&
    inquiry.to_dealer_id !== senderDealerId
  ) {
    throw new Error("Forbidden");
  }
  if (inquiry.status === "closed") throw new Error("Inquiry is closed");

  const { data: msg, error } = await admin
    .from("inquiry_messages")
    .insert({ inquiry_id: inquiryId, sender_dealer_id: senderDealerId, message })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // ステータスを replied に
  const newStatus = inquiry.to_dealer_id === senderDealerId ? "replied" : "open";
  await admin
    .from("listing_inquiries")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", inquiryId);

  return msg as InquiryMessage;
}

export async function getDealerInquiries(dealerId: string): Promise<InquiryWithDetails[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("listing_inquiries")
    .select(`
      *,
      listing:inventory_listings(id, public_id, make, model, year, price),
      from_dealer:dealers!listing_inquiries_from_dealer_id_fkey(id, company_name),
      to_dealer:dealers!listing_inquiries_to_dealer_id_fkey(id, company_name),
      messages:inquiry_messages(*)
    `)
    .or(`from_dealer_id.eq.${dealerId},to_dealer_id.eq.${dealerId}`)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as InquiryWithDetails[];
}

export async function getInquiryById(
  inquiryId: string,
  dealerId: string
): Promise<InquiryWithDetails | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("listing_inquiries")
    .select(`
      *,
      listing:inventory_listings(id, public_id, make, model, year, price),
      from_dealer:dealers!listing_inquiries_from_dealer_id_fkey(id, company_name),
      to_dealer:dealers!listing_inquiries_to_dealer_id_fkey(id, company_name),
      messages:inquiry_messages(*)
    `)
    .eq("id", inquiryId)
    .or(`from_dealer_id.eq.${dealerId},to_dealer_id.eq.${dealerId}`)
    .single();

  return (data as unknown as InquiryWithDetails) ?? null;
}

// ──────────────────────────────────────────
// Deals
// ──────────────────────────────────────────

export async function createDeal(
  sellerDealerId: string,
  input: CreateDealInput
): Promise<Deal> {
  const admin = createAdminClient();

  const { data: listing } = await admin
    .from("inventory_listings")
    .select("dealer_id")
    .eq("id", input.listing_id)
    .single();

  if (!listing || listing.dealer_id !== sellerDealerId) {
    throw new Error("Forbidden: only seller can create a deal");
  }

  // 問い合わせから買い手ディーラーを特定
  let buyerDealerId: string | null = null;
  if (input.inquiry_id) {
    const { data: inq } = await admin
      .from("listing_inquiries")
      .select("from_dealer_id")
      .eq("id", input.inquiry_id)
      .single();
    buyerDealerId = inq?.from_dealer_id ?? null;
  }
  if (!buyerDealerId) throw new Error("buyer_dealer_id is required (via inquiry_id)");

  const { data, error } = await admin
    .from("deals")
    .insert({
      listing_id: input.listing_id,
      inquiry_id: input.inquiry_id ?? null,
      buyer_dealer_id: buyerDealerId,
      seller_dealer_id: sellerDealerId,
      agreed_price: input.agreed_price ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 掲載を reserved に変更
  await admin
    .from("inventory_listings")
    .update({ status: "reserved" })
    .eq("id", input.listing_id);

  // 問い合わせを deal に変更
  if (input.inquiry_id) {
    await admin
      .from("listing_inquiries")
      .update({ status: "deal", updated_at: new Date().toISOString() })
      .eq("id", input.inquiry_id);
  }

  return data as Deal;
}

export async function updateDealStatus(
  dealId: string,
  dealerId: string,
  status: "agreed" | "completed" | "cancelled"
): Promise<Deal> {
  const admin = createAdminClient();

  const { data: deal } = await admin
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .or(`buyer_dealer_id.eq.${dealerId},seller_dealer_id.eq.${dealerId}`)
    .single();

  if (!deal) throw new Error("Deal not found or forbidden");

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  // 完了時は掲載を sold に
  if (status === "completed") {
    await admin
      .from("inventory_listings")
      .update({ status: "sold" })
      .eq("id", deal.listing_id);
  }
  // キャンセル時は掲載を active に戻す
  if (status === "cancelled") {
    await admin
      .from("inventory_listings")
      .update({ status: "active" })
      .eq("id", deal.listing_id);
  }

  const { data: updated, error } = await admin
    .from("deals")
    .update(update)
    .eq("id", dealId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated as Deal;
}

export async function getDealerDeals(dealerId: string): Promise<DealWithDetails[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("deals")
    .select(`
      *,
      listing:inventory_listings(id, public_id, make, model, year),
      buyer:dealers!deals_buyer_dealer_id_fkey(id, company_name),
      seller:dealers!deals_seller_dealer_id_fkey(id, company_name)
    `)
    .or(`buyer_dealer_id.eq.${dealerId},seller_dealer_id.eq.${dealerId}`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DealWithDetails[];
}

// ──────────────────────────────────────────
// Dealer
// ──────────────────────────────────────────

export async function updateDealer(
  dealerId: string,
  input: {
    company_name?: string;
    contact_name?: string | null;
    phone?: string | null;
    address?: string | null;
    prefecture?: string | null;
  }
): Promise<import("@/types/market").Dealer> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dealers")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", dealerId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as import("@/types/market").Dealer;
}
