import React from "react";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Web3Provider } from "@/hooks/useWeb3";
import { Toaster } from "@/components/ui/sonner";
import { SkeletonTheme } from "react-loading-skeleton";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DEIP",
  description: "Decentralized Equlity Investment Platform",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`bg-lightBackGround text-black dark:bg-darkBackGround dark:text-white ${poppins.className}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange={true}
        >
          <Web3Provider>
            <SkeletonTheme baseColor="#202020" highlightColor="#444">
              <div className="md:px-8 pt-2 min-h-screen">{children}</div>
              <Toaster />
            </SkeletonTheme>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
