import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The report card PDF is built with pdfkit, which reads its built-in fonts
  // from its own package folder at runtime, so it must stay outside the bundle.
  serverExternalPackages: ["@react-pdf/renderer", "pdfkit"],
  // The dev badge sits over the assistant's bottom tab bar, so keep it out.
  devIndicators: false,
  // pdfkit loads its built-in fonts from disk, so they must ship with the route.
  outputFileTracingIncludes: {
    "/api/assistant": ["./node_modules/pdfkit/js/standard-fonts/**"],
  },
};

export default nextConfig;
