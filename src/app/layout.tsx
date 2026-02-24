import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InnovatEPAM Portal",
  description: "Employee innovation management MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
