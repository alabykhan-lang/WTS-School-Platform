import type { Metadata } from "next";
import Link from "next/link";
import { PageBanner } from "../_components/PageBanner";
import { school } from "../_components/site-data";

export const metadata: Metadata = { title: "Admissions Information" };

const stages = ["Creche", "KG 1–2", "Nursery 1–2", "Primary 1–5", "JSS 1–3", "SS 1–3"];

export default function AdmissionsPage() {
  return (
    <main id="main-content">
      <PageBanner eyebrow="ADMISSIONS INFORMATION" title="Begin with a conversation." summary="Admissions are handled directly with the school. Visit us in Ejigbo or contact us to make an enquiry." image="/images/campus2.webp" alt="A view across the Way to Success Standard Schools campus" position="center 50%" />
      <section className="section admissionInformation">
        <div><p className="eyebrow">ADMISSION AT WTS</p><h2>We welcome enquiries for all classes.</h2><p>Way to Success Standard Schools offers a complete learning journey from Creche through Senior Secondary School. We will be pleased to discuss the class that is right for your child.</p></div>
        <aside><span>Important</span><strong>Admissions are currently handled through physical interaction with the school.</strong><p>There is no online admission form, payment process or registration portal at this time.</p></aside>
      </section>
      <section className="section classesSection"><p className="eyebrow">CLASSES AVAILABLE</p><h2>Admission enquiries are welcome for:</h2><div className="classAvailableGrid">{stages.map((stage, index) => <article key={stage}><span>0{index + 1}</span><strong>{stage}</strong></article>)}</div></section>
      <section className="admissionSteps"><div><p className="eyebrow light">HOW TO MAKE AN ENQUIRY</p><h2>Visit the school to begin.</h2></div><ol><li><span>01</span><p>Call, email or send a WhatsApp message to let us know you would like to enquire.</p></li><li><span>02</span><p>Visit Way to Success Standard Schools at Ifedapo Community, off Oko-Ijado Road, Ejigbo.</p></li><li><span>03</span><p>Speak directly with the school for guidance on the next step for your child’s class.</p></li></ol></section>
      <section className="section contactPanel"><div><p className="eyebrow">SPEAK WITH THE SCHOOL</p><h2>We are ready to help.</h2><p>For admission enquiries, please use any of the contact options below or visit the school directly.</p></div><div className="contactPanelLinks"><a href={school.phoneHref}><small>CALL THE SCHOOL</small>{school.phone}</a><a href={school.whatsappHref} target="_blank" rel="noreferrer"><small>WHATSAPP</small>Send an enquiry</a><a href={school.emailHref}><small>EMAIL</small>{school.email}</a><Link href="/contact"><small>VISIT US</small>Get directions and address</Link></div></section>
    </main>
  );
}
