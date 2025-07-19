"use client";

import { useRouter } from "next/navigation";
import { RegistrationButton } from "../RegistrationButton";
import { WalletConnect } from "../WalletConnect";

export const HeroSection = () => {
  const router = useRouter();
  const handleRegisterAsCompany = () => {
    router.push("/company/dashboard");
  };
  const handleRegisterAsInvestor = () => {
    router.push("/investor/dashboard");
  };
  return (
    <div
      id="home"
      className="flex flex-1 h-[calc(100vh-120px)] flex-col items-center justify-center md:gap-5 pt-[200px]"
    >
      <h1 className="md:text-[55px] text-[30px] font-bold text-center md:max-w-[1000px] sm:max-w-[600px]">
        Revolutionizing Equity Investment through Blockchain
      </h1>
      <h2 className="md:text-[30px] text-[20px] font text-center">
        We make it easy for everyone to invest
      </h2>
      <div className="flex flex-col md:flex-row gap-4 mt-8">
        <RegistrationButton
          buttonText="Register as a Company"
          styles="md:h-[60px] md:w-[288px]"
          onClick={() => handleRegisterAsCompany()}
        />
        <RegistrationButton
          buttonText="Register as an Investor"
          styles="md:h-[60px] md:w-[276x] bg-white dark:bg-darkBackGround border-[2px] border-black dark:border-white hover:bg-darkSecondary"
          variant="outline"
          onClick={() => handleRegisterAsInvestor()}
        />
      </div>
    </div>
  );
};
