import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/market/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addListingImage, deleteListingImage } from "@/lib/market/db";

type Params = { params: Promise<{ id: string }> };

// オーナー確認ヘルパー
async function verifyOwner(listingId: string, dealerId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("inventory_listings")
    .select("dealer_id")
    .eq("id", listingId)
    .single();
  if (!data) return false;
  return data.dealer_id === dealerId;
}

// POST: 画像アップロード
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: listingId } = await params;
  if (!(await verifyOwner(listingId, session.dealer.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `market/listings/${listingId}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("assets")
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const image = await addListingImage(listingId, storagePath, sortOrder);
  return NextResponse.json({ image }, { status: 201 });
}

// PATCH: 並び順一括更新 { orders: [{id, sort_order}] }
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: listingId } = await params;
  if (!(await verifyOwner(listingId, session.dealer.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const orders: { id: string; sort_order: number }[] = body.orders ?? [];
  if (!Array.isArray(orders) || orders.length === 0) {
    return NextResponse.json({ error: "orders array is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  await Promise.all(
    orders.map(({ id, sort_order }) =>
      admin.from("listing_images").update({ sort_order }).eq("id", id).eq("listing_id", listingId)
    )
  );

  return NextResponse.json({ success: true });
}

// DELETE: 画像削除 { image_id }
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: listingId } = await params;
  const body = await req.json();
  const { image_id } = body;
  if (!image_id) return NextResponse.json({ error: "image_id is required" }, { status: 400 });

  // storage_path を先に取得してからレコード削除（順序が重要）
  const admin = createAdminClient();
  const { data: img } = await admin
    .from("listing_images")
    .select("storage_path")
    .eq("id", image_id)
    .eq("listing_id", listingId)
    .single();

  try {
    await deleteListingImage(image_id, session.dealer.id);
    if (img?.storage_path) {
      await admin.storage.from("assets").remove([img.storage_path]);
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
