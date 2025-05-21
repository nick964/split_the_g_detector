import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionWrapper from "./components/SessionWrapper";
import { Navbar } from "./components/navbar";
import { Footer } from "./components/Footer";
import FirebaseAuthProvider from "./auth/FirebaseAuthProvider";
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from "@/components/ui/use-toast";
import Script from 'next/script';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Split The G",
  description: "Web app that lets you track your guinness scores",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8223624320389984"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <meta name="google-adsense-account" content="ca-pub-8223624320389984"></meta>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <SessionWrapper>
          <FirebaseAuthProvider>
            <Navbar />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
            <Toaster />
          </FirebaseAuthProvider>
        </SessionWrapper>
        <Analytics />
      </body>
    </html>
  );
}
