import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Overview', path: '/', icon: 'dashboard' },
    { name: 'Interactive Learning', path: '/interactive', icon: 'psychology', badge: 'AI' },
    { name: 'Audio Analysis', path: '/audio-analysis', icon: 'graphic_eq' },
    { name: 'My Lectures', path: '/lectures', icon: 'video_library' },
    { name: "Today's Lecture", path: '/lectures/today', icon: 'sensors' },
    { name: 'Subjects', path: '/subjects', icon: 'folder_open' },
    ...(user?.role === 'teacher' ? [{ name: 'Timetable', path: '/timetable', icon: 'calendar_month' }] : []),
    { name: 'Notes', path: '/notes', icon: 'description' },
    { name: 'Revision', path: '/revision', icon: 'cached' },
  ];

  const prefItems = [
    { name: 'Settings', path: '/settings', icon: 'settings' },
    { name: 'Help & Support', path: '/help', icon: 'help' },
  ];

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[250px] bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between border-r border-outline-variant/30">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-space-lg gap-space-sm border-b border-surface-container-high/40">
          <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-[20px]">all_inclusive</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-lg font-bold tracking-tight text-on-surface">Lecture</span>
            <span className="font-headline-sm text-lg font-bold tracking-tight text-primary-container">Loop</span>
          </div>
        </div>

        {/* Study Workspace Nav */}
        <div className="px-space-md py-space-xs mt-3">
          <div className="text-label-sm font-label-sm uppercase tracking-wider text-outline px-space-sm mb-space-xs text-xs font-semibold">
            Study Workspace
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/' || item.path === '/lectures'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-md py-space-sm rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? 'bg-surface-container-high text-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`
                }
              >
                <div className="flex items-center gap-space-md">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="font-label-md text-sm">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-secondary-container text-on-secondary-container">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="my-space-sm mx-space-md h-[1px] bg-surface-container-high"></div>

        {/* Preferences Nav */}
        <div className="px-space-md py-space-xs">
          <div className="text-label-sm font-label-sm uppercase tracking-wider text-outline px-space-sm mb-space-xs text-xs font-semibold">
            Preferences
          </div>
          <nav className="flex flex-col gap-1">
            {prefItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-space-md px-space-md py-space-sm rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? 'bg-surface-container-high text-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-label-md text-sm">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* User Profile Footer with Sign Out */}
      <div className="p-space-md bg-surface-container-lowest border-t border-surface-container-high/40">
        <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low group">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="font-label-md text-sm text-on-surface truncate font-medium">
                {user?.name || 'Student User'}
              </span>
              <span className="font-label-sm text-xs text-on-surface-variant truncate">
                {user?.semester || 'CS Undergraduate'}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-error-container/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
