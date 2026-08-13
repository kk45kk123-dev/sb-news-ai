/**
 * 검색엔진 노출 여부를 켜고 끄는 단일 스위치. layout.tsx의 metadata.robots와
 * app/robots.ts가 둘 다 이 값을 참조한다 — 하나만 고치고 다른 하나를
 * 깜빡해서 "robots.txt는 열려 있는데 meta robots는 막혀 있는"(또는 반대)
 * 불일치가 생기는 걸 막기 위함이다.
 *
 * 실제 서비스로 공개할 준비가 되면 이 값을 true로 바꾼다.
 */
export const SITE_IS_PUBLIC = false;
