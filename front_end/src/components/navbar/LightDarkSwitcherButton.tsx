"use client";

import { LightDarkSwitcherButtonProps } from "@/types/navBar";
import { useTheme } from "next-themes";
import Image from "next/image";

export const LightDarkSwitcherButton = ({
  styles
}: LightDarkSwitcherButtonProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className={`cursor-pointer ${styles}`}
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
  );
};
