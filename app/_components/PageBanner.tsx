import Image from "next/image";

type PageBannerProps = {
  eyebrow: string;
  title: string;
  summary: string;
  image: string;
  alt: string;
  position?: string;
};

export function PageBanner({ eyebrow, title, summary, image, alt, position }: PageBannerProps) {
  return (
    <section className="pageBanner">
      <Image className="pageBannerImage" src={image} alt={alt} fill priority sizes="100vw" style={{ objectPosition: position }} />
      <div className="pageBannerShade" />
      <div className="pageBannerContent"><p className="eyebrow light">{eyebrow}</p><h1>{title}</h1><p>{summary}</p></div>
    </section>
  );
}
