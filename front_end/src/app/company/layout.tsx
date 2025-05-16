import { SideNavBar } from "@/components/navbar/SideNavBar";

const RootCompanyLayout = ({ children }: { children: React.ReactNode }) => {
  return <div>
    <SideNavBar />
    {children}
    </div>;
};

export default RootCompanyLayout;
