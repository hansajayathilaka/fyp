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

export const InvestorSideNavBarItemList = [
    {
        icon: Home,
        label: "Home",
        href: "/",
    },
    {
        icon: LayoutGrid,
        label: "Dashboard",
        href: "/investor/dashboard",
    },
    {
        icon: Coins,
        label: "Trading",
        href: "/investor/trading",
    },
    {
        icon: ListOrdered,
        label: "My Wallet",
        href: "/investor/my-wallet",
    },
    {
        icon: FileBarChart,
        label: "Peer Transactions",
        href: "/investor/peer-transactions",
    }
]