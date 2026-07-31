import type { Metadata } from "next";
import { NewsCard } from "../_components/NewsCard";
import { NewsListing } from "../_components/NewsListing";
import { createPageMetadata } from "../_components/page-metadata";
import { getPublicNewsItems } from "../../data/news";

export const metadata: Metadata = createPageMetadata({
  title: "News & Events",
  description: "Public announcements, school events and verified updates from Way to Success Standard Schools in Ejigbo, Osun State.",
  path: "/news",
  image: "/images/logo.webp",
  imageAlt: "Way to Success Standard Schools logo",
  keywords: ["Way to Success school news", "school announcements Ejigbo", "school events Ejigbo"],
});

export default function NewsPage() {
  const items = getPublicNewsItems();
  const featuredItem = items.find((item) => item.pinned) ?? items[0];

  return (
    <main id="main-content">
      <section className="newsBanner">
        <div className="newsBannerMark" aria-hidden="true"><span>WTS</span><i /></div>
        <div className="newsBannerContent">
          <p className="eyebrow light">NEWS &amp; EVENTS</p>
          <h1>Updates for our school community.</h1>
          <p>Verified public announcements, school events and important notices will be shared here as they are approved.</p>
        </div>
      </section>

      {featuredItem && (
        <section className="section newsFeatured" aria-labelledby="featured-news-heading">
          <div className="newsFeaturedHeading">
            <p className="eyebrow">FEATURED UPDATE</p>
            <h2 id="featured-news-heading">What matters now.</h2>
          </div>
          <NewsCard item={featuredItem} variant="featured" />
        </section>
      )}

      <NewsListing items={items} />
    </main>
  );
}
