import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { AuthSessionProvider } from "@/components/session-provider";
import { AssistantWidget } from "@/components/assistant-widget/assistant-widget";
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
  title: "Praxxt",
  description: "Digital clinical preceptorship & logbook system",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#17153B",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {process.env.DEMO_ENVIRONMENT === "true" && (
          <div
            role="note"
            className="px-4 py-1.5 text-center text-xs font-semibold"
            style={{ backgroundColor: "#FDF1DC", color: "#92620A" }}
          >
            Demo environment: sample data only, not a real institution&apos;s records.
          </div>
        )}
        <RegisterServiceWorker />
        <AuthSessionProvider>
          {children}
          <AssistantWidget />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
