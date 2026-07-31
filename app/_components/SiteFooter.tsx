import Image from "next/image";
import Link from "next/link";
import { school } from "./site-data";

export function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="footerMain">
        <Image src="/images/logo.webp" alt="Way to Success Standard Schools logo" width={76} height={76} />
        <div><strong>{school.name}</strong><p>{school.motto}</p></div>
      </div>
      <div><h2>Visit</h2><p>{school.address}</p></div>
      <div><h2>Contact</h2><a href={school.phoneHref}>{school.phone}</a><a href={school.emailHref}>{school.email}</a><a href={school.whatsappHref} target="_blank" rel="noreferrer">WhatsApp us</a></div>
      <div><h2>Explore</h2><Link href="/">Home</Link><Link href="/about">About Us</Link><Link href="/academics">Academics</Link><Link href="/school-life">School Life</Link><Link href="/gallery">Gallery</Link><Link href="/news">News &amp; Events</Link><Link href="/staff">Staff</Link><Link href="/admissions">Admissions</Link><Link href="/contact">Contact</Link></div>
      <div className="copyright">© {new Date().getFullYear()} Way to Success Standard Schools. All rights reserved.</div>
    </footer>
  );
}
