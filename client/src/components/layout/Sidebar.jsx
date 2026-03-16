import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const { user, logout } = useAuthStore();

  const navItems = [
    { name: 'My Projects', path: '/projects', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    // Add more global links later like 'My Tasks', 'Settings', etc.
  ];

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out flex flex-col
      lg:static lg:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Logo & Header */}
      <div className="h-16 flex items-center px-6 font-bold text-xl text-white tracking-wide border-b border-slate-800 shrink-0">
        <div className="w-8 h-8 rounded bg-blue-500 mr-3 flex items-center justify-center shadow-lg shadow-blue-500/20">
           <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
           </svg>
        </div>
        ProjectFlow
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={closeSidebar}
            className={({ isActive }) => `
              group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-150
              ${isActive 
                ? 'bg-blue-600/10 text-blue-400' 
                : 'hover:bg-slate-800 hover:text-white'}
            `}
          >
            <svg 
              className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-150 `} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Profile & Settings Footer */}
      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="flex items-center w-full px-3 py-2 mt-auto">
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-slate-700">
              <span className="text-sm font-medium leading-none text-white pb-px">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </span>
            </span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs font-medium text-slate-500 truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-slate-700 rounded-md shadow-sm text-sm font-medium text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
