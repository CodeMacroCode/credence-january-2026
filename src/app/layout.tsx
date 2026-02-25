import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { AuthHydrator } from "@/components/AuthHydrator";
// import RouteTransitionWrapper from "@/components/RouteTransitionWrapper";
// Fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Credence Tracker",
  description: "School Bus Tracking Solutions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AuthHydrator />
          {/* <RouteTransitionWrapper> */}
          {children}
          {/* </RouteTransitionWrapper> */}
          {/* {children} */}
        </Providers>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}

