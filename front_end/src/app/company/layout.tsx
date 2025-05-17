"use client";

import type React from "react";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Suspense } from "react";
import { SideNavBar } from "@/components/navbar/SideNavBar";

const RootCompanyLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <SideNavBar />
        <SidebarInset className="bg-slate-50">
          <header className="flex h-16 items-center justify-between border-b bg-white px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <div className="relative w-[400px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search for stocks & more"
                  className="w-full pl-8"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>
              <Avatar>
                <AvatarImage
                  src="/placeholder.svg?height=32&width=32"
                  alt="User"
                />
                <AvatarFallback>AG</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="p-4">{children}</main>
        </SidebarInset>
      </Suspense>
    </SidebarProvider>
  );
};

export default RootCompanyLayout;
