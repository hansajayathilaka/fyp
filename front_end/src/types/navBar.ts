export interface NavBarItemType {
  title: string;
  classProps?: string;
  url: string;
}

export interface LightDarkSwitcherButtonProps {
  styles?: string;
}

export interface MobileNavBarProps {
  setTogleMenu: (value: boolean) => void;
}

export interface ConnectWalletButtonType {
  styles?: string;
}