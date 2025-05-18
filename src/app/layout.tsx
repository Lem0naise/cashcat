import type { Metadata } from "next";
import { SUSE } from "next/font/google";
import { Gabarito } from "next/font/google";
import "./globals.css";
import SupabaseProvider from './contexts/supabase-provider'
import { SpeedInsights } from "@vercel/speed-insights/next"

const USEFont = Gabarito({
  variable: "--font-suse",
  weight: "variable",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "CashCat",
  description: "Manage your budget with envelope budgeting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${USEFont.variable} antialiased`}
      >
        <SpeedInsights/>
        <SupabaseProvider>
          {children}
          <div id="toast-container" />
        </SupabaseProvider>
      </body>
    </html>
  );
}
