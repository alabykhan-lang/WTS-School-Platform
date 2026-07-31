import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Way to Success Standard Schools",
    short_name: "Way to Success",
    description: "Quality Education with Discipline — official website of Way to Success Standard Schools, Ejigbo.",
    start_url: "/",
    display: "browser",
    background_color: "#f6f7f3",
    theme_color: "#071d3b",
    icons: [
      {
        src: "/images/logo.webp",
        sizes: "any",
        type: "image/webp",
        purpose: "any",
      },
    ],
  };
}
