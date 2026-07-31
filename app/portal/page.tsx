import type { Metadata } from "next";
import Link from "next/link";
import { portalGroups, portalStatusLabels, type PortalServiceStatus } from "../../data/portal";
import { createPageMetadata } from "../_components/page-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Portal Gateway",
  description: "Explore the future WTS School Platform gateway for protected parent, student, staff and school-management services.",
  path: "/portal",
  image: "/images/campus2.webp",
  imageAlt: "A view across the Way to Success Standard Schools campus",
  keywords: ["WTS School Platform", "school portal Ejigbo", "student portal", "school management portal"],
});

function PortalStatus({ status }: { status: PortalServiceStatus }) {
  return <span className={`portalStatus portalStatus--${status}`}>{portalStatusLabels[status]}</span>;
}

export default function PortalPage() {
  return (
    <main id="main-content">
      <section className="portalHero">
        <div className="portalHeroContent">
          <p className="eyebrow light">THE WTS SCHOOL PLATFORM</p>
          <h1>One trusted gateway for school services.</h1>
          <p>Our unified platform is being prepared to connect school services clearly and securely—while keeping public school information separate from protected records and workspaces.</p>
          <div className="heroActions"><Link className="primaryButton" href="/">Back to main website</Link><a className="ghostButton" href="#portal-services">Explore services</a></div>
        </div>
        <aside className="portalHeroPanel" aria-label="Portal access information">
          <div><span>Public website</span><strong>School information and enquiries</strong><p>Open to everyone. No school account is needed.</p></div>
          <div><span>Protected services</span><strong>Verified access only</strong><p>Private records open only inside approved school systems.</p></div>
        </aside>
      </section>

      <section className="section portalIntroduction">
        <div><p className="eyebrow">A CLEARER DIGITAL JOURNEY</p><h2>Find the right service without compromising privacy.</h2></div>
        <div><p>Way to Success Standard Schools is preparing a unified gateway for parents, learners, staff and management. This page does not collect passwords, admission numbers or staff credentials.</p><p>When a protected service is ready, you will be directed to its own approved workspace, where access is checked separately.</p></div>
      </section>

      <section className="portalBoundaryBand" aria-label="Public and protected service boundary">
        <article><span>Public information</span><h2>Learn about the school openly.</h2><p>Admissions information, school life, news and contact details belong on the public website.</p></article>
        <article><span>Protected school services</span><h2>Access records through approved systems.</h2><p>Student, guardian, staff, attendance, results and communication records require verified permissions.</p></article>
      </section>

      <section className="portalServices section" id="portal-services" aria-labelledby="portal-services-heading">
        <div className="portalServicesHeading"><div><p className="eyebrow">SERVICE DIRECTORY</p><h2 id="portal-services-heading">Choose the pathway that fits your role.</h2></div><p><strong>Available</strong> means a confirmed protected specialist service exists. It does not mean that access has been granted to every visitor.</p></div>
        <div className="portalGroupGrid">
          {portalGroups.map((group) => <section className="portalGroup" key={group.id} aria-labelledby={`${group.id}-heading`}>
            <header><p>{group.label}</p><h3 id={`${group.id}-heading`}>{group.title}</h3><span>{group.description}</span></header>
            <div className="portalServiceList">
              {group.services.map((service) => <article className="portalService" key={service.title}>
                <div className="portalServiceTop"><PortalStatus status={service.status} /></div><h4>{service.title}</h4><p>{service.description}</p>
                {service.href ? <a className="portalServiceLink" href={service.href} target="_blank" rel="noreferrer" aria-label={`Open ${service.title} protected service in a new tab`}>Open protected service <span aria-hidden="true">↗</span></a> : <span className="portalServiceHint">Access pathway in preparation</span>}
              </article>)}
            </div>
          </section>)}
        </div>
      </section>

      <section className="portalSecurityBand"><div><p className="eyebrow light">SECURITY AND PRIVACY</p><h2>Private information deserves a protected route.</h2></div><ul><li>This public gateway never asks for your password, admission number or staff credentials.</li><li>Private records remain within authorised specialist systems and are not embedded into this public website.</li><li>Access will be based on verified school roles and permissions as the platform is integrated in phases.</li></ul></section>

      <section className="section portalReturnBand"><div><p className="eyebrow">NEED SCHOOL INFORMATION?</p><h2>Return to the public school website.</h2><p>Explore admissions, academics, school life, news and contact information without entering any private details.</p></div><Link className="primaryButton" href="/">Visit Way to Success Standard Schools</Link></section>
    </main>
  );
}
