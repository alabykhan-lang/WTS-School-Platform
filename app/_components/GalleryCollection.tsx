"use client";

import Image from "next/image";
import { useState } from "react";
import { galleryCategories, galleryImages, type GalleryCategoryId } from "./site-data";

const populatedCategories = galleryCategories.filter((category) =>
  category.id === "all" || galleryImages.some((image) => image.category === category.id),
);

const upcomingCategories = galleryCategories.filter(
  (category) => category.id !== "all" && !galleryImages.some((image) => image.category === category.id),
);

function imageCount(categoryId: GalleryCategoryId) {
  return categoryId === "all" ? galleryImages.length : galleryImages.filter((image) => image.category === categoryId).length;
}

export function GalleryCollection() {
  const [activeCategory, setActiveCategory] = useState<GalleryCategoryId>("all");
  const visibleImages = activeCategory === "all"
    ? galleryImages
    : galleryImages.filter((image) => image.category === activeCategory);

  return (
    <section className="section galleryCollection" aria-labelledby="gallery-collection-heading">
      <div className="galleryCollectionHead">
        <div>
          <p className="eyebrow">BROWSE THE COLLECTION</p>
          <h2 id="gallery-collection-heading">Real moments, organised for the story ahead.</h2>
        </div>
        <p>Choose a collection to explore the photographs currently available. New school photographs can be added to the categories already prepared below.</p>
      </div>

      <div className="galleryFilters" aria-label="Filter the school gallery">
        {populatedCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={activeCategory === category.id ? "isActive" : undefined}
            aria-pressed={activeCategory === category.id}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.label} <span>{imageCount(category.id)}</span>
          </button>
        ))}
      </div>

      <div className="galleryGrid" aria-live="polite">
        {visibleImages.map((image) => (
          <figure className={image.className} key={image.src}>
            <div className="galleryImage"><Image src={image.src} alt={image.alt} fill sizes={image.className ? "(max-width: 850px) 90vw, 62vw" : "(max-width: 850px) 90vw, 32vw"} /></div>
            <figcaption><span>{image.categoryLabel}</span><div><h3>{image.title}</h3><p>{image.text}</p></div></figcaption>
          </figure>
        ))}
      </div>

      <aside className="galleryFuture" aria-label="Upcoming gallery categories">
        <strong>Ready for future photographs</strong>
        <p>{upcomingCategories.map((category) => category.label).join(" · ")}</p>
      </aside>
    </section>
  );
}
