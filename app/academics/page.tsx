import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageBanner } from "../_components/PageBanner";
import { programmes } from "../_components/site-data";

export const metadata: Metadata = { title: "Academics" };

const learningCommitments = [
  ["Clear foundations", "Children build essential literacy, numeracy, study habits and confidence from the earliest stages."],
  ["Guided progress", "Regular teaching, assessment and feedback help learners understand how they are progressing."],
  ["Character alongside learning", "Respect, responsibility, discipline and good conduct remain part of the learning experience."],
];

export default function AcademicsPage() {
  return (
    <main id="main-content">
      <PageBanner eyebrow="ACADEMICS" title="Learning with purpose at every stage." summary="From a child’s earliest years to senior secondary preparation, we give every stage the attention it deserves." image="/images/classroom.webp" alt="Pupils learning together in a Way to Success Standard Schools classroom" position="center 44%" />

      <section className="section splitStory academicIntro">
        <div><p className="eyebrow">OUR APPROACH</p><h2>Knowledge grows best with close support.</h2></div>
        <div className="bodyCopy"><p>Learning at WTS is active, carefully guided and built around the needs of each stage. Our teachers work to make lessons clear, encourage participation and help learners develop the habits that support steady progress.</p><p>We balance a strong academic focus with creativity, confidence, responsibility and examination readiness—so that learners are equipped for school and for the wider world.</p></div>
      </section>

      <section className="section stageSection"><div className="sectionHeading left"><p className="eyebrow">ACADEMIC STAGES</p><h2>One continuous path, from Creche to SS 3.</h2></div><div className="stageCards">{programmes.map((programme, index) => <article key={programme.title}><span>0{index + 1}</span><p>{programme.range}</p><h3>{programme.title}</h3><div className="stageRule" /><p>{programme.text}</p></article>)}</div></section>

      <section className="classroomBand">
        <div className="classroomBandPhoto"><Image src="/images/students.webp" alt="Way to Success Standard Schools students together in their school uniforms" fill sizes="(max-width: 850px) 100vw, 50vw" /></div>
        <div><p className="eyebrow light">THE WTS CLASSROOM</p><h2>Learning happens when learners feel known.</h2><p>We believe children make the best progress when high expectations are matched with attention, encouragement and a positive school environment.</p></div>
      </section>

      <section className="section commitmentSection"><div className="sectionHeading"><p className="eyebrow">OUR LEARNING COMMITMENTS</p><h2>Built for lasting progress.</h2></div><div className="commitmentGrid">{learningCommitments.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div><Link href="/admissions" className="primaryButton sectionCta">Ask about admission to a class</Link></section>
    </main>
  );
}
