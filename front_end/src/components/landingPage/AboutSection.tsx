import { Star } from "lucide-react";

export const AboutSection = () => {
  return (
    <div className="text-black dark:text-white p-6 rounded-xl relative max-w-4xl mx-auto shadow-lg">
      
      <h3 className="text-sky-400 text-lg font-semibold">- About</h3>
      <h2 className="text-black text-2xl font-bold mt-2 dark:text-white">Our Decentralized Equity Investment Platform</h2>

      <div className="mt-4 flex items-center gap-4">
        <div>
          <p className="text-gray-400 leading-relaxed mt-4 w-md">
            When you invest with our platform, you’re more than just an investor—you’re a valued stakeholder.
            As a part of our decentralized ecosystem, you gain access to exclusive equity investment opportunities typically reserved for large institutions.
            Our platform is built to empower you with secure, transparent, and innovative investment options tailored to your needs.
          </p>
        </div>

        <div>
          <div className="bg-white text-black px-3 py-1 rounded-lg flex items-center gap-1 shadow-md">
            <Star className="text-yellow-400" size={16} fill="yellow" />
            <Star className="text-yellow-400" size={16} fill="yellow" />
            <Star className="text-yellow-400" size={16} fill="yellow" />
            <Star className="text-yellow-400" size={16} fill="yellow" />
            <Star className="text-gray-400" size={16} fill="gray" />
            <span className="ml-2 font-semibold">4.5</span>
          </div>
        </div>
      </div>
    </div>
  );
};
