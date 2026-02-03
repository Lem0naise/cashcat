import '../polyfills';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Gabarito } from "next/font/google";
import SupabaseProvider from './contexts/supabase-provider';
import "./globals.css";

const USEFont = Gabarito({
  variable: "--font-suse",
  weight: "variable",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "CashCat",
  description: "Manage your money with free budgeting",
  manifest: "/manifest.json",
  openGraph: {
    title: 'CashCat',
    description: 'Manage your money with free budgeting',
    url: 'https://cashcat.app',
    siteName: 'CashCat',
    images: [
      {
        url: 'https://cashcat.app/media/og.png',
        width: 1464,
        height: 828,
        alt: 'CashCat - Free Budgeting App Dashboard',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CashCat',
    description: 'Manage your money with free budgeting',
    images: [
      {
        url: 'https://cashcat.app/media/og.png',
        width: 1464,
        height: 828,
        alt: 'CashCat - Free Budgeting App Dashboard',
      },
    ],
  },
};

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  }
}
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicons/ccfavicon16.ico?v=4" sizes="16x16" />
        <link rel="icon" href="/favicons/ccfavicon32.ico?v=4" sizes="32x32" />
        <link rel="icon" href="/favicons/ccfavicon64.ico?v=4" sizes="64x64" />
        <link rel="icon" href="/favicons/ccfavicon128.ico?v=4" sizes="128x128" />
        <link rel="icon" href="/favicons/ccfavicon256.ico?v=4" sizes="256x256" />
        <link rel="apple-touch-icon" href="/favicons/ccpwa512.png?v=4" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body
        className={`${USEFont.variable} antialiased`}
      >
        <SpeedInsights />
        <Analytics />
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
        <div id='portal-root' className={`${USEFont.variable} antialiased`}></div>
      </body>
    </html>
  );
}
