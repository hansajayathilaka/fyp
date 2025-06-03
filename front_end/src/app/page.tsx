import { Footer } from "@/components/footer";
import { AboutSection } from "@/components/landingPage/AboutSection";
import { FooterSection } from "@/components/landingPage/FooterSection";
import { HeroSection } from "@/components/landingPage/HeroSection";
import Layout from "@/components/landingPage/Layout";
import { WhyChooseSection } from "@/components/landingPage/WhyChooseSection";
import Navbar from "@/components/navbar/navbar";

const Page = () => {
  return (
    <div className="absolute inset-0 w-full bg-white dark:bg-darkBackGround dark:bg-[radial-gradient(#374151_0.0001px,transparent_1px)] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
      <Navbar />
      <Layout>
        <div className="max-w-7xl mx-auto">
          <HeroSection />
          <AboutSection />
          <WhyChooseSection />
        </div>
      </Layout>
      <div className="flex flex-1 flex-col items-center justify-center mx-10">
        <FooterSection />
        <Footer />
      </div>
    </div>
  );
};

export default Page;
