import { Outlet } from "react-router-dom";
import { useState } from "react";

import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout({ authStore, children, navigationItems }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        authStore={authStore}
        onMenuClick={() => setIsSidebarOpen(true)}
      />

      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          items={navigationItems}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children ?? <Outlet />}</div>
        </main>
      </div>
    </div>
  );
}
