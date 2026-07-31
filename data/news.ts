/**
 * Temporary public-news source.
 *
 * Replace this module with the authorised, read-only WTS publishing API when
 * the school-management publishing service is available. Keep the visibility
 * checks in this module (or their API equivalent) at the public boundary.
 */

export const newsCategories = [
  { id: "announcements", label: "Announcements" },
  { id: "school-events", label: "School Events" },
  { id: "academic-news", label: "Academic News" },
  { id: "competitions", label: "Competitions" },
  { id: "excursions", label: "Excursions" },
  { id: "examination-notices", label: "Examination Notices" },
  { id: "resumption-holiday-notices", label: "Resumption and Holiday Notices" },
  { id: "awards-achievements", label: "Awards and Achievements" },
  { id: "graduation-valedictory", label: "Graduation and Valedictory Activities" },
] as const;

export type NewsCategoryId = (typeof newsCategories)[number]["id"];
export type NewsStatus = "draft" | "pending-approval" | "published" | "archived";

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: readonly string[];
  category: NewsCategoryId;
  featuredImage?: {
    src: string;
    alt: string;
  };
  publishedAt?: string;
  eventDate?: string;
  author: string;
  status: NewsStatus;
  pinned: boolean;
  expiresAt?: string;
  showPublicly: boolean;
  /** Test-only content must remain visually and technically identifiable. */
  isSample?: boolean;
};

const localNews: readonly NewsItem[] = [
  {
    id: "sample-announcement-template",
    slug: "sample-announcement-template",
    title: "Sample announcement template",
    summary: "A clearly labelled preview of how a verified public school announcement will appear on this website.",
    content: [
      "This is a sample content layout for website testing. It is not an announcement from Way to Success Standard Schools and should not be treated as school information.",
      "Once an authorised publishing service is connected, approved notices can be published here with the correct title, summary, publication date, expiry date and supporting image where one is available.",
    ],
    category: "announcements",
    author: "WTS Website Preview",
    status: "published",
    pinned: true,
    showPublicly: true,
    isSample: true,
  },
  {
    id: "sample-school-event-template",
    slug: "sample-school-event-template",
    title: "Sample school event update",
    summary: "A labelled template for future verified event notices, programme updates and school-community activities.",
    content: [
      "This sample article demonstrates the full-event-update layout only. It does not announce an event, date, programme or activity for the school.",
      "Future event entries can include a confirmed date, venue details, approved photograph and any time-sensitive notice after review by an authorised school publisher.",
    ],
    category: "school-events",
    author: "WTS Website Preview",
    status: "published",
    pinned: false,
    showPublicly: true,
    isSample: true,
  },
  {
    id: "sample-academic-news-template",
    slug: "sample-academic-news-template",
    title: "Sample academic news update",
    summary: "A labelled template for future academic notices and verified school-learning updates.",
    content: [
      "This is a sample page for the public news structure. It contains no examination date, result, achievement, academic decision or other official school information.",
      "When real academic news is approved, it can be added through the future publishing service without changing the design or public route structure.",
    ],
    category: "academic-news",
    author: "WTS Website Preview",
    status: "published",
    pinned: false,
    showPublicly: true,
    isSample: true,
  },
];

export function getNewsCategory(categoryId: NewsCategoryId) {
  return newsCategories.find((category) => category.id === categoryId)!;
}

export function isPublicNewsItem(item: NewsItem, asOf = new Date()) {
  if (item.status !== "published" || !item.showPublicly) return false;
  if (!item.isSample && !item.publishedAt) return false;
  return !item.expiresAt || new Date(item.expiresAt).getTime() >= asOf.getTime();
}

function newsTimestamp(item: NewsItem) {
  return item.publishedAt ? new Date(item.publishedAt).getTime() : 0;
}

export function getPublicNewsItems(asOf = new Date()) {
  return [...localNews]
    .filter((item) => isPublicNewsItem(item, asOf))
    .sort((first, second) => {
      if (first.pinned !== second.pinned) return Number(second.pinned) - Number(first.pinned);
      return newsTimestamp(second) - newsTimestamp(first);
    });
}

export function getPublicNewsItemBySlug(slug: string, asOf = new Date()) {
  return getPublicNewsItems(asOf).find((item) => item.slug === slug);
}

export function getRelatedPublicNewsItems(item: NewsItem, limit = 3) {
  const items = getPublicNewsItems().filter((candidate) => candidate.slug !== item.slug);
  const sameCategory = items.filter((candidate) => candidate.category === item.category);
  return [...sameCategory, ...items.filter((candidate) => candidate.category !== item.category)].slice(0, limit);
}

/** Do not send test-only pages to search engines. Real public stories will join this automatically. */
export function getIndexablePublicNewsItems(): Array<NewsItem & { publishedAt: string }> {
  return getPublicNewsItems().filter((item): item is NewsItem & { publishedAt: string } => !item.isSample && Boolean(item.publishedAt));
}

export function formatNewsPublicationDate(item: NewsItem) {
  if (item.isSample) return "Sample publication date";

  if (!item.publishedAt) return "Publication date to be confirmed";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(item.publishedAt));
}
