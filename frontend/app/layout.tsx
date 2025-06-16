import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ThemeProvider } from 'next-themes';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://huzaifa-iqbal.com'),
  title: 'AlterMind Studio - Creative Digital Experiences',
  description: 'We craft immersive digital experiences that blur the line between imagination and reality. 3D visualization, AR/VR development, and interactive web experiences.',
  keywords: 'digital agency, 3D visualization, AR/VR, interactive experiences, web development, creative studio',
  authors: [{ name: 'AlterMind Studio' }],
  openGraph: {
    title: 'AlterMind Studio - Creative Digital Experiences',
    description: 'Crafting immersive digital experiences with cutting-edge technology',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.className} scroll-smooth`} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider 
          attribute="class" 
          defaultTheme="light" 
          enableSystem={false}
          storageKey="altermind-theme"
          disableTransitionOnChange={false}
        >
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}