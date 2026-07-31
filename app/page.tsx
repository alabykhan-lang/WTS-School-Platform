const programmes = [
  { title: "Early Years", text: "A caring, activity-based foundation that develops confidence, language, numeracy and good character." },
  { title: "Primary School", text: "Strong literacy, numeracy, science, creativity and citizenship skills for independent young learners." },
  { title: "Secondary School", text: "Purposeful academic preparation, practical skills, leadership and examination readiness." },
];

const portalCards = [
  ["Students & Parents", "Results, attendance, notices and student records."],
  ["Teachers & Staff", "Classes, attendance, score entry and internal resources."],
  ["School Management", "Registry, reports, approvals and administration."],
];

export default function Home() {
  return (
    <main>
      <header className="siteHeader">
        <a className="brand" href="#home" aria-label="Way to Success home">
          <span className="brandMark">WTS</span>
          <span><strong>Way to Success</strong><small>Standard Schools</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#about">About</a><a href="#academics">Academics</a><a href="#admissions">Admissions</a>
          <a href="#news">News</a><a href="#contact">Contact</a>
        </nav>
        <a className="headerButton" href="#portal">Portal Login</a>
      </header>

      <section className="hero" id="home">
        <div className="heroContent">
          <p className="eyebrow">WAY TO SUCCESS STANDARD SCHOOLS · EJIGBO</p>
          <h1>Raising knowledgeable, disciplined and confident future leaders.</h1>
          <p className="heroText">We provide purposeful education in a safe and supportive environment where every learner is encouraged to grow in knowledge, character and responsibility.</p>
          <div className="heroActions"><a className="primaryButton" href="#admissions">Begin Admission</a><a className="secondaryButton" href="#about">Discover Our School</a></div>
          <div className="heroTrust"><span>✓ Quality teaching</span><span>✓ Strong discipline</span><span>✓ Complete child development</span></div>
        </div>
        <div className="heroVisual" aria-label="School highlights">
          <div className="visualCard mainCard"><span className="miniLabel">Our Motto</span><strong>Quality Education<br/>with Discipline</strong><p>Learning today. Leading tomorrow.</p></div>
          <div className="visualCard floatingCard"><b>Admissions</b><span>Enquiries are welcome</span></div>
        </div>
      </section>

      <section className="intro section" id="about">
        <div><p className="eyebrow">WELCOME TO WTS</p><h2>A school community built around learning, character and opportunity.</h2></div>
        <div><p>Way to Success Standard Schools serves children through the formative stages of their education. Our approach combines sound academics with discipline, creativity, responsibility and personal attention.</p><a className="textLink" href="#contact">Learn more about us →</a></div>
      </section>

      <section className="programmes section" id="academics">
        <div className="sectionHeading"><p className="eyebrow">OUR ACADEMIC JOURNEY</p><h2>Learning designed for every important stage.</h2><p>Clear progression from early learning to confident secondary-school achievement.</p></div>
        <div className="cardGrid">{programmes.map((item, index) => <article className="programmeCard" key={item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.text}</p><a href="#contact">Explore programme →</a></article>)}</div>
      </section>

      <section className="why section">
        <div className="whyPanel"><p className="eyebrow">WHY FAMILIES CHOOSE US</p><h2>More than classroom instruction.</h2><p>Our learners are supported to become responsible, curious and capable young people.</p></div>
        <div className="featureGrid"><article><b>01</b><h3>Committed Teachers</h3><p>Teachers who guide, assess and support each learner’s progress.</p></article><article><b>02</b><h3>Character & Discipline</h3><p>Respect, responsibility and good conduct are part of daily school life.</p></article><article><b>03</b><h3>Practical Learning</h3><p>Activities that connect classroom knowledge with real-life understanding.</p></article><article><b>04</b><h3>Parent Partnership</h3><p>Clear communication and shared responsibility for every child’s development.</p></article></div>
      </section>

      <section className="admission section" id="admissions"><div><p className="eyebrow">ADMISSIONS</p><h2>Give your child a strong start and a clear path forward.</h2><p>Speak with the school about available classes, admission requirements and the next entrance process.</p></div><div className="admissionActions"><a className="lightButton" href="#contact">Make an Enquiry</a><span>Nursery · Primary · Secondary</span></div></section>

      <section className="portal section" id="portal"><div className="sectionHeading"><p className="eyebrow">WTS DIGITAL PORTAL</p><h2>One secure doorway to school services.</h2><p>The portal will gradually bring student records, results, attendance and communication together in one place.</p></div><div className="portalGrid">{portalCards.map(([title,text]) => <article key={title}><div className="portalIcon">→</div><h3>{title}</h3><p>{text}</p><button type="button" disabled>Coming soon</button></article>)}</div></section>

      <section className="news section" id="news"><div className="sectionHeading left"><p className="eyebrow">LATEST FROM THE SCHOOL</p><h2>News, notices and memorable moments.</h2></div><div className="newsGrid"><article className="featuredNews"><div><span>School Update</span><h3>A new digital chapter for the WTS community</h3><p>Our unified website and school portal are being developed to improve access to information and services.</p></div></article><article className="notice"><span>Notice Board</span><h3>Important announcements will appear here.</h3><p>Parents and members of the school community will be able to find verified updates directly from the school.</p><a href="#contact">Contact the school →</a></article></div></section>

      <footer id="contact"><div className="footerBrand"><span className="brandMark">WTS</span><div><strong>Way to Success Standard Schools</strong><p>Quality Education with Discipline</p></div></div><div><h4>Visit Us</h4><p>Ejigbo, Osun State, Nigeria</p></div><div><h4>Quick Links</h4><a href="#about">About</a><a href="#academics">Academics</a><a href="#admissions">Admissions</a></div><div><h4>Contact</h4><p>Official phone number and email will be added after confirmation.</p></div><div className="copyright">© {new Date().getFullYear()} Way to Success Standard Schools. All rights reserved.</div></footer>
    </main>
  );
}
