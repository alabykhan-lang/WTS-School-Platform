import type { Metadata } from "next";
import Link from "next/link";
import { portalGroups, portalStatusLabels, type PortalServiceStatus } from "../../data/portal";
import { createPageMetadata } from "../_components/page-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Staff and Management Portal",
  description: "Explore the future WTS School Platform workspace for authorised staff, school management and result administration.",
  path: "/portal",
  image: "/images/campus2.webp",
  imageAlt: "A view across the Way to Success Standard Schools campus",
  keywords: ["WTS School Platform", "staff workspace", "school management portal", "result management"],
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
          <h1>One trusted gateway for authorised school work.</h1>
          <p>The first rollout is being shaped for staff and school management, with Result Management as the first specialist system to connect. Public school information stays separate from protected workspaces.</p>
          <div className="heroActions"><Link className="primaryButton" href="/portal/sign-in">Staff and management sign in</Link><a className="ghostButton" href="#portal-services">Explore workspaces</a></div>
        </div>
        <aside className="portalHeroPanel" aria-label="Portal access information">
          <div><span>Public website</span><strong>School information and enquiries</strong><p>Open to everyone. No school account is needed.</p></div>
          <div><span>Protected workspaces</span><strong>Staff and management only</strong><p>Existing Central Registry identities are verified before an authorised workspace is shown.</p></div>
        </aside>
      </section>

      <section className="section portalIntroduction">
        <div><p className="eyebrow">A SAFER FIRST ROLLOUT</p><h2>One verified identity. Only authorised school work.</h2></div>
        <div><p>Way to Success Standard Schools now verifies active Central Registry staff identities before showing the Staff Workspace. Modules, actions, classes and subjects remain assigned individually by management.</p><p>Parents and students are not part of this first portal rollout. Their future services remain deferred until management approves a separate, secure access design.</p></div>
      </section>

      <section className="portalBoundaryBand" aria-label="Public and protected service boundary">
        <article><span>Public information</span><h2>Learn about the school openly.</h2><p>Admissions information, school life, news and contact details belong on the public website.</p></article>
        <article><span>Protected school work</span><h2>Use authorised systems with care.</h2><p>Staff, management, attendance, results and communication work require verified permissions inside approved school services.</p></article>
      </section>

      <section className="portalServices section" id="portal-services" aria-labelledby="portal-services-heading">
        <div className="portalServicesHeading"><div><p className="eyebrow">WORKSPACE DIRECTORY</p><h2 id="portal-services-heading">Choose the pathway that fits your responsibility.</h2></div><p><strong>Available</strong> applies only to the current Result Portal for authorised users. Every other specialist service remains a clearly labelled preview, planned module or development item.</p></div>
        <div className="portalGroupGrid">
          {portalGroups.map((group) => <section className="portalGroup" key={group.id} aria-labelledby={`${group.id}-heading`}>
            <header><p>{group.label}</p><h3 id={`${group.id}-heading`}>{group.title}</h3><span>{group.description}</span></header>
            <div className="portalServiceList">
              {group.services.map((service) => <article className="portalService" key={service.title}>
                <div className="portalServiceTop"><PortalStatus status={service.status} /></div><h4>{service.title}</h4><p>{service.description}</p>
                {service.external ? <a className="portalServiceLink" href={service.href} target="_blank" rel="noreferrer" aria-label={`${service.actionLabel}: opens the separately protected Result Portal in a new tab`}>{service.actionLabel} <span aria-hidden="true">↗</span></a> : <Link className="portalServiceLink" href={service.href}>{service.actionLabel} <span aria-hidden="true">→</span></Link>}
              </article>)}
            </div>
          </section>)}
        </div>
      </section>

      <section className="portalSecurityBand"><div><p className="eyebrow light">SECURITY AND PRIVACY</p><h2>Private school work deserves a protected route.</h2></div><ul><li>Credentials are collected only on the dedicated protected sign-in route, never on this public gateway.</li><li>Every workspace read checks active employment, account status and explicit Central Registry access again.</li><li>The existing Result Portal remains a separate protected system while its older data-access model is replaced.</li></ul></section>

      <section className="section portalReturnBand"><div><p className="eyebrow">NEED SCHOOL INFORMATION?</p><h2>Return to the public school website.</h2><p>Explore admissions, academics, school life, news and contact information without entering any private details.</p></div><Link className="primaryButton" href="/">Visit Way to Success Standard Schools</Link></section>
    </main>
  );
}
