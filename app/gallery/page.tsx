import type { Metadata } from "next";
import { PageBanner } from "../_components/PageBanner";
import { GalleryCollection } from "../_components/GalleryCollection";
import { createPageMetadata } from "../_components/page-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Gallery",
  description: "Explore real moments from Way to Success Standard Schools in Ejigbo: school life, academic activities and graduation milestones.",
  path: "/gallery",
  image: "/images/graduation.webp",
  imageAlt: "Way to Success Standard Schools graduating class at their valedictory celebration",
  keywords: ["school gallery Ejigbo", "school graduation Ejigbo", "student life photos"],
});

export default function GalleryPage() {
  return (
    <main id="main-content">
      <PageBanner eyebrow="SCHOOL GALLERY" title="The WTS story, in real moments." summary="A look at the learners, classrooms and school spaces that make up our growing community." image="/images/graduation.webp" alt="Way to Success Standard Schools graduating class at their valedictory celebration" position="center 34%" />
      <section className="section galleryIntro"><div><p className="eyebrow">OUR REAL SCHOOL COMMUNITY</p><h2>Every photograph tells part of the journey.</h2></div><p>These are real moments from Way to Success Standard Schools: the spaces where learning happens, the people who bring the community to life and milestones worth remembering.</p></section>
      <GalleryCollection />
    </main>
  );
}
