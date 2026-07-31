const programmes = [
  { range: "Creche — Nursery 2", title: "Early Years", text: "A warm beginning built around language, play, confidence, good habits and curiosity." },
  { range: "Primary 1 — Primary 5", title: "Primary School", text: "Strong foundations in literacy, numeracy, science, creativity and responsible citizenship." },
  { range: "JSS 1 — SS 3", title: "Secondary School", text: "Focused academic preparation, practical learning, leadership and examination readiness." },
];

const strengths = [
  ["01", "Purposeful teaching", "Clear lessons, regular assessment and close attention to every learner’s progress."],
  ["02", "Discipline with care", "Respect, responsibility and good conduct are developed as part of everyday school life."],
  ["03", "One complete journey", "A trusted school community from Creche through Senior Secondary School."],
  ["04", "Growing opportunity", "Learning, creativity, leadership and memorable experiences beyond the classroom."],
];

export default function Home() {
  return (
    <main>
      <header className="siteHeader">
        <a className="brand" href="#home" aria-label="Way to Success Standard Schools home">
          <img src="/images/logo.webp" alt="Way to Success Standard Schools logo" />
          <span><strong>Way to Success</strong><small>Standard Schools · Ejigbo</small></span>
        </a>
        <nav aria-label="Main navigation"><a href="#about">Our School</a><a href="#academics">Academics</a><a href="#life">School Life</a><a href="#admissions">Admissions</a><a href="#contact">Contact</a></nav>
        <a className="headerButton" href="#portal">Portal</a>
      </header>

      <section className="hero" id="home">
        <img className="heroImage" src="/images/graduation.webp" alt="Way to Success Standard Schools graduating class at their valedictory celebration" />
        <div className="heroShade" />
        <div className="heroContent">
          <p className="eyebrow light">ESTABLISHED 2017 · IFEDAPO COMMUNITY, EJIGBO</p>
          <h1>Building leaders today.<br/><em>Shaping tomorrow.</em></h1>
          <p>From a child’s first classroom to senior secondary graduation, we combine sound education, discipline and personal development in one growing school community.</p>
          <div className="heroActions"><a className="primaryButton" href="#admissions">Apply for Admission</a><a className="ghostButton" href="#about">Explore Our School</a></div>
        </div>
        <aside className="heroNote"><span>Admissions are open</span><strong>All classes</strong><a href="tel:+2347036521734">Call 0703 652 1734 →</a></aside>
      </section>

      <section className="intro section" id="about">
        <div className="introLead"><p className="eyebrow">WELCOME TO WTS</p><h2>A growing school with a clear purpose.</h2><figure className="aboutPhoto"><img src="/images/campus1.webp" alt="Way to Success Standard Schools campus in Ifedapo Community, Ejigbo" loading="lazy" /><figcaption>Our school community in Ejigbo</figcaption></figure></div>
        <div className="introCopy"><p>Way to Success Standard Schools is located in Ifedapo Community, off Oko-Ijado Road, Ejigbo. We serve learners from Creche through Senior Secondary School, creating a steady educational path built on knowledge, discipline, confidence and responsibility.</p><div className="signature"><span>Our guiding standard</span><strong>Quality Education with Discipline</strong></div></div>
      </section>

      <section className="storyBand">
        <div className="storyVisual"><img className="storyImage" src="/images/campus2.webp" alt="A view across the Way to Success Standard Schools campus" loading="lazy" /><div className="storyShade" /><div className="storyCaption"><span>Creche to SS 3</span><strong>A complete learning journey</strong></div></div>
        <div className="storyText"><span className="year">2017</span><p className="eyebrow light">OUR JOURNEY</p><h2>From humble beginnings to a wider horizon.</h2><p>The school has grown with its learners, adding classes, strengthening its academic community and celebrating its first graduating set. That journey continues with every child entrusted to us.</p><a href="#life">Discover life at WTS →</a></div>
      </section>

      <section className="section academics" id="academics">
        <div className="sectionHeading"><p className="eyebrow">THE LEARNING JOURNEY</p><h2>Every stage matters.</h2><p>Our sections give learners the right support, challenge and preparation at each age.</p></div>
        <div className="academicFeature"><figure className="classroomPhoto"><img src="/images/classroom.webp" alt="Pupils learning together in a Way to Success Standard Schools classroom" loading="lazy" /><figcaption>Learning is active, guided and personal.</figcaption></figure><div><p className="eyebrow">LEARNING WITH PURPOSE</p><h3>Close support at every stage.</h3><p>From first letters to senior secondary preparation, our teachers help every learner build confidence, strong habits and the knowledge to progress.</p></div></div>
        <div className="programmeGrid">{programmes.map((item, index) => <article className={`programmeCard ${item.title === "Early Years" ? "earlyYearsCard" : ""}`} key={item.title}>{item.title === "Early Years" && <div className="programmePhoto"><img src="/images/early.webp" alt="Early Years pupils and teachers at Way to Success Standard Schools" loading="lazy" /></div>}<span className="cardIndex">0{index + 1}</span><p className="cardLabel">{item.range}</p><h3>{item.title}</h3><p>{item.text}</p><a href="#contact">Enquire about this section →</a></article>)}</div>
      </section>

      <section className="strengths section">
        <div className="strengthLead"><p className="eyebrow light">WHY WTS</p><h2>Serious learning. Strong character. Real belonging.</h2><p>Parents should not have to choose between academic progress and good upbringing. We work intentionally towards both.</p></div>
        <div className="strengthGrid">{strengths.map(([no,title,text]) => <article key={title}><span>{no}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="life section" id="life">
        <div className="sectionHeading left"><p className="eyebrow">LIFE AT WTS</p><h2>Real people. Real learning. Real milestones.</h2></div>
        <div className="lifeGrid"><article className="lifePhotoCard"><img src="/images/students.webp" alt="Way to Success Standard Schools students together in their school uniforms" loading="lazy" /><div><span>01</span><h3>Learning together</h3><p>A close school community where learners are known, guided and encouraged.</p></div></article><article><span>02</span><h3>Growing with purpose</h3><p>Classroom work, discipline, creativity and leadership form one complete experience.</p></article><article><span>03</span><h3>Celebrating milestones</h3><p>From first lessons to graduation, every important stage is recognised.</p></article></div>
      </section>

      <section className="admission section" id="admissions">
        <div><p className="eyebrow light">ADMISSIONS</p><h2>There is a place for your child at WTS.</h2><p>Admissions are currently open into all classes: Creche, KG 1–2, Nursery 1–2, Primary 1–5, JSS 1–3 and SS 1–3.</p><div className="classList"><span>Early Years</span><span>Primary</span><span>Junior Secondary</span><span>Senior Secondary</span></div></div>
        <div className="admissionCard"><span>Start an enquiry</span><a href="tel:+2347036521734">0703 652 1734</a><a href="mailto:sambour12@gmail.com">sambour12@gmail.com</a><p>Visit the school at Ifedapo Community, off Oko-Ijado Road, Ejigbo.</p></div>
      </section>

      <section className="portal section" id="portal">
        <div><p className="eyebrow">THE WTS DIGITAL PLATFORM</p><h2>School services, brought together.</h2><p>Our unified portal is being developed to connect results, attendance, records and school communication through one secure doorway.</p></div>
        <div className="portalPreview"><span>Coming in phases</span><div><b>Parents & Students</b><b>Teachers & Staff</b><b>School Management</b></div><button disabled>Portal access coming soon</button></div>
      </section>

      <footer id="contact">
        <div className="footerMain"><img src="/images/logo.webp" alt="WTS logo" /><div><strong>Way to Success Standard Schools</strong><p>Quality Education with Discipline</p></div></div>
        <div><h4>Visit</h4><p>Ifedapo Community,<br/>off Oko-Ijado Road,<br/>Ejigbo, Osun State, Nigeria.</p></div>
        <div><h4>Contact</h4><a href="tel:+2347036521734">0703 652 1734</a><a href="mailto:sambour12@gmail.com">sambour12@gmail.com</a></div>
        <div><h4>Explore</h4><a href="#about">Our School</a><a href="#academics">Academics</a><a href="#admissions">Admissions</a><a href="#portal">Portal</a></div>
        <div className="copyright">© {new Date().getFullYear()} Way to Success Standard Schools. All rights reserved.</div>
      </footer>
    </main>
  );
}
