import { AboutSection } from "@/components/landingPage/AboutSection";
import { FooterSection } from "@/components/landingPage/FooterSection";
import { HeroSection } from "@/components/landingPage/HeroSection";
import Layout from "@/components/landingPage/Layout";
import { WhyChooseSection } from "@/components/landingPage/WhyChooseSection";

const Page = () => {
  return (
    <Layout>
      <HeroSection />
      <AboutSection />
      <WhyChooseSection />
      <FooterSection />
    </Layout>
  )
};

export default Page;
