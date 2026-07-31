import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageBanner } from "../_components/PageBanner";
import { school, values } from "../_components/site-data";

export const metadata: Metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <main id="main-content">
      <PageBanner eyebrow="ABOUT WAY TO SUCCESS" title="A school built for the whole journey." summary="We grow learners through sound teaching, care, discipline and the confidence to meet what comes next." image="/images/campus1.webp" alt="Way to Success Standard Schools campus in Ifedapo Community, Ejigbo" position="center 46%" />

      <section className="section splitStory">
        <div><p className="eyebrow">OUR HISTORY</p><h2>Growing with our learners since 2017.</h2></div>
        <div className="bodyCopy"><p>Way to Success Standard Schools began with a simple, enduring purpose: to give children in and around Ejigbo an education that develops both knowledge and character. From its home in Ifedapo Community, the school has steadily grown its learning community from the earliest years through Senior Secondary School.</p><p>Each new class, academic session and school milestone has been shaped by the same commitment—to make every learner feel seen, challenged and well prepared for the next stage.</p><Link className="textLink" href="/gallery">See our school community →</Link></div>
      </section>

      <section className="mottoBand"><p className="eyebrow light">OUR MOTTO</p><blockquote>{school.motto}</blockquote><p>It is the standard that guides our learning, relationships and everyday school life.</p></section>

      <section className="section missionGrid">
        <article><p className="eyebrow">OUR VISION</p><h2>To raise confident, responsible and capable learners.</h2><p>We want every child who passes through our school to leave with the knowledge, character and self-belief to contribute meaningfully wherever life takes them.</p></article>
        <article><p className="eyebrow">OUR MISSION</p><h2>To provide quality education with discipline.</h2><p>We create a secure, encouraging learning environment where strong teaching, purposeful guidance and high expectations work together for every learner.</p></article>
      </section>

      <section className="section valuesSection">
        <div className="sectionHeading left"><p className="eyebrow">WHAT WE VALUE</p><h2>The habits behind good education.</h2><p>Our values shape the way learners are taught, supported and encouraged to grow.</p></div>
        <div className="valueRows">{values.map(([number, title, text]) => <article key={title}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className="section milestoneSection">
        <div className="milestonePhoto"><Image src="/images/campus2.webp" alt="A view across the Way to Success Standard Schools campus" fill sizes="(max-width: 850px) 90vw, 45vw" /></div>
        <div><p className="eyebrow">MILESTONES</p><h2>A journey worth celebrating.</h2><ul className="milestoneList"><li><strong>2017</strong><span>Way to Success Standard Schools begins serving learners in Ejigbo.</span></li><li><strong>Today</strong><span>A complete school journey now extends from Creche through SS 3.</span></li><li><strong>Forward</strong><span>Our community continues to grow in learning, opportunity and purpose.</span></li></ul></div>
      </section>
    </main>
  );
}
