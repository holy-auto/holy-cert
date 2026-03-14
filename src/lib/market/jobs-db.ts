import { createAdminClient } from "@/lib/supabase/admin";
import { makePublicId } from "@/lib/publicId";

export type JobOrder = {
  id: string;
  public_id: string;
  poster_dealer_id: string;
  title: string;
  description: string;
  service_category: string;
  prefecture: string;
  city: string | null;
  budget_min: number | null;
  budget_max: number | null;
  desired_date: string | null;
  deadline: string | null;
  status: string;
  assigned_dealer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type JobOrderWithDealer = JobOrder & {
  poster: { company_name: string; prefecture: string };
  _bid_count?: number;
};

export type JobBid = {
  id: string;
  job_order_id: string;
  bidder_dealer_id: string;
  bid_price: number | null;
  message: string;
  status: string;
  created_at: string;
};

export type JobBidWithDealer = JobBid & {
  bidder: { company_name: string; prefecture: string };
};

// ──────────────────────────────────────────
// Job Orders
// ──────────────────────────────────────────

export async function getOpenJobs(params?: {
  category?: string;
  prefecture?: string;
}): Promise<JobOrderWithDealer[]> {
  const admin = createAdminClient();
  let q = admin
    .from("job_orders")
    .select("*, poster:dealers!poster_dealer_id(company_name, prefecture)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (params?.category)   q = q.eq("service_category", params.category);
  if (params?.prefecture) q = q.eq("prefecture", params.prefecture);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as JobOrderWithDealer[];
}

export async function getJobByPublicId(publicId: string): Promise<JobOrderWithDealer | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("job_orders")
    .select("*, poster:dealers!poster_dealer_id(company_name, prefecture)")
    .eq("public_id", publicId)
    .single();

  return data as unknown as JobOrderWithDealer | null;
}

export async function getMyPostedJobs(dealerId: string): Promise<JobOrder[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_orders")
    .select("*")
    .eq("poster_dealer_id", dealerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as JobOrder[];
}

export async function getMyReceivedJobs(dealerId: string): Promise<JobOrderWithDealer[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_orders")
    .select("*, poster:dealers!poster_dealer_id(company_name, prefecture)")
    .eq("assigned_dealer_id", dealerId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as JobOrderWithDealer[];
}

export async function createJobOrder(
  posterDealerId: string,
  posterPrefecture: string,
  input: {
    title: string;
    description: string;
    service_category: string;
    prefecture: string;
    city?: string | null;
    budget_min?: number | null;
    budget_max?: number | null;
    desired_date?: string | null;
    deadline?: string | null;
  }
): Promise<JobOrder> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_orders")
    .insert({
      public_id: makePublicId(12),
      poster_dealer_id: posterDealerId,
      ...input,
      city:        input.city        ?? null,
      budget_min:  input.budget_min  ?? null,
      budget_max:  input.budget_max  ?? null,
      desired_date: input.desired_date ?? null,
      deadline:    input.deadline    ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as JobOrder;
}

export async function cancelJobOrder(dealerId: string, jobId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("job_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("poster_dealer_id", dealerId);
  if (error) throw new Error(error.message);
}

// ──────────────────────────────────────────
// Bids
// ──────────────────────────────────────────

export async function getBidsForJob(jobOrderId: string): Promise<JobBidWithDealer[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_bids")
    .select("*, bidder:dealers!bidder_dealer_id(company_name, prefecture)")
    .eq("job_order_id", jobOrderId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as JobBidWithDealer[];
}

export async function getMyBids(dealerId: string): Promise<(JobBid & { job_orders: JobOrder })[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_bids")
    .select("*, job_orders(*)")
    .eq("bidder_dealer_id", dealerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as (JobBid & { job_orders: JobOrder })[];
}

export async function submitBid(
  jobOrderId: string,
  bidderDealerId: string,
  input: { bid_price?: number | null; message: string }
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("job_bids")
    .insert({
      job_order_id: jobOrderId,
      bidder_dealer_id: bidderDealerId,
      bid_price: input.bid_price ?? null,
      message: input.message,
    });
  if (error) throw new Error(error.message);
}

export async function acceptBid(
  posterDealerId: string,
  jobOrderId: string,
  bidId: string,
  bidderDealerId: string
): Promise<void> {
  const admin = createAdminClient();

  // Accept the selected bid
  const { error: e1 } = await admin
    .from("job_bids")
    .update({ status: "accepted" })
    .eq("id", bidId);
  if (e1) throw new Error(e1.message);

  // Reject other bids
  const { error: e2 } = await admin
    .from("job_bids")
    .update({ status: "rejected" })
    .eq("job_order_id", jobOrderId)
    .neq("id", bidId);
  if (e2) throw new Error(e2.message);

  // Assign job
  const { error: e3 } = await admin
    .from("job_orders")
    .update({
      status: "assigned",
      assigned_dealer_id: bidderDealerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobOrderId)
    .eq("poster_dealer_id", posterDealerId);
  if (e3) throw new Error(e3.message);
}

export async function completeJob(dealerId: string, jobId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("job_orders")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("poster_dealer_id", dealerId);
  if (error) throw new Error(error.message);
}
