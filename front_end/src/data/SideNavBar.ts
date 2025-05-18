import { Coins, FileBarChart, Home, LayoutGrid, ListOrdered } from "lucide-react";

export const CompanySideNavBarItemList = [
  {
    icon: Home,
    label: "Home",
    href: "/",
  },
  {
    icon: LayoutGrid,
    label: "Dashboard",
    href: "/company/dashboard",
  },
  {
    icon: Coins,
    label: "Mint New Token",
    href: "/company/mint-new-token",
  },
  {
    icon: ListOrdered,
    label: "List Tokens for Sale",
    href: "/company/list-tokens-for-sale",
  },
  {
    icon: FileBarChart,
    label: "Reports & Compliance",
    href: "/company/reports-and-compliance",
  },
];