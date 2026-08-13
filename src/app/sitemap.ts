import type { MetadataRoute } from "next";
import { prisma } from "@/server/db/client";
import { env } from "@/config/env";
import { DEFAULT_ORG_ID } from "@/config/constants";
import { SITE_IS_PUBLIC } from "@/config/seo";

const SITEMAP_ARTICLE_LIMIT = 5000; // Next.js 단일 sitemap 파일 상한(50,000)보다 여유있게 낮춤

const STATIC_ROUTES = ["/", "/news", "/search", "/bookmarks", "/briefing"];

/** SITE_IS_PUBLIC이 꺼져 있는 동안엔 robots.ts가 어차피 전부 Disallow하므로 URL만
 *  준비해두고 실제 인덱싱은 막힌 상태를 유지한다 — 켜는 순간 바로 쓸 수 있다. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_BASE_URL;
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "hourly",
    priority: path === "/" ? 1 : 0.6,
  }));

  if (!SITE_IS_PUBLIC) return staticEntries;

  const articles = await prisma.article.findMany({
    where: { orgId: DEFAULT_ORG_ID, status: "published" },
    select: { id: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
    take: SITEMAP_ARTICLE_LIMIT,
  });

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/news/${a.id}`,
    lastModified: a.publishedAt,
    changeFrequency: "never",
    priority: 0.8,
  }));

  return [...staticEntries, ...articleEntries];
}
