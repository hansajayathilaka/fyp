export const SideNavBar = () => {
  return (
    <div className="flex flex-col h-full w-64 bg-gray-800 text-white">
      <div className="flex items-center justify-center h-16 bg-gray-900">
        <h1 className="text-xl font-bold">Company Name</h1>
      </div>
      <nav className="flex flex-col p-4 space-y-2">
        <a href="/company/dashboard" className="hover:bg-gray-700 p-2 rounded">
          Dashboard
        </a>
        <a
          href="/company/mint-new-token"
          className="hover:bg-gray-700 p-2 rounded"
        >
          Mint New Token
        </a>
        <a href="/company/settings" className="hover:bg-gray-700 p-2 rounded">
          Settings
        </a>
      </nav>
    </div>
  );
};
