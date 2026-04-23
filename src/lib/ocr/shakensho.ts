/**
 * 車検証 (Vehicle Inspection Certificate) OCR parser
 *
 * Claude Vision を使って画像から構造化データを直接抽出する。
 * OCR → 正規表現 の二段ではなく、Vision モデルに JSON を返させる一段構成。
 */
import { getAnthropicClient, AI_MODEL_VISION, parseJsonResponse } from "@/lib/ai/client";

export interface ShakenshoData {
  /** 車名 (例: トヨタ) */
  maker?: string;
  /** 型式 (例: 6AA-MXPH15) */
  model?: string;
  /** 初度登録年月 — 和暦 or 西暦そのまま (例: 令和4年3月) */
  first_registration?: string;
  /** 車台番号 (例: MXPH15-0012345) */
  vin?: string;
  /** 長さ mm */
  length_mm?: number;
  /** 幅 mm */
  width_mm?: number;
  /** 高さ mm */
  height_mm?: number;
  /** 車両重量 kg */
  weight_kg?: number;
  /** 総排気量 cc */
  displacement_cc?: number;
  /** ナンバー表示 (例: 品川 300 あ 12-34) — 個人情報のため任意 */
  plate_display?: string;

  // ─── 二次元コード由来の追加フィールド（電子車検証 仕様書 2023.1版） ───

  /** 型式指定番号・類別区分番号（車両スペックDB検索の主キー） */
  model_code?: string;
  /** 自動車検査証の有効期間の満了する日 (YYYY-MM-DD) */
  expiry_date?: string;
  /** 原動機型式（エンジン型式） */
  engine_model?: string;
  /** 燃料の種類（例: "ガソリン", "軽油", "電気", "ガソリン・電気"） */
  fuel_type?: string;
  /** 車台番号打刻位置コード */
  chassis_punch_position?: string;
  /** 軸重 kg（前前・前後・後前・後後、各 10kg 単位を kg 換算） */
  axle_weights_kg?: {
    front_front?: number;
    front_rear?: number;
    rear_front?: number;
    rear_rear?: number;
  };
  /** 駆動方式（"全輪駆動" / "その他" / "一般車" / "設定値無し"） */
  drive_type?: string;
  /** 保安基準適用年月日 (YYYY-MM-DD) */
  safety_standard_date?: string;
}

/**
 * Calculate vehicle size class from dimensions (mm).
 * Volume thresholds in cubic meters:
 *   SS: < 8.0, S: 8.0-10.0, M: 10.0-12.0, L: 12.0-14.0, LL: 14.0-16.0, XL: 16.0+
 */
export function calcSizeClass(
  length_mm: number,
  width_mm: number,
  height_mm: number,
): string {
  const volume = (length_mm * width_mm * height_mm) / 1e9;
  if (volume < 8.0) return "SS";
  if (volume < 10.0) return "S";
  if (volume < 12.0) return "M";
  if (volume < 14.0) return "L";
  if (volume < 16.0) return "LL";
  return "XL";
}

type SupportedMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function detectMediaType(buf: Buffer): SupportedMediaType {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38
  ) {
    return "image/gif";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return "image/jpeg";
}

const SYSTEM_PROMPT = `あなたは日本の自動車車検証（自動車検査証）から情報を抽出する専門家です。
提供された画像から以下の項目を読み取り、JSONのみで回答してください。
読み取れない項目は値を null にしてください。推測や創作は絶対にしないでください。

回答形式（JSONのみ、コードフェンス不要）:
{
  "maker": "車名（例: トヨタ）| null",
  "model": "型式（例: 6AA-MXPH15）| null",
  "model_code": "型式指定番号・類別区分番号（例: 12345-0234）| null",
  "first_registration": "初度登録年月（例: 令和4年3月 もしくは 2022年3月）| null",
  "expiry_date": "自動車検査証の有効期間の満了する日（YYYY-MM-DD 形式）| null",
  "vin": "車台番号 | null",
  "length_mm": 長さのミリメートル数値 | null,
  "width_mm": 幅のミリメートル数値 | null,
  "height_mm": 高さのミリメートル数値 | null,
  "weight_kg": 車両重量のキログラム数値 | null,
  "displacement_cc": 総排気量のcc数値 | null,
  "fuel_type": "燃料の種類（例: ガソリン、軽油、電気、ガソリン・電気）| null",
  "plate_display": "自動車登録番号・車両番号（例: 品川 300 あ 12-34）| null"
}

注意:
- 寸法・重量・排気量は整数で返す（車検証の値をそのまま）
- 長さ・幅・高さはミリメートル、重量はキログラム、排気量はcc
- 有効期間満了日は西暦 YYYY-MM-DD 形式（和暦は西暦に変換）
- 車検証以外の画像や、読み取り不能な場合は全項目 null で返す`;

