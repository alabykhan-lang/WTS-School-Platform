import Image from "next/image";
import Link from "next/link";
import { formatNewsPublicationDate, getNewsCategory, type NewsItem } from "../../data/news";

type NewsCardProps = {
  item: NewsItem;
  variant?: "default" | "featured";
};

export function NewsCard({ item, variant = "default" }: NewsCardProps) {
  const category = getNewsCategory(item.category);

  return (
    <article className={`newsCard newsCard--${variant}`}>
      <div className="newsCardMedia">
        {item.featuredImage ? (
          <Image
            src={item.featuredImage.src}
            alt={item.featuredImage.alt}
            fill
            sizes={variant === "featured" ? "(max-width: 850px) 90vw, 46vw" : "(max-width: 700px) 90vw, (max-width: 1100px) 44vw, 29vw"}
          />
        ) : (
          <div className="newsPlaceholder" aria-hidden="true">
            <span>WTS</span>
            <strong>News &amp; Events</strong>
            <small>Public information</small>
          </div>
        )}
      </div>
      <div className="newsCardCopy">
        <div className="newsCardMeta">
          <span className="newsCategory">{category.label}</span>
          {item.isSample && <span className="sampleLabel">Sample only</span>}
        </div>
        <time dateTime={item.publishedAt}>{formatNewsPublicationDate(item)}</time>
        <h3><Link href={`/news/${item.slug}`}>{item.title}</Link></h3>
        <p>{item.summary}</p>
        <Link className="newsReadLink" href={`/news/${item.slug}`} aria-label={`Read ${item.title}`}>
          Read {item.isSample ? "sample" : "update"} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
