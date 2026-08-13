import type { MetadataRoute } from "next";
import { env } from "@/config/env";
import { SITE_IS_PUBLIC } from "@/config/seo";

/** layout.tsx의 metadata.robots와 반드시 같은 SITE_IS_PUBLIC 스위치를 따른다. */
export default function robots(): MetadataRoute.Robots {
  if (!SITE_IS_PUBLIC) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    ],
    sitemap: `${env.APP_BASE_URL}/sitemap.xml`,
  };
}
