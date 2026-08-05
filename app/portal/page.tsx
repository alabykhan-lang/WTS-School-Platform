import type { Metadata } from "next";
import Link from "next/link";
import { portalServices, portalStatusLabels, type PortalServiceStatus } from "../../data/portal";
import { createPageMetadata } from "../_components/page-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "WTS Staff Workspace",
  description: "One clear staff entrance to the connected Way to Success Standard Schools services.",
  path: "/portal",
  image: "/images/campus2.webp",
  imageAlt: "A view across the Way to Success Standard Schools campus",
  keywords: ["WTS School Platform", "WTS Staff Workspace", "Way to Success Standard Schools"],
});

function PortalStatus({ status }: { status: PortalServiceStatus }) {
  return <span className={`portalStatus portalStatus--${status}`}><i aria-hidden="true" />{portalStatusLabels[status]}</span>;
}

export default function PortalPage() {
  return <main id="main-content" className="publicWorkspacePage">
    <section className="publicWorkspaceHero">
      <div className="publicWorkspaceHeroCopy"><p className="eyebrow light">WAY TO SUCCESS STANDARD SCHOOLS</p><h1>One calm place for the work that matters.</h1><p>WTS Staff Workspace gives each authorised staff member a clear view of their identity, responsibilities and connected school services.</p><div className="heroActions"><Link className="primaryButton" href="/portal/sign-in">Open WTS Staff Workspace <span aria-hidden="true">→</span></Link><a className="publicWorkspaceTextLink" href="#module-showcase">Explore the school services ↓</a></div></div>
      <div className="publicWorkspaceHeroCard"><span className="publicWorkspaceHeroMark">WTS</span><p>STAFF WORKSPACE</p><strong>One public entrance.<br />A personal view after sign-in.</strong><small>Each person sees the school information and module access connected to their active role.</small></div>
    </section>

    <section className="section publicWorkspaceIntro"><div><p className="eyebrow">A CLEARER SCHOOL PLATFORM</p><h2>Simple to enter. Personal to use.</h2></div><div><p>The public website has one staff entrance: WTS Staff Workspace. Once signed in, the workspace presents honest summaries and direct links for the modules each person is authorised to use.</p><p>Operational work continues in the specialist services. The workspace is a read-only command centre for seeing what needs attention.</p></div></section>

    <section id="module-showcase" className="section publicWorkspaceShowcase" aria-labelledby="module-showcase-heading"><div className="publicWorkspaceSectionHeading"><div><p className="eyebrow">CONNECTED SCHOOL SERVICES</p><h2 id="module-showcase-heading">Technology that stays close to the school.</h2></div><p>Every service is introduced with a clear purpose and an honest status. The showcase is public; school records remain protected.</p></div><div className="publicWorkspaceCardGrid">{portalServices.map((service) => <article className="publicWorkspaceCard" key={service.id}><div className="publicWorkspaceCardTop"><span className="publicWorkspaceGlyph" aria-hidden="true">{service.icon}</span><PortalStatus status={service.status} /></div><h3>{service.title}</h3><p>{service.description}</p><div className="publicWorkspaceBenefit"><span>Why it helps</span><strong>{service.benefit}</strong></div></article>)}</div></section>

    <section className="publicWorkspaceBoundary"><div><p className="eyebrow light">THE STAFF ENTRANCE</p><h2>Everything starts with WTS Staff Workspace.</h2><p>Your authorised view is assembled after sign-in, with the responsibilities and services connected to your active school identity.</p></div><a className="publicWorkspaceTextLink" href="#module-showcase">View the module showcase ↓</a></section>

    <section className="section publicWorkspaceReturn"><div><p className="eyebrow">VISITING THE SCHOOL?</p><h2>Explore Way to Success Standard Schools.</h2><p>Admissions, academics, school life, news and contact information remain open to the wider school community.</p></div><Link className="primaryButton" href="/">Visit the public website <span aria-hidden="true">→</span></Link></section>
  </main>;
}
