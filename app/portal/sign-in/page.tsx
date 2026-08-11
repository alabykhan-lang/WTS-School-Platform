import type { Metadata } from "next";
import { PortalSignIn } from "../../_components/PortalWorkspaceClient";
import { createPageMetadata } from "../../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Staff Portal Sign In",
    description: "Secure sign-in to the authorised Way to Success Staff Portal.",
    path: "/portal/sign-in",
    image: "/images/campus2.webp",
    imageAlt: "Way to Success Standard Schools campus",
  }),
  robots: { index: false, follow: false },
};

export default function PortalSignInPage() {
  return <PortalSignIn />;
}
