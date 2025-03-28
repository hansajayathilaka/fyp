"use client";
import { NavBarItemType } from "@/types/navBar";
import Link from "next/link";

export const NavBarItem = ({
  title = "Untitled",
  url,
  classProps,
}: NavBarItemType) => {
  return (
    <Link
      href={url}
      className={`cursor-pointer text-base ${classProps} dark:text-white text-black`}
    >
      {title}
    </Link>
  );
};
