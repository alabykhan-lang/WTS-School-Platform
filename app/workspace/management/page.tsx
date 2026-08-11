import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "../../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Way to Success Staff Portal",
    description: "The management route now opens the unified Way to Success staff view.",
    path: "/workspace/management",
    image: "/images/campus1.webp",
    imageAlt: "Way to Success Standard Schools campus",
  }),
  robots: { index: false, follow: false },
};

export default function ManagementWorkspacePage() {
  redirect("/workspace");
}
