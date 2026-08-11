import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { NewsCard } from "./_components/NewsCard";
import { createPageMetadata } from "./_components/page-metadata";
import { programmes, school, values } from "./_components/site-data";
import { getPublicNewsItems } from "../data/news";

export const metadata: Metadata = createPageMetadata({
  title: "Home",
  description: "Way to Success Standard Schools in Ejigbo, Osun State provides quality education with discipline from Creche through Senior Secondary School.",
  path: "/",
  image: "/images/graduation.webp",
  imageAlt: "Way to Success Standard Schools graduating class at their valedictory celebration",
  keywords: ["Way to Success Standard Schools Ejigbo", "school in Osun State", "Creche to SS 3 school"],
});

export default function Home() {
  const latestNews = getPublicNewsItems().slice(0, 3);

  return (
    <main id="main-content">
      <section className="hero">
        <Image className="heroImage" src="/images/graduation.webp" alt="Way to Success Standard Schools graduating class at their valedictory celebration" fill priority sizes="100vw" />
        <div className="heroShade" />
        <div className="heroContent">
          <p className="eyebrow light">ESTABLISHED 2017 · IFEDAPO COMMUNITY, EJIGBO</p>
          <h1>Building leaders today.<br /><em>Shaping tomorrow.</em></h1>
          <p>From a child’s first classroom to senior secondary graduation, we combine sound education, discipline and personal development in one growing school community.</p>
          <div className="heroActions"><Link className="primaryButton" href="/admissions">Admission enquiries</Link><Link className="ghostButton" href="/about">Explore our school</Link></div>
        </div>
        <aside className="heroNote"><span>Admissions are open</span><strong>All classes</strong><Link href="/admissions">Find out how to apply →</Link></aside>
      </section>

      <section className="intro section">
        <div className="introLead"><p className="eyebrow">WELCOME TO WTS</p><h2>A growing school with a clear purpose.</h2><figure className="aboutPhoto"><Image src="/images/campus1.webp" alt="Way to Success Standard Schools campus in Ifedapo Community, Ejigbo" fill sizes="(max-width: 700px) 90vw, 40vw" /><figcaption>Our school community in Ejigbo</figcaption></figure></div>
        <div className="introCopy"><p>Way to Success Standard Schools is located in Ifedapo Community, off Oko-Ijado Road, Ejigbo. We serve learners from Creche through Senior Secondary School, creating a steady educational path built on knowledge, discipline, confidence and responsibility.</p><div className="signature"><span>Our guiding standard</span><strong>{school.motto}</strong></div><Link className="textLink" href="/about">Learn about our journey →</Link><Link className="textLink staffHomeLink" href="/staff">Meet our staff →</Link></div>
      </section>

      <section className="storyBand">
        <div className="storyVisual"><Image className="storyImage" src="/images/campus2.webp" alt="A view across the Way to Success Standard Schools campus" fill sizes="(max-width: 1050px) 100vw, 54vw" /><div className="storyShade" /><div className="storyCaption"><span>Creche to SS 3</span><strong>A complete learning journey</strong></div></div>
        <div className="storyText"><span className="year">2017</span><p className="eyebrow light">OUR JOURNEY</p><h2>From humble beginnings to a wider horizon.</h2><p>The school has grown with its learners, adding classes, strengthening its academic community and celebrating its first graduating set. That journey continues with every child entrusted to us.</p><Link href="/school-life">Discover life at WTS →</Link></div>
      </section>

      <section className="section academics">
        <div className="sectionHeading"><p className="eyebrow">THE LEARNING JOURNEY</p><h2>Every stage matters.</h2><p>Our sections give learners the right support, challenge and preparation at each age.</p></div>
        <div className="academicFeature"><figure className="classroomPhoto"><Image src="/images/classroom.webp" alt="Pupils learning together in a Way to Success Standard Schools classroom" fill sizes="(max-width: 1050px) 100vw, 35vw" /><figcaption>Learning is active, guided and personal.</figcaption></figure><div><p className="eyebrow">LEARNING WITH PURPOSE</p><h3>Close support at every stage.</h3><p>From first letters to senior secondary preparation, our teachers help every learner build confidence, strong habits and the knowledge to progress.</p><Link className="textLink" href="/academics">Explore our academic stages →</Link></div></div>
        <div className="programmeGrid">{programmes.map((item, index) => <article className={`programmeCard ${item.image ? "earlyYearsCard" : ""}`} key={item.title}>{item.image && <div className="programmePhoto"><Image src={item.image} alt={item.alt ?? ""} fill sizes="(max-width: 1050px) 90vw, 32vw" /></div>}<span className="cardIndex">0{index + 1}</span><p className="cardLabel">{item.range}</p><h3>{item.title}</h3><p>{item.text}</p><Link href="/admissions">Enquire about this section →</Link></article>)}</div>
      </section>

      <section className="strengths section">
        <div className="strengthLead"><p className="eyebrow light">WHY WTS</p><h2>Serious learning. Strong character. Real belonging.</h2><p>Parents should not have to choose between academic progress and good upbringing. We work intentionally towards both.</p></div>
        <div className="strengthGrid">{values.map(([no, title, text]) => <article key={title}><span>{no}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="life section">
        <div className="sectionHeading left"><p className="eyebrow">LIFE AT WTS</p><h2>Real people. Real learning. Real milestones.</h2></div>
        <div className="lifeGrid"><article className="lifePhotoCard"><Image src="/images/students.webp" alt="Way to Success Standard Schools students together in their school uniforms" fill sizes="(max-width: 1050px) 90vw, 40vw" /><div><span>01</span><h3>Learning together</h3><p>A close school community where learners are known, guided and encouraged.</p></div></article><article><span>02</span><h3>Growing with purpose</h3><p>Classroom work, discipline, creativity and leadership form one complete experience.</p></article><article><span>03</span><h3>Celebrating milestones</h3><p>From first lessons to graduation, every important stage is recognised.</p></article></div>
        <Link className="textLink lifeLink" href="/school-life">See student life at WTS →</Link>
      </section>

      <section className="section newsHome" aria-labelledby="latest-news-heading">
        <div className="newsHomeHead">
          <div><p className="eyebrow">NEWS &amp; EVENTS</p><h2 id="latest-news-heading">Latest news and announcements.</h2></div>
          <p>Official public updates will appear here once they have been verified and approved by the school.</p>
        </div>
        {latestNews.length > 0 ? (
          <>
            <p className="newsHomeNotice">No verified school news has been added yet. The clearly labelled entries below are sample layouts, not school updates.</p>
            <div className="newsGrid newsHomeGrid">{latestNews.map((item) => <NewsCard item={item} key={item.id} />)}</div>
          </>
        ) : (
          <div className="newsHomeEmpty"><strong>No news has been published yet.</strong><p>Approved public announcements and school events will appear here.</p></div>
        )}
        <Link className="textLink" href="/news">View all news →</Link>
      </section>

      <section className="admission section">
        <div><p className="eyebrow light">ADMISSIONS</p><h2>There is a place for your child at WTS.</h2><p>Admissions are currently open into all classes. Speak with the school or visit us directly to make an enquiry.</p><div className="classList"><span>Early Years</span><span>Primary</span><span>Junior Secondary</span><span>Senior Secondary</span></div></div>
        <div className="admissionCard"><span>Admission enquiries</span><strong>Visit the school to begin.</strong><p>Admissions are handled through physical interaction with the school. We will be glad to guide you.</p><Link href="/admissions">Admission information →</Link></div>
      </section>

      <section className="portal section" id="portal-gateway">
        <div><p className="eyebrow">THE WAY TO SUCCESS DIGITAL PLATFORM</p><h2>School services, brought together.</h2><p>Our protected rollout begins with one Way to Success Staff Portal. The modules available after sign-in come from real permissions; public information remains separate.</p></div>
        <div className="portalPreview"><span>One protected entrance</span><div><b>Way to Success Staff Portal</b><b>Personalised summaries</b><b>Connected school services</b></div><Link className="portalCta" href="/portal/sign-in">Open Staff Portal <span aria-hidden="true">→</span></Link></div>
      </section>
    </main>
  );
}
