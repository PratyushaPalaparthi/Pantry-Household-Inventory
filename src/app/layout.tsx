import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { NavBar } from "@/components/NavBar";
import { headers } from "next/headers";
import { getUserId } from "@/lib/session";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Pantry — Household Inventory",
  description: "Track what's in your home, what's running low, and what it costs.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pantry",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    // Next emits the standard "mobile-web-app-capable" for appleWebApp.capable,
    // which Safari only began honouring recently. Older iOS still looks for the
    // apple- prefixed name, and without it "Add to Home Screen" opens the app in
    // a Safari tab with browser chrome instead of standalone.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f7a4f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Lets the page extend under the notch, which is what makes
  // env(safe-area-inset-*) meaningful — without it the mobile tab bar sits
  // above a blank band on a modern iPhone.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userId = await getUserId();

  // Every app is a subdomain of the launcher, so dropping the first label of
  // the request host points back at it. Computed here rather than in the client
  // so the link is in the first paint instead of appearing after hydration.
  const host = (await headers()).get("host") ?? "";
  const labels = host.split(":")[0].split(".");
  const portalUrl = labels.length > 1 ? `//${labels.slice(1).join(".")}` : null;

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <ServiceWorkerRegister />
          <NavBar signedIn={Boolean(userId)} portalUrl={portalUrl} />
          <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pb-10 md:pt-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
