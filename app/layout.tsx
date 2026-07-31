import type { Metadata } from "next";
import "./globals.css";
import "./public-pass.css";
import { FloatingWhatsApp } from "./_components/FloatingWhatsApp";
import { SiteFooter } from "./_components/SiteFooter";
import { SiteHeader } from "./_components/SiteHeader";
import { school, siteKeywords } from "./_components/site-data";

const schoolStructuredData = {
  "@context": "https://schema.org",
  "@type": ["School", "EducationalOrganization"],
  name: school.name,
  alternateName: school.shortName,
  description: "A school in Ejigbo, Osun State, providing quality education with discipline from Creche through Senior Secondary School.",
  url: school.url,
  logo: `${school.url}/images/logo.webp`,
  image: `${school.url}/images/graduation.webp`,
  telephone: "+2347036521734",
  email: school.email,
  foundingDate: "2017",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Ifedapo Community, off Oko-Ijado Road",
    addressLocality: "Ejigbo",
    addressRegion: "Osun State",
    addressCountry: "NG",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+2347036521734",
    contactType: "admissions and general enquiries",
    availableLanguage: "English",
  },
  areaServed: "Ejigbo, Osun State, Nigeria",
};

export const metadata: Metadata = {
  metadataBase: new URL(school.url),
  title: {
    default: "Way to Success Standard Schools",
    template: "%s | Way to Success Standard Schools",
  },
  description: "Quality Education with Discipline — official website of Way to Success Standard Schools, Ejigbo, Osun State.",
  keywords: siteKeywords,
  applicationName: school.name,
  category: "Education",
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/images/logo.webp", type: "image/webp" }],
    shortcut: ["/images/logo.webp"],
    apple: [{ url: "/images/logo.webp", type: "image/webp" }],
  },
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: school.name,
    title: school.name,
    description: "Quality Education with Discipline — official website of Way to Success Standard Schools, Ejigbo, Osun State.",
    images: [{ url: "/images/graduation.webp", alt: "Way to Success Standard Schools graduating class at their valedictory celebration" }],
  },
  twitter: {
    card: "summary_large_image",
    title: school.name,
    description: "Quality Education with Discipline — official website of Way to Success Standard Schools, Ejigbo, Osun State.",
    images: ["/images/graduation.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><a className="skipLink" href="#main-content">Skip to main content</a><SiteHeader />{children}<SiteFooter /><FloatingWhatsApp /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolStructuredData) }} /></body>
    </html>
  );
}
