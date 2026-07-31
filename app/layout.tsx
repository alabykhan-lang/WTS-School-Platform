import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Way to Success Standard Schools",
  description: "Quality Education with Discipline — official website of Way to Success Standard Schools, Ejigbo, Osun State.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
