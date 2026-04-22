import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";
import { getContentBySlug } from "@/lib/marketing/content";

export const alt = "Ledra 導入事例";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await getContentBySlug("cases", slug);

  return makeOgImage({
    badge: "CASE STUDY",
    title: entry?.frontmatter.title ?? "Ledra 導入事例",
    subtitle: entry?.frontmatter.excerpt,
  });
}
