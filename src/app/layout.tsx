import type { Metadata, Viewport } from "next";
import { Anuphan } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const anuphan = Anuphan({
  subsets: ["latin"],
  variable: "--font-anuphan",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100"),
  title: {
    default: "Pocketways: Budget Trip Planner for India",
    template: "%s | Pocketways",
  },
  description:
    "Plan trips that fit your pocket. Enter your city, budget and days to get destinations, total trip cost, travel options and a day-by-day itinerary.",
  applicationName: "Pocketways",
  manifest: "/manifest.webmanifest",
  // No <link rel="icon"> here on purpose. When a page declares several icons the browser picks one (usually the SVG),
  // and the animated tab icon, which AnimatedFavicon adds, never gets shown. So it is the only icon link on the page;
  // /favicon.ico (in /public) is what browsers show for the moment before it runs, and for anything without JavaScript.
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Pocketways" },
  openGraph: { type: "website", siteName: "Pocketways", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={anuphan.variable}>
      <body>
        <a href="#main" className="sr-only z-50 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
