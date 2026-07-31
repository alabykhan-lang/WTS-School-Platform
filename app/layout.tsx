import type { Metadata } from "next";
import "./globals.css";
import { FloatingWhatsApp } from "./_components/FloatingWhatsApp";
import { SiteFooter } from "./_components/SiteFooter";
import { SiteHeader } from "./_components/SiteHeader";

export const metadata: Metadata = {
  title: {
    default: "Way to Success Standard Schools",
    template: "%s | Way to Success Standard Schools",
  },
  description: "Quality Education with Discipline — official website of Way to Success Standard Schools, Ejigbo, Osun State.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><a className="skipLink" href="#main-content">Skip to main content</a><SiteHeader />{children}<SiteFooter /><FloatingWhatsApp /></body>
    </html>
  );
}
