import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className={`min-h-screen transition-[margin] duration-200 ${sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[250px]'}`}>
        <Header sidebarCollapsed={sidebarCollapsed} onOpenMenu={() => setMobileNavOpen(true)} />
        <main className="relative pt-16 w-full min-h-screen bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
