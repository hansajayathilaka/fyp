"use client";
import {
  LayoutGrid,
  Coins,
  ListOrdered,
  FileBarChart,
  Settings,
  ChevronDown,
  Zap,
  Home,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActiveLink } from "./ActiveLink";

export function SideNavBar() {
  return (
    <Sidebar variant="floating" className="rounded-lg shadow-sm">
      <SidebarHeader className="pb-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-white">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="font-semibold">Company Name</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <SidebarMenu className="p-4">
          {CompanySideNavBarItemList.map((item, index) => (
            <SideNavBarItemComponent
              key={index}
              icon={item.icon}
              label={item.label}
              href={item.href}
            />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="mt-auto">
        <SidebarMenu>
          <SideNavBarItemComponent icon={Settings} label="Settings" href="#" />
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="mr-2 h-6 w-6">
                      <AvatarImage
                        src="/placeholder.svg?height=32&width=32"
                        alt="User"
                      />
                      <AvatarFallback>AG</AvatarFallback>
                    </Avatar>
                    <span>Aurobindo Gill</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Account Settings</DropdownMenuItem>
                <DropdownMenuItem>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

interface SideNavBarItemComponentProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  isActive?: boolean;
}

const CompanySideNavBarItemList = [
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

const SideNavBarItemComponent = ({
  icon: Icon,
  label,
  href = "#",
}: SideNavBarItemComponentProps) => {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className="hover:text-sky-500 data-[active=true]:text-sky-500 active:text-sky-500">
        <ActiveLink
          href={href}
          className="flex items-center"
          activeClassName="text-sky-500"
        >
          <Icon className="mr-2 h-4 w-4" />
          <span className="font-semibold">{label}</span>
        </ActiveLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
