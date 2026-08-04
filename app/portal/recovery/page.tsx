import type { Metadata } from "next";
import { BootstrapRecoveryClient } from "../../_components/BootstrapRecoveryClient";
import { createPageMetadata } from "../../_components/page-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Protected WTS Bootstrap Recovery",
    description: "Protected one-time recovery for the confirmed WTS identity administrator.",
    path: "/portal/recovery",
    image: "/images/campus2.webp",
    imageAlt: "Way to Success Standard Schools campus",
  }),
  robots: { index: false, follow: false },
};

export default function BootstrapRecoveryPage() {
  return <BootstrapRecoveryClient />;
}
