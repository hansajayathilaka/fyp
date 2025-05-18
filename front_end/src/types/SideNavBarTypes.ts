export interface SideNavBarItemComponentProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  isActive?: boolean;
  colorVarient?: string;
}

export interface SideNavBarProps {
  titleName?: string;
  itemList?: SideNavBarItemComponentProps[];
  colorVarient?: string;
}
