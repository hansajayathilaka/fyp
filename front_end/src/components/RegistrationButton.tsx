import { RegistrationButtonType } from "@/types/registrationButtonBype";
import { Button } from "./ui/button";

export const RegistrationButton = ({
  styles,
  buttonText,
  variant = "default",
}: RegistrationButtonType) => {
  return (
    <Button
      variant={variant}
      className={`bg-darkSecondary dark:bg-darkSecondary dark:text-lightBackGround dark:hover:bg-buttonHover hover:bg-buttonHover
font-bold text-lg ${styles} rounded-lg`}
    >
      {buttonText || "Register"}
    </Button>
  );
};
