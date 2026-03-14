import { createAdminClient } from "@/lib/supabase/admin";
import { makePublicId } from "@/lib/publicId";

export type NewsArticle = {
  id: string;
  public_id: string;
  title: string;
  body: string;
  category: string;
  source_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getPublishedNews(limit = 30): Promise<NewsArticle[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("industry_news")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as NewsArticle[];
}

export async function getNewsById(publicId: string): Promise<NewsArticle | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("industry_news")
    .select("*")
    .eq("public_id", publicId)
    .eq("is_published", true)
    .single();

  return data as NewsArticle | null;
}

export async function getAllNewsAdmin(): Promise<NewsArticle[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("industry_news")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as NewsArticle[];
}

export async function createNews(input: {
  title: string;
  body: string;
  category: string;
  source_url?: string | null;
  is_published?: boolean;
}): Promise<NewsArticle> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("industry_news")
    .insert({
      public_id: makePublicId(12),
      title: input.title,
      body: input.body,
      category: input.category,
      source_url: input.source_url ?? null,
      is_published: input.is_published ?? false,
      published_at: input.is_published ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as NewsArticle;
}

export async function updateNews(
  id: string,
  input: {
    title?: string;
    body?: string;
    category?: string;
    source_url?: string | null;
    is_published?: boolean;
  }
): Promise<void> {
  const admin = createAdminClient();
  const update: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };
  if (input.is_published && !("published_at" in update)) {
    update.published_at = new Date().toISOString();
  }

  const { error } = await admin
    .from("industry_news")
    .update(update)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteNews(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("industry_news").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
