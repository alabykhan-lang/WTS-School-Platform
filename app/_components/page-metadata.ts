import type { Metadata } from "next";
import { school, siteKeywords } from "./site-data";

type PageMetadata = {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
  keywords?: string[];
};

export function createPageMetadata({ title, description, path, image, imageAlt, keywords = [] }: PageMetadata): Metadata {
  const fullTitle = `${title} | ${school.name}`;

  return {
    title,
    description,
    keywords: [...siteKeywords, ...keywords],
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: school.name,
      title: fullTitle,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
  };
}
