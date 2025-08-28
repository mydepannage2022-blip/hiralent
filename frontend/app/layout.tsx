import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../src/context/Providers";
import ConditionalLayout from "../src/components/layout/ConditionalLayout";
import { Toaster } from 'react-hot-toast';
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hiralent — Hire Vetted Talent Fast",
  description:
    "Hiralent helps companies hire vetted developers, designers, and marketers quickly. Source pre-screened talent and scale your team with confidence.",
  keywords: [
    "Hiralent",
    "hire developers",
    "vetted talent",
    "remote talent marketplace",
    "software engineers",
    "UI/UX designers",
    "digital marketers",
    "staff augmentation",
    "tech recruitment",
    "outsourcing",
  ],
  openGraph: {
    title: "Hiralent — Hire Vetted Talent Fast",
    description:
      "Hire pre-screened developers, designers, and marketers. Faster hiring, better matches.",
    url: "https://hiralent.com",
    siteName: "Hiralent",
    type: "website",
    images: [
      {
        url: "/images/logo.png",
        width: 1200,
        height: 630,
        alt: "Hiralent — Hire Vetted Talent Fast",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
    
        <Providers>
          <ConditionalLayout>
   <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className:
              "bg-neutral-800 text-white text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-3 rounded-lg shadow-lg",
            success: {
              className:
                "bg-green-500 text-white text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-3 rounded-lg shadow-lg",
            },
            error: {
              className:
                "bg-red-500 text-white text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-3 rounded-lg shadow-lg",
            },
          }}
        />

        
        {children}
          </ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}