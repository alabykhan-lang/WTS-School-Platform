import type { Metadata } from "next";
import { StaffPortalClient } from "../_components/StaffPortalClient";
import { createPageMetadata } from "../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Way to Success Staff Portal",
    description: "A simple Staff Portal for authorised Way to Success staff.",
    path: "/workspace",
    image: "/images/campus2.webp",
    imageAlt: "A view across the Way to Success Standard Schools campus",
  }),
  robots: { index: false, follow: false },
};

export default function WorkspacePage() {
  return <StaffPortalClient />;
}
