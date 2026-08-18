/**
 * RSS 자동수집 파이프라인이 쓰는 조직별 커스텀 카테고리(scripts/seed-sources.ts의
 * 13개, Category/ArticleCategory 모델)를 공개 사이트가 실제로 읽는 고정 9개
 * 카테고리(src/data/categories.ts, Article.categoryId)로 매핑한다.
 *
 * 왜 필요한가: RSS로 수집된 기사는 지금까지 Article.categoryId가 한 번도
 * 채워지지 않아 article.service.ts의 toNewsDto()가 "c8"(산업동향)로 항상
 * 폴백했다 — AI가 ArticleCategory에 정확히 분류해둔 데이터가 있는데도 공개
 * 화면엔 실제 주제와 무관하게 전부 "산업동향"으로만 보였다.
 *
 * 이 매핑은 순수 엔지니어링 결정이 아니라 편집 판단이 섞여 있다 — 두 체계의
 * 세분화 정도가 다르고(13개 vs 9개), 증시/글로벌경제(c5/c6)에 정확히
 * 대응하는 RSS 카테고리가 애초에 없다(seed-sources.ts의 13개 목록 자체의
 * 한계). 그래서 이 표 하나에 모아 명시적으로 관리한다 — 나중에 실제 RSS
 * 콘텐츠를 보고 재조정이 필요할 수 있다.
 */
export const RSS_CATEGORY_TO_SITE_CATEGORY: Record<string, string> = {
  정책: "c1", // 금융정책
  금리: "c1",
  "규제/감독": "c1",
  "대출/여신": "c2", // 은행
  "건전성/리스크": "c3", // 저축은행 — 이 서비스의 핵심 주제라 저축은행 업계 건전성 관련 기사를 우선 배정
  "PF/부동산": "c4", // 부동산
  핀테크: "c7", // 핀테크
  AI: "c7",
  디지털전환: "c7",
  사이버보안: "c9", // 보안
  ESG: "c8", // 산업동향
  업계동향: "c8",
  기타: "c8",
};

/** 매핑에 없는 RSS 카테고리명(향후 추가되거나 오타)에 대한 안전한 기본값. */
export const SITE_CATEGORY_FALLBACK = "c8";

export function mapRssCategoryToSiteCategory(rssCategoryName: string): string {
  return RSS_CATEGORY_TO_SITE_CATEGORY[rssCategoryName] ?? SITE_CATEGORY_FALLBACK;
}

/** 특정 사이트 카테고리(c1..c9)에 대응하는 RSS 카테고리명 전부 — 목록 필터링에 사용. */
export function findRssCategoryNamesForSiteCategory(siteCategoryId: string): string[] {
  return Object.entries(RSS_CATEGORY_TO_SITE_CATEGORY)
    .filter(([, mapped]) => mapped === siteCategoryId)
    .map(([rssName]) => rssName);
}
