'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getLocalSession, logoutSession } from '@/lib/auth-service';
import { BookOpen, User, LogOut, LayoutDashboard, Settings, PlusCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsDemoMode(!isSupabaseConfigured());
    setUser(getLocalSession());
  }, [pathname]);

  const handleLogout = async () => {
    await logoutSession(isDemoMode ? null : supabase);
  };

  // Hide Navbar completely when inside active test environment to avoid layout shifts or distractions
  if (pathname && pathname.startsWith('/test/') && !pathname.includes('/results')) {
    return null;
  }

  return (
    <header className="bg-card/75 backdrop-blur-md border-b border-border sticky top-0 z-40 w-full select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 text-primary font-bold text-lg sm:text-xl tracking-tight hover:opacity-90 transition-all">
              <span className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <BookOpen className="w-5 h-5" />
              </span>
              <span className="text-white font-extrabold">NEET <span className="text-primary font-medium">Analyzer</span></span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                pathname === '/' 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Exams
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                pathname === '/dashboard' 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dashboard
            </Link>
            {user?.is_admin && (
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pathname === '/admin' 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload Test
              </Link>
            )}
          </nav>

          {/* Profile Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden md:block">
                  <span className="block text-sm font-semibold text-white leading-none">{user.full_name}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    {user.is_admin ? 'Instructor Admin' : 'NEET Candidate'}
                  </span>
                </div>
                
                {/* Profile Icon / Dropdown placeholder that redirects to home/settings */}
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-primary font-bold text-xs uppercase shadow-inner">
                  {user.full_name?.charAt(0) || 'N'}
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg border border-border text-slate-400 hover:text-danger hover:border-danger/30 transition-all cursor-pointer tap-highlight-transparent"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="py-1.5 px-3 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                Sign In
              </Link>
            )}
          </div>

        </div>
      </div>
      
      {/* Mobile Navigation bar for small devices */}
      <div className="sm:hidden grid grid-cols-3 border-t border-border/80 bg-card py-2 px-1 text-center">
        <Link
          href="/"
          className={`flex flex-col items-center text-[10px] font-bold ${
            pathname === '/' ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span>Exams</span>
        </Link>
        <Link
          href="/dashboard"
          className={`flex flex-col items-center text-[10px] font-bold ${
            pathname === '/dashboard' ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Dashboard</span>
        </Link>
        {user?.is_admin ? (
          <Link
            href="/admin"
            className={`flex flex-col items-center text-[10px] font-bold ${
              pathname === '/admin' ? 'text-primary' : 'text-slate-400'
            }`}
          >
            <PlusCircle className="w-4 h-4 mb-0.5" />
            <span>Upload</span>
          </Link>
        ) : (
          <button
            onClick={handleLogout}
            className="flex flex-col items-center text-[10px] font-bold text-slate-400 hover:text-danger"
          >
            <LogOut className="w-4 h-4 mb-0.5" />
            <span>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
