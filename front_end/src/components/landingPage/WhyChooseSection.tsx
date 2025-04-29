import { FaLock, FaCheckCircle, FaChartLine, FaGavel } from "react-icons/fa";

export const WhyChooseSection = () => {
  return (
    <div id="features">
    <section className="py-3 px-3 mt-20 bg-transparent text-black dark:text-white">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-4xl font-bold">
          Why Choose Our Decentralized Equity Investment Platform?
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-sm text-gray-400">
          Invest securely in tokenized equity with blockchain-powered transparency. Our platform ensures seamless trading, regulatory compliance, and exclusive access to investment opportunities—empowering both companies and investors with a decentralized, trustless system.
        </p>
        <div className="mt-2 w-32 h-1 bg-[#00B8E4] mx-auto rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card 1 */}
        <div className="flex items-start gap-4 rounded-lg shadow-sm mb-3 p-6">
          <div className="text-[#00B8E4] text-3xl">
            <FaLock />
          </div>
          <div>
            <h4 className="font-bold text-lg">Secure & Transparent Transactions</h4>
            <p className="text-sm text-gray-400 mt-2">
              Built on blockchain, ensuring tamper-proof and verifiable investments.
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="flex items-start gap-4 rounded-lg shadow-sm mb-3 p-6">
          <div className="text-[#00B8E4] text-3xl">
            <FaCheckCircle />
          </div>
          <div>
            <h4 className="font-bold text-lg">Regulatory Compliance</h4>
            <p className="text-sm text-gray-400 mt-2">
              Integrated KYC identity management for secure and compliant trading.
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex items-start gap-4 rounded-lg shadow-sm mb-3 p-6">
          <div className="text-[#00B8E4] text-3xl">
            <FaChartLine />
          </div>
          <div>
            <h4 className="font-bold text-lg">High Profit</h4>
            <p className="text-sm text-gray-400 mt-2">
              The money or assets will gradually grow or increase in value within a certain period.
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="flex items-start gap-4 rounded-lg shadow-sm mb-3 p-6">
          <div className="text-[#00B8E4] text-3xl">
            <FaGavel />
          </div>
          <div>
            <h4 className="font-bold text-lg">Legal</h4>
            <p className="text-sm text-gray-400 mt-2">
              Our platform has been verified and supervised by related institutions.
            </p>
          </div>
        </div>
      </div>
    </section>
    </div>
  );
};
