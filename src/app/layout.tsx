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
  applicationName: "Auburn Academic Planner",
  title: {
    default: "Auburn Academic Planner",
    template: "%s | Auburn Academic Planner",
  },
  description:
    "A source-grounded academic planning assistant for Auburn students.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-md bg-white px-4 py-2 text-[14px] font-semibold text-[#03244d] shadow-lg outline-none transition focus:translate-y-0 focus:ring-4 focus:ring-[#dd550c]/40"
          href="#main-content"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
