import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ collapsed = false, onToggle, mobileOpen = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: 'dashboard' },
    { name: 'Interactive', path: '/interactive', icon: 'psychology', badge: 'AI' },
    { name: 'Padhai AI', path: '/padhai-ai', icon: 'auto_awesome' },
    { name: 'My Lectures', path: '/my-lectures', icon: 'video_library' },
    { name: 'My Subjects', path: '/my-subjects', icon: 'folder_open' },
    { name: 'Oral Test', path: '/oral-test', icon: 'record_voice_over' },
    { name: 'Audio Analysis', path: '/audio-analysis', icon: 'graphic_eq' },
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

  const linkClass = ({ isActive }) => `flex items-center ${collapsed ? 'md:justify-center' : 'justify-between'} gap-space-md px-space-md py-2 rounded-lg transition-colors text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${isActive ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`;

  return (
    <>
      {mobileOpen && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/35 md:hidden" />}
      <aside className={`fixed left-0 top-0 h-screen w-[250px] ${collapsed ? 'md:w-[72px]' : 'md:w-[250px]'} bg-surface-container-lowest z-50 flex flex-col justify-between border-r border-outline-variant/30 shadow-sm transition-[width,transform] duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className={`h-16 shrink-0 flex items-center gap-space-sm border-b border-outline-variant/20 ${collapsed ? 'md:justify-center md:px-2' : 'px-space-lg'}`}>
            <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shrink-0"><span className="material-symbols-outlined text-[20px]">all_inclusive</span></div>
            <div className={`${collapsed ? 'md:hidden' : ''} flex items-center gap-1`}><span className="text-lg font-bold text-on-surface">Lecture</span><span className="text-lg font-bold text-primary">Loop</span></div>
            <button onClick={onToggle} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'} className="ml-auto hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-outline hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><span className="material-symbols-outlined text-[18px]">{collapsed ? 'left_panel_open' : 'left_panel_close'}</span></button>
          </div>

          <div className="mt-2 px-space-md py-space-xs">
            {!collapsed && <div className="mb-1 px-space-sm text-[10px] font-semibold uppercase tracking-wider text-outline">Study Workspace</div>}
            <nav aria-label="Study workspace" className="flex flex-col gap-0.5">
              {navItems.map((item) => <NavLink key={item.path} to={item.path} end={item.path === '/'} title={collapsed ? item.name : undefined} onClick={onClose} className={linkClass}>
                <span className={`flex min-w-0 items-center gap-space-md ${collapsed ? 'md:justify-center' : ''}`}><span className="material-symbols-outlined shrink-0 text-[20px]">{item.icon}</span><span className={`${collapsed ? 'md:hidden' : ''} truncate`}>{item.name}</span></span>
                {item.badge && !collapsed && <span className="rounded-full bg-secondary-container px-1.5 py-0.5 text-[10px] font-semibold text-on-secondary-container">{item.badge}</span>}
              </NavLink>)}
            </nav>
          </div>

          {!collapsed && <div className="mx-space-md my-space-xs h-px bg-surface-container-high" />}
          <div className="px-space-md py-space-xs">
            {!collapsed && <div className="mb-1 px-space-sm text-[10px] font-semibold uppercase tracking-wider text-outline">Preferences</div>}
            <nav aria-label="Preferences" className="flex flex-col gap-0.5">
              {prefItems.map((item) => <NavLink key={item.path} to={item.path} title={collapsed ? item.name : undefined} onClick={onClose} className={linkClass}>
                <span className={`flex min-w-0 items-center gap-space-md ${collapsed ? 'md:justify-center' : ''}`}><span className="material-symbols-outlined shrink-0 text-[20px]">{item.icon}</span><span className={`${collapsed ? 'md:hidden' : ''} truncate`}>{item.name}</span></span>
              </NavLink>)}
            </nav>
          </div>
        </div>

        <div className={`border-t border-outline-variant/30 p-space-md ${collapsed ? 'md:p-2' : ''}`}>
          <div className={`flex items-center justify-between gap-2 rounded-xl bg-surface-container-low p-space-sm ${collapsed ? 'md:justify-center' : ''}`}>
            <div className={`flex min-w-0 items-center gap-space-sm ${collapsed ? 'md:justify-center' : ''}`}>
              <div className="w-9 h-9 shrink-0 rounded-full bg-primary-container flex items-center justify-center"><span className="text-sm font-semibold text-on-primary">{(user?.name || 'S').slice(0, 1).toUpperCase()}</span></div>
              <div className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}><div className="truncate text-sm font-medium text-on-surface">{user?.name || 'Student User'}</div><div className="truncate text-xs text-on-surface-variant">{user?.semester || 'CS Undergraduate'}</div></div>
            </div>
            <button onClick={handleSignOut} title="Sign out" aria-label="Sign out" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-outline hover:bg-error-container/30 hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${collapsed ? 'md:hidden' : ''}`}><span className="material-symbols-outlined text-[18px]">logout</span></button>
          </div>
        </div>
      </aside>
    </>
  );
}
