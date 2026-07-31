import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublicStaffByCategory, staffCategoryDetails, type StaffCategory, type StaffMember } from "../../data/staff";
import { PageBanner } from "../_components/PageBanner";
import { createPageMetadata } from "../_components/page-metadata";
import { school } from "../_components/site-data";

export const metadata: Metadata = createPageMetadata({
  title: "Staff Directory",
  description: "Meet the leadership, teaching, administrative and support team at Way to Success Standard Schools in Ejigbo, Osun State.",
  path: "/staff",
  image: "/images/students.webp",
  imageAlt: "Way to Success Standard Schools students together in their school uniforms",
  keywords: ["Way to Success Standard Schools staff", "school teachers Ejigbo", "school leadership Ejigbo"],
});

const categories: StaffCategory[] = ["leadership", "administration", "teaching", "support"];

function StaffPhoto({ member }: { member: StaffMember }) {
  if (!member.photo) {
    return <div className="staffPhotoPlaceholder" role="img" aria-label={`Branded placeholder for ${member.fullName}`}><span>WTS</span></div>;
  }

  return <Image src={member.photo} alt={`${member.fullName}, ${member.role} at ${school.name}`} fill sizes="(max-width: 620px) 46vw, (max-width: 1000px) 29vw, 21vw" />;
}

export default function StaffPage() {
  return (
    <main id="main-content">
      <PageBanner eyebrow="OUR PEOPLE" title="The team behind every learner’s journey." summary="Way to Success Standard Schools is supported by a committed leadership, teaching and support team." image="/images/students.webp" alt="Way to Success Standard Schools students together in their school uniforms" position="center 35%" />

      <section className="staffIntro section" aria-labelledby="staff-directory-introduction">
        <div><p className="eyebrow">STAFF DIRECTORY</p><h2 id="staff-directory-introduction">Committed people. One shared purpose.</h2></div>
        <p>Our staff work together to make the school a place where learning is purposeful, relationships are respectful and every learner is encouraged to grow. This directory shares only professional, public-facing staff information.</p>
      </section>

      {categories.map((category, index) => {
        const members = getPublicStaffByCategory(category);
        const details = staffCategoryDetails[category];

        if (members.length === 0) return null;

        return (
          <section className={`staffDirectorySection ${index % 2 === 1 ? "staffDirectorySectionAlt" : ""}`} key={category} aria-labelledby={`${category}-staff-heading`}>
            <div className="staffDirectoryHeading">
              <div><p className="eyebrow">OUR TEAM</p><h2 id={`${category}-staff-heading`}>{details.title}</h2><p>{details.description}</p></div>
              <span>{members.length} {members.length === 1 ? "staff member" : "staff members"}</span>
            </div>
            <div className="staffGrid">
              {members.map((member) => (
                <article className="staffCard" key={member.id}>
                  <div className="staffPhoto"><StaffPhoto member={member} /></div>
                  <div className="staffCardCopy"><h3>{member.fullName}</h3><p>{member.role}</p>{category === "teaching" && <span>{member.role.startsWith("Part-Time") ? "Part-Time" : "Full-Time"}</span>}</div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <section className="staffContactBand">
        <div><p className="eyebrow light">LEARN MORE ABOUT WTS</p><h2>Visit us to experience the community in person.</h2></div>
        <div><p>For admission enquiries or general information, our school team will be glad to speak with you.</p><Link className="ghostButton" href="/contact">Contact the school</Link></div>
      </section>
    </main>
  );
}
