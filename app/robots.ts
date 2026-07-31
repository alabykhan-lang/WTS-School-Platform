import type { MetadataRoute } from "next";
import { school } from "./_components/site-data";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${school.url}/sitemap.xml`,
    host: school.url,
  };
}
