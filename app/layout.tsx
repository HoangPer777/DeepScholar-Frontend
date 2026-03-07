import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";


export const metadata: Metadata = {
  title: "DeepScholar",
  description: "Scientific article sharing with agentic AI",
};


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}