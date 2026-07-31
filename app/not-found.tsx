import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main id="main-content" className="notFound">
      <section className="notFoundCard" aria-labelledby="not-found-heading">
        <Image src="/images/logo.webp" alt="Way to Success Standard Schools logo" width={104} height={104} priority />
        <p className="eyebrow">PAGE NOT FOUND</p>
        <h1 id="not-found-heading">This page is not part of the school journey.</h1>
        <p>The link may have changed, or the page may not be available yet. Use one of these links to continue exploring Way to Success Standard Schools.</p>
        <div className="notFoundActions"><Link className="primaryButton" href="/">Back to homepage</Link><Link className="ghostButton" href="/admissions">Admissions information</Link></div>
        <nav className="notFoundLinks" aria-label="Useful pages"><Link href="/about">About Us</Link><Link href="/academics">Academics</Link><Link href="/school-life">School Life</Link><Link href="/gallery">Gallery</Link><Link href="/contact">Contact Us</Link></nav>
      </section>
    </main>
  );
}
