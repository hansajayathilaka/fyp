import { FaLock, FaCheckCircle, FaChartLine, FaGavel } from "react-icons/fa";
import { Card } from "../Card";

export const WhyChooseSection = () => {
  return (
    <div id="features" className="md:pt-20 pt-0">
      <section className="py-3 px-3 mt-20 bg-transparent text-black dark:text-white">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold">
            Why Choose Our Decentralized Equity Investment Platform?
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-sm text-gray-400">
            Invest securely in tokenized equity with blockchain-powered
            transparency. Our platform ensures seamless trading, regulatory
            compliance, and exclusive access to investment
            opportunities—empowering both companies and investors with a
            decentralized, trustless system.
          </p>
          <div className="mt-2 w-32 h-1 bg-[#00B8E4] mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {CardData.map((card, index) => (
            <Card
              key={index}
              icon={card.icon}
              title={card.title}
              description={card.description}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

const CardData = [
  {
    icon: <FaLock />,
    title: "Secure & Transparent Transactions",
    description:
      "Built on blockchain, ensuring tamper-proof and verifiable investments.",
  },
  {
    icon: <FaCheckCircle />,
    title: "Regulatory Compliance",
    description:
      "Integrated KYC identity management for secure and compliant trading.",
  },
  {
    icon: <FaChartLine />,
    title: "High Profit",
    description:
      "The money or assets will gradually grow or increase in value within a certain period.",
  },
  {
    icon: <FaGavel />,
    title: "Legal",
    description:
      "Our platform has been verified and supervised by related institutions.",
  },
];
