import { menuVariants, NavbarItems } from "@/data/Navbar";
import { MobileNavBarProps, NavBarItemType } from "@/types/navBar";
import { motion } from "framer-motion";
import { IoCloseCircleSharp } from "react-icons/io5";
import { NavBarItem } from "./NavBarItem";
import { LightDarkSwitcherButton } from "./LightDarkSwitcherButton";
import { ConnectWalletButton } from "./ConnectWalletButton";

export const MobileNavBar = ({ setTogleMenu }: MobileNavBarProps) => {
  return (
    <motion.div
      className="z-20 fixed top-0 right-0 p-3 w-[70vw] h-screen shadow-2xl list-none flex flex-col gap-5 pr-8 justify-start items-end rounded-md dark:text-white text-black"
      variants={menuVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <IoCloseCircleSharp
        fontSize="28"
        className="dark:text-white text-black cursor-pointer mb-10 mt-8"
        onClick={() => setTogleMenu(false)}
      />
      {NavbarItems.map((item: NavBarItemType, index: number) => (
        <NavBarItem
          title={item.title}
          key={index}
          url={item.url}
          classProps="my-2 text-lg cursor-pointer"
        />
      ))}
      <LightDarkSwitcherButton styles="pb-5 pt-20"/>
      <ConnectWalletButton />
    </motion.div>
  );
};
