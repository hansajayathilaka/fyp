import { ConnectWalletButtonType } from "@/types/navBar";
import { Button } from "../ui/button";

export const ConnectWalletButton = ({ styles }: ConnectWalletButtonType) => {
  return (
    <Button className={`bg-darkSecondary dark:bg-darkSecondary dark:text-lightBackGround dark:hover:bg-buttonHover hover:bg-buttonHover font-bold text-lg ${styles} rounded-lg`}>
      Connect Wallet
    </Button>
  );
};
