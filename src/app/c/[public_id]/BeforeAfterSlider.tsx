type Props = {
  beforeSrc: string;
  afterSrc: string;
  caption: string | null;
  width: number | null;
  height: number | null;
};

/**
 * Before-After 表示。
 *
 * 注: PR-B 段階では「Before / After を 2 枚並列で表示する」フォールバック実装。
 * PR-C で range input + clip-path によるインタラクティブスライダーに差し替える。
 * 公開ページが PR-B 単独でも壊れないようにするためのプレースホルダ。
 */
export default function BeforeAfterSlider({ beforeSrc, afterSrc, caption, width, height }: Props) {
  const aspectRatio = width && height && width > 0 && height > 0 ? `${width} / ${height}` : "4 / 3";
  const label = caption ?? "Before / After";

  return (
    <figure className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <div
          className="relative overflow-hidden rounded-lg border border-border-default bg-base"
          style={{ aspectRatio }}
        >
          <img
            src={beforeSrc}
            alt={`${label} (Before)`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
            BEFORE
          </span>
        </div>
        <div
          className="relative overflow-hidden rounded-lg border border-border-default bg-base"
          style={{ aspectRatio }}
        >
          <img
            src={afterSrc}
            alt={`${label} (After)`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
            AFTER
          </span>
        </div>
      </div>
      {caption ? <figcaption className="text-xs text-muted">{caption}</figcaption> : null}
    </figure>
  );
}
