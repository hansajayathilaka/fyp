import Image from "next/image";
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";

export const FooterSection = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-15 items-center mt-3 mb-5">
      <div>
        <Image src={"/icons/logo.png"} alt={"logo"} width={60} height={70} />
        <p className="text-sm text-gray-700 dark:text-gray-300 max-w-md">
          A marketplace where investors can securely buy and trade tokenized
          equity from registered companies using blockchain-based semi-fungible
          tokens.
        </p>
      </div>
      <div className="w-3xs"></div>
      <div className="w-md">
        <h3 className="text-lg font-bold mb-5 mt-3">Contact</h3>
        <div className="flex items-center gap-4 text-gray-700 dark:text-gray-300 text-sm">
          <FaPhoneAlt />
          <p>619-393-4981 Ext. 101</p>
        </div>
        <div className="flex items-center gap-4 text-gray-700 dark:text-gray-300 mt-2 text-sm">
          <FaEnvelope />
          <p>info@deip.com</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-gray-700 dark:text-gray-300 text-sm mt-6 w-sm md:justify-end">
        <FaMapMarkerAlt />
        <p>
          University Of Moratuwa
          <br />
          Sri Lanka
        </p>
      </div>
    </div>
  );
};
