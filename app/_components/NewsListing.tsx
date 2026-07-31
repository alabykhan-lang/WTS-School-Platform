"use client";

import { useMemo, useState } from "react";
import { newsCategories, type NewsCategoryId, type NewsItem } from "../../data/news";
import { NewsCard } from "./NewsCard";

const INITIAL_VISIBLE_COUNT = 6;

type NewsListingProps = {
  items: readonly NewsItem[];
};

export function NewsListing({ items }: NewsListingProps) {
  const [activeCategory, setActiveCategory] = useState<NewsCategoryId | "all">("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const verifiedItemCount = items.filter((item) => !item.isSample).length;

  const categoryCounts = useMemo(() => new Map(
    newsCategories.map((category) => [category.id, items.filter((item) => item.category === category.id).length]),
  ), [items]);

  const filteredItems = activeCategory === "all"
    ? items
    : items.filter((item) => item.category === activeCategory);
  const visibleItems = filteredItems.slice(0, visibleCount);

  function selectCategory(categoryId: NewsCategoryId | "all") {
    setActiveCategory(categoryId);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }

  return (
    <section className="section newsListing" aria-labelledby="news-listing-heading">
      <div className="newsListingHead">
        <div>
          <p className="eyebrow">PUBLIC INFORMATION</p>
          <h2 id="news-listing-heading">Latest updates</h2>
        </div>
        <p>Browse announcements, school activities and future public notices in one place.</p>
      </div>

      {verifiedItemCount === 0 && (
        <aside className="newsEmpty" aria-label="No verified school news yet">
          <strong>No verified school news has been added yet.</strong>
          <p>The clearly labelled sample cards below demonstrate the public layout only. They are not school announcements, events or academic notices.</p>
        </aside>
      )}

      <div className="newsFilters" aria-label="Filter News and Events by category">
        <button type="button" className={activeCategory === "all" ? "isActive" : undefined} aria-pressed={activeCategory === "all"} onClick={() => selectCategory("all")}>All <span>{items.length}</span></button>
        {newsCategories.map((category) => {
          const count = categoryCounts.get(category.id) ?? 0;
          return <button key={category.id} type="button" className={activeCategory === category.id ? "isActive" : undefined} aria-pressed={activeCategory === category.id} disabled={count === 0} onClick={() => selectCategory(category.id)}>{category.label} <span>{count}</span></button>;
        })}
      </div>

      {visibleItems.length > 0 ? (
        <div className="newsGrid" aria-live="polite">
          {visibleItems.map((item) => <NewsCard item={item} key={item.id} />)}
        </div>
      ) : (
        <div className="newsFilterEmpty" role="status">There are no public items in this category yet.</div>
      )}

      {visibleCount < filteredItems.length && (
        <button className="newsLoadMore" type="button" onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE_COUNT)}>
          Load more updates
        </button>
      )}
    </section>
  );
}
