import type { Metadata } from "next";
import { SUSE } from "next/font/google";
import "./globals.css";
import SupabaseProvider from './contexts/supabase-provider'

const SUSEFont = SUSE({
  variable: "--font-suse",
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
        className={`${SUSEFont.variable} antialiased`}
      >
        <SupabaseProvider>
          {children}
          <div id="toast-container" />
        </SupabaseProvider>
      </body>
    </html>
  );
}
