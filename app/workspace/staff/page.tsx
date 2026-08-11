import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "../../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Way to Success Staff Portal",
    description: "The staff portal route now opens the unified Way to Success staff view.",
    path: "/workspace/staff",
    image: "/images/classroom.webp",
    imageAlt: "A classroom at Way to Success Standard Schools",
  }),
  robots: { index: false, follow: false },
};

export default function StaffWorkspacePage() {
  redirect("/workspace");
}
