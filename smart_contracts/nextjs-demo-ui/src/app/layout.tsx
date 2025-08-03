import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "../components/Providers";
import { Navigation } from "../components/Navigation";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { RpcErrorHandler } from "../components/RpcErrorHandler";
import { DevelopmentNotice } from "../components/DevelopmentNotice";
import { DebugButton } from "../components/DebugButton";

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
  title: "DEIP - Decentralized Equity Investment Platform",
  description: "A decentralized platform for equity investment with blockchain technology and regulatory compliance",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen text-gray-900`}
      >
        <ErrorBoundary>
          <Providers>
            <RpcErrorHandler />
            <div className="min-h-screen flex flex-col">
              <DevelopmentNotice />
              <Navigation />
              <main className="flex-1">
                {children}
              </main>
              <DebugButton />
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
