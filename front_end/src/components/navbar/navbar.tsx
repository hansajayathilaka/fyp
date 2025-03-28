"use client";

import { TiThMenu } from "react-icons/ti";
import Image from "next/image";
import { useState, useEffect } from "react";
import { NavBarItemType } from "@/types/navBar";
import Link from "next/link";
import { LightDarkSwitcherButton } from "./LightDarkSwitcherButton";
import { NavBarItem } from "./NavBarItem";
import { MobileNavBar } from "./MobileNavBar";
import { NavbarItems } from "@/data/Navbar";
import { ConnectWalletButton } from "./ConnectWalletButton";

const Navbar = () => {
  const [togleMenu, setTogleMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <nav className="w-full flex lg:justify-center justify-between items-center p-4 sticky top-0 z-10 glassmorphism">
      <div className="flex-1 justify-center items-center">
        <Link href="/">
          <Image
            src={"/icons/logo.png"}
            alt="logo"
            width={74}
            height={82}
            className="cursor-pointer"
          />
        </Link>
      </div>
      <div className="lg:flex hidden list-none flex-row justify-between items-center">
        <div>
          {NavbarItems.map((item: NavBarItemType, index: number) => (
            <NavBarItem
              title={item.title}
              url={item.url}
              key={index}
              classProps="text-lg mx-7"
            />
          ))}
        </div>
        <LightDarkSwitcherButton styles="pr-11" />
        <ConnectWalletButton styles=" h-[60px] w-[216px]"/>
      </div>
      <div className="flex relative">
        {!togleMenu && (
          <TiThMenu
            fontSize="28"
            className="dark:text-white text-black cursor-pointer lg:hidden"
            onClick={() => setTogleMenu(!togleMenu)}
          />
        )}
        {togleMenu && <MobileNavBar setTogleMenu={setTogleMenu} />}
      </div>
    </nav>
  );
};

export default Navbar;
