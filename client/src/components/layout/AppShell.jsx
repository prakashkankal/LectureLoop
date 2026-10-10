import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-[250px]">
        <Header />
        <main className="relative pt-16 w-full min-h-screen bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
