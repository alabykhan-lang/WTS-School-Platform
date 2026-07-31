import type { Metadata } from "next";
import Image from "next/image";
import { PageBanner } from "../_components/PageBanner";
import { galleryImages } from "../_components/site-data";

export const metadata: Metadata = { title: "Gallery" };

export default function GalleryPage() {
  return (
    <main id="main-content">
      <PageBanner eyebrow="SCHOOL GALLERY" title="The WTS story, in real moments." summary="A look at the learners, classrooms and school spaces that make up our growing community." image="/images/graduation.webp" alt="Way to Success Standard Schools graduating class at their valedictory celebration" position="center 34%" />
      <section className="section galleryIntro"><div><p className="eyebrow">OUR REAL SCHOOL COMMUNITY</p><h2>Every photograph tells part of the journey.</h2></div><p>These are real moments from Way to Success Standard Schools: the spaces where learning happens, the people who bring the community to life and milestones worth remembering.</p></section>
      <section className="section galleryGrid" aria-label="Way to Success Standard Schools photo gallery">{galleryImages.map((image, index) => <figure className={image.className} key={image.src}><div className="galleryImage"><Image src={image.src} alt={image.alt} fill sizes={index === 0 ? "(max-width: 850px) 90vw, 62vw" : "(max-width: 850px) 90vw, 32vw"} /></div><figcaption><span>0{index + 1}</span><div><h2>{image.title}</h2><p>{image.text}</p></div></figcaption></figure>)}</section>
    </main>
  );
}