interface RawResponse {
  maker: string | null;
  model: string | null;
  model_code: string | null;
  first_registration: string | null;
  expiry_date: string | null;
  vin: string | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  weight_kg: number | null;
  displacement_cc: number | null;
  fuel_type: string | null;
  plate_display: string | null;
}

/**
 * 初度登録年月文字列から西暦年を抽出する。
 * - "2023-01", "2022年3月", "令和4年3月" など複数フォーマットに対応
 * - 抽出できない場合は null
 */
export function extractFirstRegistrationYear(
  firstRegistration: string | undefined,
): number | null {
  if (!firstRegistration) return null;

  const westernMatch = firstRegistration.match(/^(\d{4})/);
  if (westernMatch) {
    const y = parseInt(westernMatch[1], 10);
    if (y > 1900 && y < 2100) return y;
  }

  const eraPatterns: [RegExp, number][] = [
    [/令和\s*(\d+)/, 2018],
    [/平成\s*(\d+)/, 1988],
    [/昭和\s*(\d+)/, 1925],
    [/大正\s*(\d+)/, 1911],
  ];

  for (const [re, base] of eraPatterns) {
    const m = firstRegistration.match(re);
    if (m) return base + parseInt(m[1], 10);
  }

  return null;
}

export type ShakenshoSource = "qr" | "ocr";

export interface ShakenshoParseResult {
  data: ShakenshoData;
  source: ShakenshoSource;
}

/**
 * 車検証画像を「2Dコード→失敗時はClaude Vision OCR」の順で解析する。
 *
 * 2Dコードが取れた場合でもフィールドは限定的な場合があるので、
 * 呼び出し側は result.source を記録しておくと将来のデータ品質追跡に使える。
 */
export async function parseShakenshoAuto(imageBuffer: Buffer): Promise<ShakenshoParseResult> {
  // QR/DataMatrix が読めれば高精度・低コスト
  const { decode2DCode, parseShakenshoCode } = await import("./shakensho-qr");
  const raw = await decode2DCode(imageBuffer);
  if (raw) {
    const parsed = parseShakenshoCode(raw);
    if (parsed && Object.keys(parsed).length > 0) {
      return { data: parsed, source: "qr" };
    }
  }

  // フォールバック: Claude Vision OCR
  const data = await parseShakensho(imageBuffer);
  return { data, source: "ocr" };
}

/**
 * 車検証画像を Claude Vision で解析し、構造化データを返す。
 *
 * @param imageBuffer - Raw image bytes (JPEG, PNG, GIF, WEBP)
 * @returns Parsed vehicle data
 */
export async function parseShakensho(imageBuffer: Buffer): Promise<ShakenshoData> {
  const client = getAnthropicClient();
  const mediaType = detectMediaType(imageBuffer);
  const base64 = imageBuffer.toString("base64");

  const msg = await client.messages.create({
    model: AI_MODEL_VISION,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: "この車検証画像から指定項目をJSONで抽出してください。",
          },
        ],
      },
    ],
  });

  const text = msg.content[0]?.type === "text" ? msg.content[0].text : "{}";
  const raw = parseJsonResponse<Partial<RawResponse>>(text);

  const data: ShakenshoData = {};
  if (raw.maker) data.maker = raw.maker;
  if (raw.model) data.model = raw.model;
  if (raw.model_code) data.model_code = raw.model_code;
  if (raw.first_registration) data.first_registration = raw.first_registration;
  if (raw.expiry_date) data.expiry_date = raw.expiry_date;
  if (raw.vin) data.vin = raw.vin;
  if (typeof raw.length_mm === "number" && raw.length_mm > 0) data.length_mm = raw.length_mm;
  if (typeof raw.width_mm === "number" && raw.width_mm > 0) data.width_mm = raw.width_mm;
  if (typeof raw.height_mm === "number" && raw.height_mm > 0) data.height_mm = raw.height_mm;
  if (typeof raw.weight_kg === "number" && raw.weight_kg > 0) data.weight_kg = raw.weight_kg;
  if (typeof raw.displacement_cc === "number" && raw.displacement_cc > 0) {
    data.displacement_cc = raw.displacement_cc;
  }
  if (raw.fuel_type) data.fuel_type = raw.fuel_type;
  if (raw.plate_display) data.plate_display = raw.plate_display;

  return data;
}
