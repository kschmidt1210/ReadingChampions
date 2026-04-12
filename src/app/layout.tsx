import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SerwistProvider } from "./serwist-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export const metadata: Metadata = {
  applicationName: "Super Reader Championship",
  title: {
    default: "Super Reader Championship",
    template: "%s | Super Reader",
  },
  description: "A reading competition tracker for book clubs",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Super Reader",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: "#ffffff" }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: "#ffffff" }}
      >
        <div
          id="__splash"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            width="80"
            height="80"
          >
            <rect width="100" height="100" rx="20" fill="#4f46e5" />
            <g
              transform="translate(50,50)"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M-25,21 L-25,-17 C-25,-17 -12,-23 0,-17 C12,-23 25,-17 25,-17 L25,21" />
              <path d="M0,-17 L0,21" />
              <path d="M-25,21 C-25,21 -12,15 0,21 C12,15 25,21 25,21" />
            </g>
          </svg>
          <p
            style={{
              marginTop: 20,
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: 15,
              fontWeight: 500,
              color: "#94a3b8",
              letterSpacing: "0.02em",
            }}
          >
            Super Reader
          </p>
        </div>
        <SerwistProvider swUrl="/serwist/sw.js">
          {children}
          <Toaster richColors closeButton position="top-center" />
        </SerwistProvider>
      </body>
    </html>
  );
}
