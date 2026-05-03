/**
 * SSRF (Server-Side Request Forgery) ガード。
 *
 * ユーザー由来の URL を server-side で fetch する場合に必ず通す検証。
 * 内部ネットワーク (10.0.0.0/8, 169.254.169.254 IMDS, localhost,
 * 192.168.0.0/16 等) や非 https を弾き、外部 webhook / OAuth callback /
 * 画像 URL 取得などで攻撃者が AWS metadata / 内部管理画面に到達するのを防ぐ。
 *
 * @example
 *   const url = z.string().url().parse(input.webhookUrl);
 *   assertSafeExternalUrl(url);            // throws if SSRF risk
 *   const res = await fetch(url, { ... });
 *
 * 例外を投げる代わりに boolean 判定が欲しければ `isSafeExternalUrl(url)`。
 *
 * 注意: DNS rebinding 完全対策には fetch 直前の IP を再解決して同一性を
 * 確認する必要がある。本実装は静的ホスト名チェックのみ。決済系で
 * 攻撃者制御の URL を fetch する用途では追加で IP pinning を実装すること。
 */

const ALLOWED_PROTOCOLS = new Set(["https:"]);

/**
 * IPv4 を 32-bit 整数に変換 (検証用)。失敗時は null。
 */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255 || /^0\d/.test(p)) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

function inCidr(ip: number, cidr: string): boolean {
  const [base, prefixStr] = cidr.split("/");
  const baseInt = ipv4ToInt(base);
  const prefix = Number(prefixStr);
  if (baseInt === null || !Number.isInteger(prefix)) return false;
  if (prefix === 0) return true;
  const mask = prefix === 32 ? 0xffffffff : ~((1 << (32 - prefix)) - 1) >>> 0;
  return (ip & mask) === (baseInt & mask);
}

/** RFC 1918 / loopback / link-local / metadata 等の禁止 CIDR 一覧。 */
const BLOCKED_IPV4_CIDRS = [
  "0.0.0.0/8", // current network
  "10.0.0.0/8", // RFC 1918
  "100.64.0.0/10", // CGNAT
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local + AWS / GCP / Azure metadata (169.254.169.254)
  "172.16.0.0/12", // RFC 1918
  "192.0.0.0/24", // IETF protocol assignments
  "192.0.2.0/24", // TEST-NET-1
  "192.168.0.0/16", // RFC 1918
  "198.18.0.0/15", // benchmark
  "198.51.100.0/24", // TEST-NET-2
  "203.0.113.0/24", // TEST-NET-3
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved
  "255.255.255.255/32", // broadcast
];

/** ホスト名が IPv4 リテラルなら、ブロック対象 CIDR に含まれていないか判定。 */
function isBlockedIpv4Literal(hostname: string): boolean {
  const ipInt = ipv4ToInt(hostname);
  if (ipInt === null) return false;
  return BLOCKED_IPV4_CIDRS.some((cidr) => inCidr(ipInt, cidr));
}

/** IPv6 リテラルの危険ホスト判定 (loopback / link-local / unique-local)。 */
function isBlockedIpv6Literal(hostname: string): boolean {
  // URL.hostname は IPv6 を [..] で囲んだまま返すケースもあるので両対応
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!h.includes(":")) return false;
  if (h === "::1" || h === "::") return true; // loopback / unspecified
  if (h.startsWith("fe80:") || h.startsWith("fec0:")) return true; // link-local / site-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // unique-local fc00::/7
  if (h.startsWith("ff")) return true; // multicast
  // IPv4-mapped IPv6 — Node の URL は dotted 形式を ::ffff:7f00:1 のような
  // 16-bit hex 2 ブロックに正規化する。両形式を判定する。
  const dotted = h.match(/^::ffff:([0-9.]+)$/);
  if (dotted && dotted[1] && isBlockedIpv4Literal(dotted[1])) return true;
  const hex = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    if (Number.isFinite(high) && Number.isFinite(low)) {
      const ipInt = ((high & 0xffff) << 16) | (low & 0xffff);
      if (BLOCKED_IPV4_CIDRS.some((cidr) => inCidr(ipInt >>> 0, cidr))) return true;
    }
  }
  return false;
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "ip6-localhost", "ip6-loopback", "broadcasthost"]);

export type SsrfCheckResult = { ok: true } | { ok: false; reason: string };

/**
 * URL を SSRF 観点で検証する。allowedProtocols / 追加 deny リストはオプション。
 */
export function checkExternalUrl(
  raw: string,
  options: { allowedProtocols?: Set<string>; extraBlockedHosts?: Set<string> } = {},
): SsrfCheckResult {
  if (!raw || typeof raw !== "string") return { ok: false, reason: "empty_url" };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  const protocols = options.allowedProtocols ?? ALLOWED_PROTOCOLS;
  if (!protocols.has(url.protocol)) {
    return { ok: false, reason: `protocol_not_allowed:${url.protocol}` };
  }

  // user:pass@ は credentials smuggling の温床。明示拒否する。
  if (url.username || url.password) {
    return { ok: false, reason: "embedded_credentials" };
  }

  const host = url.hostname.toLowerCase();
  if (!host) return { ok: false, reason: "empty_host" };
  if (BLOCKED_HOSTNAMES.has(host)) return { ok: false, reason: `blocked_hostname:${host}` };
  if (options.extraBlockedHosts?.has(host)) return { ok: false, reason: `denied_host:${host}` };

  // .local / .internal などの DNS suffix で内部解決される名前を弾く
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan") || host.endsWith(".intranet")) {
    return { ok: false, reason: `internal_tld:${host}` };
  }

  // ホスト名が IPv4/IPv6 リテラルの場合は CIDR 検証
  if (isBlockedIpv4Literal(host)) return { ok: false, reason: `blocked_ipv4:${host}` };
  if (isBlockedIpv6Literal(host)) return { ok: false, reason: `blocked_ipv6:${host}` };

  // ポートはスタンダードに限定 (80/443/8080 など意図しないポートで内部に当たるのを防ぐ)
  if (url.port && url.port !== "443" && url.port !== "") {
    // 明示ポートが許可リスト外
    return { ok: false, reason: `port_not_allowed:${url.port}` };
  }

  return { ok: true };
}

/** 検証通過時 true、失敗時 false。 */
export function isSafeExternalUrl(raw: string): boolean {
  return checkExternalUrl(raw).ok;
}

/** 検証失敗時に throw する厳格バージョン。route の入口で呼ぶ用途。 */
export function assertSafeExternalUrl(raw: string): void {
  const result = checkExternalUrl(raw);
  if (!result.ok) {
    throw new SsrfBlockedError(result.reason, raw);
  }
}

export class SsrfBlockedError extends Error {
  constructor(
    public reason: string,
    public url: string,
  ) {
    super(`SSRF blocked: ${reason}`);
    this.name = "SsrfBlockedError";
  }
}
