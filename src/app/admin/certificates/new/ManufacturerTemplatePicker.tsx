"use client";

import { useEffect, useState } from "react";
import type { CertifiedTemplateEntry } from "@/lib/manufacturers/certifiedTemplates";
import { MANUFACTURER_SERVICE_TYPE_LABELS } from "@/types/manufacturer";

type Props = {
  /**
   * Optional filter: if the parent form already knows the service type
   * (coating / ppf / maintenance / body_repair), surface only templates
   * matching it. Templates with no service_type are always shown.
   */
  serviceType?: string;
  /** Name of the hidden input to inject into the surrounding form. */
  fieldName?: string;
};

/**
 * メーカー指定デザインのテンプレートピッカー。
 *
 * 施工店が認定済みのメーカーが1社でもあれば選択肢を表示し、
 * 何も認定されていなければ自身を非表示にする。選んだ値は
 * `<input type="hidden" name={fieldName}>` で親 form に渡し、
 * 既存のテンプレート機構 (tid / template_id) には触らない。
 */
export default function ManufacturerTemplatePicker({ serviceType, fieldName = "manufacturer_template_id" }: Props) {
  const [entries, setEntries] = useState<CertifiedTemplateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/manufacturers/templates", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { entries: CertifiedTemplateEntry[] };
        if (cancelled) return;
        setEntries(json.entries ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Flatten templates and apply optional service_type filter. Templates
  // with a null service_type are kept regardless so contractors can
  // always pick a generic manufacturer design.
  const flat = entries.flatMap((e) =>
    e.templates
      .filter((t) => !serviceType || !t.service_type || t.service_type === serviceType)
      .map((t) => ({ entry: e, template: t })),
  );

  if (loading) return null;
  if (flat.length === 0) {
    // Tenant has no active certifications, or none of them match
    // serviceType. Render nothing so the existing UI is unaffected.
    return null;
  }

  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-muted">MANUFACTURER DESIGN</div>
          <div className="mt-1 text-base font-semibold text-primary">メーカー指定デザインで発行する</div>
          <p className="mt-1 text-xs text-secondary">
            認定施工店として、メーカー協議で固定されたデザインの証明書を発行できます。
            選択するとPDFが当該メーカーのテンプレートで生成されます。
          </p>
        </div>
      </div>

      <input type="hidden" name={fieldName} value={selected} />

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-xl border border-border-default bg-surface px-3 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
      >
        <option value="">標準デザインで発行（メーカー指定なし）</option>
        {entries.map((e) => {
          const opts = e.templates.filter((t) => !serviceType || !t.service_type || t.service_type === serviceType);
          if (opts.length === 0) return null;
          return (
            <optgroup key={e.manufacturer.id} label={e.manufacturer.name}>
              {opts.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.service_type ? ` (${MANUFACTURER_SERVICE_TYPE_LABELS[t.service_type]})` : ""}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </div>
  );
}
