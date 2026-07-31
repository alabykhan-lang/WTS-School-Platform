import type { MetadataRoute } from "next";
import { school } from "./_components/site-data";
import { getIndexablePublicNewsItems } from "../data/news";

const pages = ["", "/about", "/academics", "/school-life", "/gallery", "/news", "/staff", "/portal", "/admissions", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages: MetadataRoute.Sitemap = pages.map((path) => ({
    url: `${school.url}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/admissions" || path === "/contact" || path === "/news" ? 0.9 : 0.8,
  }));

  const newsPages: MetadataRoute.Sitemap = getIndexablePublicNewsItems().map((item) => ({
    url: `${school.url}/news/${item.slug}`,
    lastModified: new Date(item.publishedAt),
    changeFrequency: "monthly" as const,
    priority: item.pinned ? 0.8 : 0.7,
  }));

  return [...publicPages, ...newsPages];
}
