"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const links = [
  ["About Us", "/about"],
  ["Academics", "/academics"],
  ["School Life", "/school-life"],
  ["Gallery", "/gallery"],
  ["News & Events", "/news"],
  ["Staff", "/staff"],
  ["Admissions", "/admissions"],
  ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || (href === "/news" && pathname.startsWith("/news/")) || (href === "/portal" && pathname.startsWith("/portal"));

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <header className="siteHeader">
      <Link className="brand" href="/" aria-label="Way to Success Standard Schools home">
        <Image src="/images/logo.webp" alt="Way to Success Standard Schools logo" width={58} height={58} priority />
        <span><strong>Way to Success</strong><small>Standard Schools · Ejigbo</small></span>
      </Link>
      <nav className="desktopNav" aria-label="Main navigation">
        {links.map(([label, href]) => <Link key={href} href={href} className={isActive(href) ? "active" : undefined} aria-current={isActive(href) ? "page" : undefined}>{label}</Link>)}
      </nav>
      <div className="headerActions">
        <Link className="headerButton" href="/portal/sign-in" aria-current={isActive("/portal") ? "page" : undefined}>Staff <span>Portal</span></Link>
        <button className="menuButton" type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((current) => !current)}>
          <i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" />
        </button>
      </div>
      <div id="mobile-navigation" className={`mobileNav ${open ? "isOpen" : ""}`} aria-hidden={!open}>
        <nav aria-label="Mobile navigation">
          {links.map(([label, href], index) => <Link key={href} href={href} tabIndex={open ? 0 : -1} className={isActive(href) ? "active" : undefined} aria-current={isActive(href) ? "page" : undefined} onClick={() => setOpen(false)}><span>0{index + 1}</span>{label}</Link>)}
          <Link href="/portal/sign-in" tabIndex={open ? 0 : -1} className={isActive("/portal") ? "active" : undefined} aria-current={isActive("/portal") ? "page" : undefined} onClick={() => setOpen(false)}>Staff Portal <em>Open</em></Link>
        </nav>
      </div>
    </header>
  );
}
