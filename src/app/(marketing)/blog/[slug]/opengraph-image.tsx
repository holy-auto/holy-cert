import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";
import { getContentBySlug } from "@/lib/marketing/content";

export const alt = "Ledra ブログ";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await getContentBySlug("blog", slug);

  return makeOgImage({
    badge: "BLOG",
    title: entry?.frontmatter.title ?? "Ledra ブログ",
    subtitle: entry?.frontmatter.excerpt,
  });
}
