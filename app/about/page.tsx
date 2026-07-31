import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageBanner } from "../_components/PageBanner";
import { createPageMetadata } from "../_components/page-metadata";
import { school, values } from "../_components/site-data";

export const metadata: Metadata = createPageMetadata({
  title: "About Us",
  description: "Learn about the history, vision, mission, values and motto of Way to Success Standard Schools in Ejigbo, Osun State.",
  path: "/about",
  image: "/images/campus1.webp",
  imageAlt: "Way to Success Standard Schools campus in Ifedapo Community, Ejigbo",
  keywords: ["about Way to Success Standard Schools", "school vision Ejigbo", "school values"],
});

export default function AboutPage() {
  return (
    <main id="main-content">
      <PageBanner eyebrow="ABOUT WAY TO SUCCESS" title="A school built for the whole journey." summary="We grow learners through sound teaching, care, discipline and the confidence to meet what comes next." image="/images/campus1.webp" alt="Way to Success Standard Schools campus in Ifedapo Community, Ejigbo" position="center 46%" />

      <section className="section splitStory">
        <div><p className="eyebrow">OUR HISTORY</p><h2>Growing with our learners since 2017.</h2></div>
        <div className="bodyCopy"><p>Way to Success Standard Schools began with a simple, enduring purpose: to give children in and around Ejigbo an education that develops both knowledge and character. From its home in Ifedapo Community, the school has steadily grown its learning community from the earliest years through Senior Secondary School.</p><p>Each new class, academic session and school milestone has been shaped by the same commitment—to make every learner feel seen, challenged and well prepared for the next stage.</p><Link className="textLink" href="/gallery">See our school community →</Link></div>
      </section>

      <section className="historyFeature" aria-labelledby="brief-history-heading">
        <div className="historyVisualColumn">
          <figure className="historyPhoto">
            <div className="historyPhotoFrame">
              <Image src="/images/history-early-years.webp" alt="Early group photograph of pupils and staff of Way to Success Standard Schools in 2017" fill sizes="(max-width: 650px) 90vw, (max-width: 1050px) 42vw, 34vw" />
            </div>
            <figcaption>Early Years of Way to Success Standard Schools (2017)</figcaption>
          </figure>

          <ol className="historyTimeline" aria-label="Historical highlights">
            <li><span>2017</span><strong>School Founded</strong></li>
            <li><span>Pioneer Teachers</span><strong>Foundation Team Established</strong></li>
            <li><span>2020</span><strong>Permanent Site Relocation</strong></li>
            <li><span>Today</span><strong>Modern Educational Institution</strong></li>
          </ol>
        </div>

        <div className="historyNarrative">
          <p className="eyebrow">OUR STORY</p>
          <h2 id="brief-history-heading">Brief History of the School</h2>
          <div className="historyCopyGrid">
            <article>
              <h3>HUMBLE BEGINNINGS</h3>
              <p>Way to Success Standard Schools was established on 11th September, 2017, at Ọpẹ Olórí Méjì, Ejigbo, Osun State. The school was founded with the vision of providing quality education and addressing the academic needs and challenges of children within the community.</p>
              <p>The foundation of the school was built through the dedication and sacrifices of a team of committed pioneer teachers whose contributions remain invaluable to the institution&apos;s growth. These early staff members included Ibiyemi Faruq, Olasunkanmi Ubaidat Adéọlá, Busari Mariam, Adeoti Mufidat, Ayoola Nabilat, Busari Mujibat, and Adeteju Muizat.</p>
            </article>
            <article>
              <h3>GROWTH AND LEGACY</h3>
              <p>At its inception, the school commenced operations with 57 pupils and a handful of dedicated teachers. Through the commitment of its staff, support from parents, and the grace of Almighty Allah, the institution has experienced remarkable growth.</p>
              <p>Today, the school operates on a permanent site covering over an acre of land and boasts modern facilities, including ten classrooms, a multipurpose hall, three well-equipped laboratories, an ICT centre, and a library. The school currently employs about 35 teaching and non-teaching staff members.</p>
              <p>Over the years, Way to Success Standard Schools has participated in academic, sporting, and extracurricular competitions at both local and state levels, recording impressive achievements. Guided by excellence, discipline, moral values, and innovation, the school continues to nurture intellectual growth, character development, and practical skills for meaningful contribution to society.</p>
            </article>
          </div>
          <blockquote className="historyStatement">From 57 pupils in 2017 to a thriving institution on its permanent site, our story remains a testament to vision, sacrifice, resilience, and the pursuit of excellence.</blockquote>
        </div>
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
