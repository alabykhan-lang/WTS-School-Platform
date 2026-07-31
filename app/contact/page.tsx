import type { Metadata } from "next";
import Image from "next/image";
import { PageBanner } from "../_components/PageBanner";
import { school } from "../_components/site-data";

export const metadata: Metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <main id="main-content">
      <PageBanner eyebrow="CONTACT US" title="Let’s start a conversation." summary="Reach the school by phone, WhatsApp or email, or come and see us in Ifedapo Community, Ejigbo." image="/images/campus1.webp" alt="Way to Success Standard Schools campus in Ifedapo Community, Ejigbo" position="center 46%" />
      <section className="section contactGrid">
        <div className="contactLead"><p className="eyebrow">VISIT THE SCHOOL</p><h2>We would be glad to welcome you.</h2><p>For general and admission enquiries, the best next step is to contact the school or visit us directly. We will be pleased to speak with you.</p><div className="addressBlock"><strong>School address</strong><p>{school.address}</p></div></div>
        <div className="contactCards"><a href={school.phoneHref}><span>Phone</span><strong>{school.phone}</strong><p>Call the school directly</p></a><a href={school.whatsappHref} target="_blank" rel="noreferrer"><span>WhatsApp</span><strong>Send a message</strong><p>Chat with the school on WhatsApp</p></a><a href={school.emailHref}><span>Email</span><strong>{school.email}</strong><p>Send your enquiry by email</p></a></div>
      </section>
      <section className="contactVisitBand"><div className="contactVisitPhoto"><Image src="/images/campus2.webp" alt="A view across the Way to Success Standard Schools campus" fill sizes="(max-width: 850px) 100vw, 52vw" /></div><div><p className="eyebrow light">FIND US IN EJIGBO</p><h2>Way to Success Standard Schools</h2><p>Ifedapo Community, off Oko-Ijado Road, Ejigbo, Osun State, Nigeria.</p><a href={school.whatsappHref} target="_blank" rel="noreferrer">Message us before your visit →</a></div></section>
    </main>
  );
}
