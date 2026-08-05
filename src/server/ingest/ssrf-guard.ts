import dns from "node:dns/promises";
import net from "node:net";

/**
 * SSRF 방지: 관리자가 붙여넣은 URL을 서버가 대신 fetch하므로, DNS가 사설/루프백
 * 대역으로 resolve되면 내부망 스캐너로 악용될 수 있다. 호스트명뿐 아니라
 * 실제 resolve된 IP를 검사해야 "example.com이 169.254.169.254를 가리키도록"
 * 하는 DNS 리바인딩도 막힌다.
 */
export class SsrfBlockedError extends Error {}

const BLOCKED_V4_RANGES: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local incl. cloud metadata (169.254.169.254)
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
];

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isBlockedV4(ip: string): boolean {
  const target = ipv4ToInt(ip);
  return BLOCKED_V4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (target & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedV6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" || // loopback
    normalized.startsWith("fe80:") || // link-local
    normalized.startsWith("fc") || // unique local fc00::/7
    normalized.startsWith("fd") ||
    normalized === "::" ||
    normalized.startsWith("::ffff:") // v4-mapped — validate the embedded v4 part too
  );
}

export function isBlockedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedV4(ip);
  if (family === 6) {
    if (ip.toLowerCase().startsWith("::ffff:")) {
      const v4 = ip.split(":").pop()!;
      if (net.isIP(v4) === 4) return isBlockedV4(v4);
    }
    return isBlockedV6(ip);
  }
  return true; // couldn't parse — fail closed
}

/**
 * URL의 호스트명을 실제로 resolve해서 사설/루프백/링크로컬 대역이면 거부한다.
 * fetch 직전, 그리고 매 redirect hop마다 호출해야 한다.
 */
export async function assertPublicUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError("올바른 URL 형식이 아닙니다.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfBlockedError("http/https URL만 허용됩니다.");
  }

  // Literal-IP hosts (no DNS lookup involved) need the same check.
  if (net.isIP(url.hostname)) {
    if (isBlockedIp(url.hostname)) {
      throw new SsrfBlockedError("내부 네트워크 주소는 허용되지 않습니다.");
    }
    return;
  }

  let records: string[];
  try {
    const results = await dns.lookup(url.hostname, { all: true, verbatim: true });
    records = results.map((r) => r.address);
  } catch {
    throw new SsrfBlockedError("호스트를 찾을 수 없습니다.");
  }

  if (records.length === 0 || records.some(isBlockedIp)) {
    throw new SsrfBlockedError("내부 네트워크 주소로 연결되는 URL은 허용되지 않습니다.");
  }
}
