import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The report card PDF is built with pdfkit, which reads its built-in fonts
  // from its own package folder at runtime, so it must stay outside the bundle.
  serverExternalPackages: ["@react-pdf/renderer", "pdfkit"],
};

export default nextConfig;
