import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const { logout } = useAuth();

  return (
    <header className="bg-black text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">4dots Admin</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header; 