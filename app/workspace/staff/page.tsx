import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "../../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "WTS Workspace",
    description: "The previous staff workspace route now redirects to WTS Workspace.",
    path: "/workspace/staff",
    image: "/images/classroom.webp",
    imageAlt: "A classroom at Way to Success Standard Schools",
  }),
  robots: { index: false, follow: false },
};

export default function StaffWorkspacePage() {
  redirect("/workspace");
}
