/** 整備作業種別プリセット */
export const WORK_TYPE_LABELS: Record<string, string> = {
  periodic_inspection: "定期点検",
  vehicle_inspection: "車検",
  oil_change: "オイル交換",
  tire_change: "タイヤ交換",
  brake_service: "ブレーキ整備",
  battery_replacement: "バッテリー交換",
  air_filter: "エアフィルター交換",
  coolant_change: "冷却水交換",
  transmission_service: "トランスミッション整備",
  suspension_service: "サスペンション整備",
  alignment: "アライメント調整",
  ac_service: "エアコン整備",
  wiper_replacement: "ワイパー交換",
  light_replacement: "ライト交換",
  other: "その他",
};

/** 作業種別コードを日本語ラベルに変換 */
export function getWorkTypeLabel(code: string): string {
  return WORK_TYPE_LABELS[code] ?? code;
}

/** 整備作業種別選択肢 */
export const WORK_TYPE_OPTIONS = Object.entries(WORK_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);
