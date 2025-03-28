import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative">
      {/* Background Image */}
      <div
        className="absolute top-[100vh] right-[-32px] w-[300px] h-[500px] opacity-30 sm:opacity-90 "
        style={{
          backgroundImage: "url('/images/Group34.png')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      ></div>

      {/* Content */}
      <div className="px-8 md:px-16 pt-2 min-h-screen relative">{children}</div>
    </div>
  );
};

export default Layout;
