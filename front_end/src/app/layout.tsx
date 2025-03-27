import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Footer from "@/components/footer";
import { SkeletonTheme } from "react-loading-skeleton";
import Navbar from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DEIP",
  description: "Decentralized Equlity Investment Platform",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`bg-lightBackGround text-black dark:bg-darkBackGround dark:text-white ${inter.className}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SkeletonTheme baseColor="#202020" highlightColor="#444">
            <div className="px-8">
<<<<<<< HEAD
              <Navbar />
              <div>{children}</div>
              <Footer />
=======
              <div className="absolute inset-0 -z-10 w-full bg-white dark:bg-darkBackGround dark:bg-[radial-gradient(#374151_0.0001px,transparent_1px)] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                <Navbar />
                <div className="px-8 pt-2 min-h-screen">{children}</div>
                <Footer />
              </div>
>>>>>>> dev
            </div>
          </SkeletonTheme>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
