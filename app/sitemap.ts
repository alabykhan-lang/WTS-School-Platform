import type { MetadataRoute } from "next";
import { school } from "./_components/site-data";

const pages = ["", "/about", "/academics", "/school-life", "/gallery", "/staff", "/admissions", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((path) => ({
    url: `${school.url}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/admissions" || path === "/contact" ? 0.9 : 0.8,
  }));
}
