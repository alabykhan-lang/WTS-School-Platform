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
  ["Admissions", "/admissions"],
  ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="siteHeader">
      <Link className="brand" href="/" aria-label="Way to Success Standard Schools home">
        <Image src="/images/logo.webp" alt="Way to Success Standard Schools logo" width={58} height={58} priority />
        <span><strong>Way to Success</strong><small>Standard Schools · Ejigbo</small></span>
      </Link>
      <nav className="desktopNav" aria-label="Main navigation">
        {links.map(([label, href]) => <Link key={href} href={href} className={pathname === href ? "active" : undefined} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
      </nav>
      <div className="headerActions">
        <Link className="headerButton" href="/#portal-gateway">Portal <span>Coming soon</span></Link>
        <button className="menuButton" type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((current) => !current)}>
          <i /><i /><i />
        </button>
      </div>
      <div id="mobile-navigation" className={`mobileNav ${open ? "isOpen" : ""}`} aria-hidden={!open}>
        <nav aria-label="Mobile navigation">
          {links.map(([label, href], index) => <Link key={href} href={href} tabIndex={open ? 0 : -1} className={pathname === href ? "active" : undefined} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}><span>0{index + 1}</span>{label}</Link>)}
          <Link href="/#portal-gateway" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>Portal gateway <em>Coming soon</em></Link>
        </nav>
      </div>
    </header>
  );
}
