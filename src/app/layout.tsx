import type { Metadata } from "next";
import { SUSE } from "next/font/google";
import "./globals.css";

const SUSEFont = SUSE({
  variable: "--font-suse",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "CashCat",
  description: "The next-gen money manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${SUSEFont.variable} ${SUSEFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
