import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Oswald, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted at build time (works with static export). These were referenced
// in globals.css by name but never actually loaded — headers silently fell back
// to Arial Narrow / system. Now they're real.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-oswald", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono", display: "swap" });
import SisterSites from "@/components/SisterSites";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import AdUnit from "@/components/AdUnit";
import { AD_CLIENT, AD_SLOTS } from "@/lib/ads";
import { SITE } from "@/lib/seo";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // draw into the notch / dynamic island
  themeColor: "#0b0b10",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "NBL 33-0 — Build the perfect all-time NBL team",
    template: "%s — NBL 33-0",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "NBL", "NBL game", "basketball game", "NBL team builder", "all-time NBL team",
    "33-0", "perfect season", "NBL fantasy", "NBL trivia", "basketball quiz",
    "NBL legends", "NBL MVP", "NBL ladder", "NBL stats", "Hoople NBL",
  ],
  authors: [{ name: "Daniel Tomaro" }],
  alternates: { canonical: "/" },
  // AdSense site verification — Google's crawler looks for this meta tag.
  other: { "google-adsense-account": "ca-pub-2087141992057731" },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: "NBL 33-0 — Build the perfect all-time NBL team",
    description: SITE.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NBL 33-0 — Build the perfect all-time NBL team",
    description: SITE.description,
    site: SITE.twitter,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  appleWebApp: {
    capable: true,
    title: "NBL 33-0",
    statusBarStyle: "black-translucent",
  },
  // Stop iOS Safari from auto-linking stat numbers / dates as phone numbers.
  formatDetection: { telephone: false, date: false, address: false, email: false },
  manifest: "/manifest.webmanifest",
};

const orgLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  inLanguage: "en-US",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE.url}/players?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};
const appLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  url: SITE.url,
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  inLanguage: "en-US",
};
const orgEntityLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}/icon.svg`,
  description: SITE.tagline,
  sameAs: [
    "https://afl23-0.com",
    "https://nrl24-0.com",
    "https://mlb162-0.com",
    "https://footballinvincibles.com",
    "https://f1slam.com",
    "https://twitter.com/nbl330",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className={`${inter.variable} ${oswald.variable} ${mono.variable}`}>
      <body>
        <SisterSites active="nbl" />
        <SiteHeader />
        <main className="container-x" style={{ paddingTop: "1.5rem", minHeight: "60vh" }}>
          {children}
        </main>
        <div className="container-x">
          <AdUnit slot={AD_SLOTS.inline} />
        </div>
        <SiteFooter />
        <JsonLd data={orgLd} />
        <JsonLd data={appLd} />
        <JsonLd data={orgEntityLd} />
        {/* Google AdSense loader — literal async <script> so React hoists it into
            <head>; this is the exact tag AdSense's crawler looks for to verify. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`}
          crossOrigin="anonymous"
        />
        {/* Cloudflare Web Analytics — privacy-friendly, no cookies */}
        <Script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          data-cf-beacon='{"token": "d59a007182594e61a9820fdbc5f6f742"}'
        />
      </body>
    </html>
  );
}
