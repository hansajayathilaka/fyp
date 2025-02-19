import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import Footer from "@/components/footer";
import { SkeletonTheme } from "react-loading-skeleton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DEIP",
  description: "Decentralized Equlity Investment Platform",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SkeletonTheme baseColor="#202020" highlightColor="#444">
            <Navbar />
            <div className="px-8 pt-2 min-h-screen">{children}</div>
            <Footer />
          </SkeletonTheme>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
