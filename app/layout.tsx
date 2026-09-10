import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AppProviders } from "@/providers/app-providers";
import { SITE, SITE_URL, canonical } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // ~54 characters: long enough to describe the site, short enough to survive.
    default: `${SITE.name} — Seven Quick Browser Games, Free to Play`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "browser games",
    "reaction time test",
    "memory game",
    "quick games",
    "free online games",
    "no download games",
    "daily challenge",
  ],
  alternates: { canonical: canonical("/") },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — Seven Quick Browser Games, Free to Play`,
    description: SITE.description,
    url: canonical("/"),
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Seven Quick Browser Games, Free to Play`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Games are full-bleed and use safe-area insets; let the page reach the edges.
  viewportFit: "cover",
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
