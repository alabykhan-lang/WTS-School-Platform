import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsCard } from "../../_components/NewsCard";
import { createPageMetadata } from "../../_components/page-metadata";
import { formatNewsPublicationDate, getNewsCategory, getPublicNewsItemBySlug, getPublicNewsItems, getRelatedPublicNewsItems } from "../../../data/news";

type NewsArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublicNewsItems().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: NewsArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getPublicNewsItemBySlug(slug);

  if (!item) return {};

  const pageMetadata = createPageMetadata({
      title: item.title,
      description: item.summary,
      path: `/news/${item.slug}`,
      image: item.featuredImage?.src ?? "/images/logo.webp",
      imageAlt: item.featuredImage?.alt ?? "Way to Success Standard Schools logo",
      keywords: ["Way to Success school news", getNewsCategory(item.category).label],
    });

  return {
    ...pageMetadata,
    openGraph: {
      ...pageMetadata.openGraph,
      type: "article",
      publishedTime: item.publishedAt,
      authors: [item.author],
    },
    robots: item.isSample ? { index: false, follow: true } : undefined,
  };
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const item = getPublicNewsItemBySlug(slug);

  if (!item) notFound();

  const category = getNewsCategory(item.category);
  const relatedItems = getRelatedPublicNewsItems(item);

  return (
    <main id="main-content">
      <article className="newsArticle">
        <nav className="newsBreadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/news">News &amp; Events</Link><span aria-hidden="true">/</span><span aria-current="page">{item.isSample ? "Sample" : category.label}</span>
        </nav>
        <header className="newsArticleHead">
          <div className="newsCardMeta"><span className="newsCategory">{category.label}</span>{item.isSample && <span className="sampleLabel">Sample only</span>}</div>
          <time dateTime={item.publishedAt}>{formatNewsPublicationDate(item)}</time>
          <h1>{item.title}</h1>
          <p>{item.summary}</p>
        </header>

        <div className="newsArticleMedia">
          {item.featuredImage ? (
            <Image src={item.featuredImage.src} alt={item.featuredImage.alt} fill sizes="(max-width: 1100px) 100vw, 86vw" />
          ) : (
            <div className="newsPlaceholder" aria-hidden="true"><span>WTS</span><strong>News &amp; Events</strong><small>Public information</small></div>
          )}
        </div>

        <div className="newsArticleBody">
          {item.isSample && <aside className="newsSampleNotice"><strong>Sample content only.</strong> This page is a test of the public news format and does not contain a real school announcement, event or academic notice.</aside>}
          {item.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <footer>Published by <strong>{item.author}</strong></footer>
        </div>
      </article>

      {relatedItems.length > 0 && (
        <section className="section relatedNews" aria-labelledby="related-news-heading">
          <div><p className="eyebrow">CONTINUE EXPLORING</p><h2 id="related-news-heading">More public updates</h2></div>
          <div className="newsGrid">{relatedItems.map((relatedItem) => <NewsCard item={relatedItem} key={relatedItem.id} />)}</div>
          <Link className="textLink" href="/news">Back to News &amp; Events →</Link>
        </section>
      )}
    </main>
  );
}
