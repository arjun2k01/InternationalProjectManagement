import React from 'react';
import useAuthStore from '../../store/authStore';

const Header = ({ toggleSidebar }) => {
  const { user } = useAuthStore();

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm relative z-10">
      <div className="flex items-center">
        {/* Mobile Hamburger Hook */}
        <button
          onClick={toggleSidebar}
          className="mr-4 text-slate-500 hover:text-slate-700 lg:hidden focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md p-1"
        >
          <span className="sr-only">Open sidebar</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Global Search Bar Placeholder */}
        <div className="hidden sm:flex items-center px-3 py-1.5 bg-slate-100 border border-transparent rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent focus-within:bg-white transition-colors">
            <svg className="h-4 w-4 text-slate-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search workspaces..." 
              className="bg-transparent border-none p-0 text-sm focus:ring-0 text-slate-900 placeholder-slate-400 w-64"
            />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications Icon */}
        <button className="text-slate-400 hover:text-slate-600 transition-colors relative p-1 rounded-full focus:outline-none focus:bg-slate-100">
           <span className="sr-only">View notifications</span>
           <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
           </svg>
           {/* Notification marker bump */}
           <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
