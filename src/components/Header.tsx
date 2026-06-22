import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { logout, phoneNumber } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300">
      <div className="px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Hamburger Menu Button */}
          <button
            onClick={onToggleSidebar}
            className="p-2.5 rounded-xl hover:bg-gray-100/80 text-gray-600 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Dashboard Status Indicator */}
          <div className="hidden sm:flex items-center gap-2.5 text-sm font-semibold text-gray-500 tracking-tight">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Admin Dashboard
          </div>
        </div>
        
        <div className="flex items-center gap-4">

          <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

          {/* Premium Logout Button */}
          <button
            onClick={logout}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all focus:outline-none focus:ring-4 focus:ring-red-500/10 active:scale-95 border border-transparent hover:border-red-100 shadow-sm"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;