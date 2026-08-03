import iconv from "iconv-lite";

const CHARSET_HEADER_RE = /charset=["']?([\w-]+)/i;
const XML_DECL_RE = /^<\?xml[^>]*encoding=["']([\w-]+)["']/i;

function detectCharset(buffer: Buffer, contentTypeHeader: string | null): string {
  const fromHeader = contentTypeHeader?.match(CHARSET_HEADER_RE)?.[1];
  if (fromHeader) return fromHeader.toLowerCase();

  // XML 선언은 항상 ASCII 호환 바이트로 시작하므로 앞부분만 latin1로 읽어도 안전하다.
  const preamble = buffer.subarray(0, 200).toString("latin1");
  const fromDecl = preamble.match(XML_DECL_RE)?.[1];
  if (fromDecl) return fromDecl.toLowerCase();

  return "utf-8";
}

/**
 * 국내 RSS 피드 중 EUC-KR로 서빙되는 경우가 있다 (§14.2 필수 테스트 항목).
 * Content-Type 헤더 → XML 선언 순으로 인코딩을 추정하고, utf-8이 아니면 iconv-lite로 디코딩한다.
 */
export function decodeXml(buffer: Buffer, contentTypeHeader: string | null): string {
  const charset = detectCharset(buffer, contentTypeHeader);
  if (charset === "utf-8" || charset === "utf8") {
    return buffer.toString("utf-8");
  }
  if (!iconv.encodingExists(charset)) {
    return buffer.toString("utf-8");
  }
  return iconv.decode(buffer, charset);
}
