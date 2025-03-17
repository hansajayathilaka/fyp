"use client";
import { TiThMenu } from "react-icons/ti";
import Image from "next/image";
import { IoCloseCircleSharp } from "react-icons/io5";
import { useState } from "react";
import { NavbarItemProps } from "@/types/navBar";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import Link from "next/link";

const NavbarItem = ({ title, classProps }: NavbarItemProps) => {
  return (
    <li className={`mx-7 cursor-pointer text-base ${classProps}`}>{title}</li>
  );
};

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const [togleMenu, setTogleMenu] = useState(false);

  return (
    <nav className="w-full flex md:justify-center justify-between items-center p-4">
      <div className="md:flex-[0.5] flex-initial justify-center items-center">
        <Link href="/">
          {theme === "dark" ? (
            <Image
              src={"/icons/logo_dark.png"}
              alt="logo"
              width={74}
              height={82}
              className="cursor-pointer"
            />
          ) : (
            <Image
              src={"/icons/logo_light.png"}
              alt="logo"
              width={74}
              height={82}
              className="cursor-pointer"
            />
          )}
        </Link>
      </div>
      <ul className="md:flex hidden list-none flex-row justify-between items-center">
        {["Home", "About", "Features", "How it Works", "Contact"].map(
          (item, index) => {
            return (
              <NavbarItem
                title={item}
                key={item + index}
                classProps="text-lg"
              />
            );
          }
        )}
        <div
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="cursor-pointer mr-11"
        >
          {theme === "dark" ? (
            <Image
              src="/icons/darkModeIcon.png"
              alt="logo"
              width={39}
              height={39}
            />
          ) : (
            <Image
              src="/icons/lightModeIcon.png"
              alt="logo"
              width={39}
              height={39}
            />
          )}
        </div>
        <Button className="bg-darkSecondary dark:bg-darkSecondary dark:text-lightBackGround dark:hover:bg-buttonHover hover:bg-buttonHover font-bold text-lg h-[60px] w-[216px] rounded-lg">
          Connect Wallet
        </Button>
      </ul>
      <div className="flex relative">
        {togleMenu ? (
          <IoCloseCircleSharp
            fontSize="28"
            className="text-white cursor-pointer md:hidden"
            onClick={() => setTogleMenu(false)}
          />
        ) : (
          <TiThMenu
            fontSize="28"
            className="text-white cursor-pointer md:hidden"
            onClick={() => setTogleMenu(!togleMenu)}
          />
        )}
        {togleMenu && (
          <ul className="z-10 fixed top-0 -right-2 p-3 w-[70vw] h-screen shadow-2xl md:hiddne list-none flex flex-col justify-start items-end rounded-md blue-glassmorphism text-white animate-slide-in">
            <li className="text-xl w-full my-2">
              <IoCloseCircleSharp
                fontSize="28"
                className="text-white cursor-pointer md:hidden"
                onClick={() => setTogleMenu(false)}
              />
            </li>
            {["Home", "Services", "Transactions", "About"].map(
              (item, index) => {
                return (
                  <NavbarItem
                    title={item}
                    key={item + index}
                    classProps="my-2 text-lg"
                  />
                );
              }
            )}
          </ul>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
