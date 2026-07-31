import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageBanner } from "../_components/PageBanner";
import { createPageMetadata } from "../_components/page-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "School Life",
  description: "Discover student life, character development, shared experiences and milestones at Way to Success Standard Schools.",
  path: "/school-life",
  image: "/images/students.webp",
  imageAlt: "Way to Success Standard Schools students together in their school uniforms",
  keywords: ["student life Ejigbo", "school community", "character development school"],
});

const lifePoints = [
  ["A close community", "Learners are known, guided and encouraged as they find their place in school."],
  ["Character in action", "Respect, responsibility and discipline are practised through the everyday life of the school."],
  ["Moments that matter", "We recognise academic effort, personal growth, shared experiences and important milestones."],
];

export default function SchoolLifePage() {
  return (
    <main id="main-content">
      <PageBanner eyebrow="SCHOOL LIFE" title="More than lessons. A place to belong." summary="School life at WTS is where learning, character, friendship and memorable experiences come together." image="/images/students.webp" alt="Way to Success Standard Schools students together in their school uniforms" position="center 32%" />

      <section className="section lifeIntro"><div><p className="eyebrow">STUDENT LIFE</p><h2>Growing in confidence together.</h2></div><div className="bodyCopy"><p>A meaningful school experience is not made up of classroom work alone. It is also built in the friendships learners make, the responsibilities they learn to carry and the shared moments that mark each year.</p><p>At WTS, we work to create a community in which every learner can participate, develop confidence and take pride in being part of the school.</p></div></section>

      <section className="lifeFeatureBand"><div className="lifeFeatureCopy"><p className="eyebrow light">THE WTS EXPERIENCE</p><h2>Character and learning, side by side.</h2><p>Our standard of discipline is rooted in care and purpose. Learners are encouraged to respect one another, take responsibility for their work and grow into thoughtful young people.</p></div><div className="lifeFeaturePhoto"><Image src="/images/early.webp" alt="Early Years pupils and teachers at Way to Success Standard Schools" fill sizes="(max-width: 850px) 100vw, 50vw" /></div></section>

      <section className="section lifePointsSection"><div className="lifePoints">{lifePoints.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className="achievementBand"><div className="achievementPhoto"><Image src="/images/graduation.webp" alt="Way to Success Standard Schools graduating class at their valedictory celebration" fill sizes="(max-width: 850px) 100vw, 52vw" /></div><div><p className="eyebrow">ACHIEVEMENTS &amp; MILESTONES</p><h2>Celebrating how far our learners have come.</h2><p>The school community takes time to recognise progress. Graduation is one important expression of the journey from first lessons to greater possibilities ahead.</p><Link className="textLink" href="/gallery">View the school gallery →</Link></div></section>
    </main>
  );
}
