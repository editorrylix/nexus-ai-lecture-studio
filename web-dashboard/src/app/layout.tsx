import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEXUS // Local-First AI Lecture & Meeting Studio",
  description: "High-performance WASAPI loopback audio transcription, Gemini 3.6 Flash synthesis, Anki spaced repetition decks, and Obsidian knowledge vaults.",
  icons: {
    icon: [
      { url: "/nexus-logo.svg", type: "image/svg+xml" }
    ],
    shortcut: "/nexus-logo.svg",
    apple: "/nexus-logo.svg",
  },
  openGraph: {
    title: "NEXUS // Local-First AI Lecture & Meeting Studio",
    description: "High-fidelity process audio capture & AI-powered academic knowledge synthesis.",
    siteName: "Nexus Studio",
    images: [{ url: "/nexus-logo.svg" }]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#07080B] text-[#F3F4F6]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
