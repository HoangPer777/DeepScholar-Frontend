import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";


export const metadata: Metadata = {
  title: "DeepScholar",
  description: "Scientific article sharing with agentic AI",
};


// @ts-ignore
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function RootLayout({ children }: { children: ReactNode }) {
  // We should ideally use env var here, but for dev putting a placeholder
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "1234567890-mockclientid.apps.googleusercontent.com";

  return (
    <html lang="en">
      <body>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}