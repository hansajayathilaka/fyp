import React from "react";
import { Star } from "lucide-react";

const Rating = ({ rating }: { rating: number }) => {
  const maxStars = 5;
  const starsArray = Array.from({ length: maxStars }, (_, index) =>
    index < Math.floor(rating) ? "full" : "empty"
  );

  return (
    <div
      id="about"
      className="bg-white dark:bg-gray-200 text-black dark:text-gray-500 px-3 py-2 rounded-lg flex items-center gap-1 shadow-md 
      sm:px-2 sm:py-1 sm:gap-0.5"
    >
      {starsArray.map((type, i) => (
        <Star
          key={i}
          className={type === "full" ? "text-yellow-400" : "text-gray-400"}
          size={16}
          fill={type === "full" ? "yellow" : "gray"}
        />
      ))}

      <span className="ml-2 font-semibold sm:ml-1 text-sm sm:text-xs">
        {rating.toFixed(1)}
      </span>
    </div>
  );
};

export const AboutSection = () => {
  return (
    <div className="text-black dark:text-white py-4 rounded-xl max-w-8xl mx-auto flex felx-col">
      <div>
        <h3 className="text-sky-400 text-lg font-semibold">- About</h3>
        <h2 className="text-black text-2xl font-bold mt-2 dark:text-white">
          Our Decentralized Equity Investment Platform
        </h2>

        <div className="mt-2 flex flex-col items-center gap-4 md:gap-24 xl:gap-40 sm:flex-row">
          <div>
            <p className="text-gray-400 leading-relaxed mt-4 text-md">
              When you invest with our platform, you’re more than just an
              investor—you’re a valued stakeholder. As a part of our
              decentralized ecosystem, you gain access to exclusive equity
              investment opportunities typically reserved for large
              institutions. Our platform is built to empower you with secure,
              transparent, and innovative investment options tailored to your
              needs.
            </p>
          </div>

          <div className="mx-10">
            <Rating rating={4.5} />
          </div>
        </div>
      </div>
    </div>
  );
};
