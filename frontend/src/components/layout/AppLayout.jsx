import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import { HiOutlineBars3 } from 'react-icons/hi2';

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-600 dark:text-gray-300">
          <HiOutlineBars3 className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">FinTech Wallet</h1>
      </div>

      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
