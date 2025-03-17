import { AboutSection } from "@/components/landingPage/AboutSection";
import { FooterSection } from "@/components/landingPage/FooterSection";
import { HeroSection } from "@/components/landingPage/HeroSection";
import { WhyChooseSection } from "@/components/landingPage/WhyChooseSection";

const Page = () => {
  return (
    <div>
      <HeroSection />
      <AboutSection />
      <WhyChooseSection />
      <FooterSection />
    </div>
  )
};

export default Page;
