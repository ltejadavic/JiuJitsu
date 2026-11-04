'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DatabaseBackupButton } from '@/components/ui/DatabaseBackupButton';
import {
  Calendar as CalendarIcon,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  X,
  Shield,
  Loader2,
} from 'lucide-react';

const navigation = [
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Instructors', href: '/teachers', icon: GraduationCap },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-slate-400">Loading Academy Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar with Isolated Stacking */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex h-screen justify-between relative z-40 isolate">
        <div>
          {/* Brand */}
          <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Arte Suave BJJ</h1>
              <p className="text-xs text-slate-500">Academy Manager</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5 p-4 overflow-y-auto max-h-[calc(100vh-180px)]">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition select-none ${
                    isActive
                      ? 'bg-blue-50 font-semibold text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout (Always visible at bottom of sidebar) */}
        <div className="border-t border-slate-200 p-4 bg-white">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-[11px] text-slate-500">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700 hover:border-red-200 shadow-xs"
          >
            <LogOut className="h-4 w-4 text-red-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-screen overflow-hidden relative z-20">
        {/* Desktop Top Header with Sign Out Button */}
        <header className="hidden h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-xs md:flex relative z-30">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Authenticated Session
            </span>
            <span className="text-slate-300">•</span>
            <span>Arte Suave Jiu-Jitsu Academy</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{user.name}</p>
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                Administrator
              </span>
            </div>
            <DatabaseBackupButton variant="header" />
            <button
              onClick={logout}
              title="Sign Out and Protect Session"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700 hover:border-red-200 shadow-xs cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden relative z-30">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-slate-900">Arte Suave BJJ</span>
          </div>
          <div className="flex items-center gap-2">
            <DatabaseBackupButton variant="header" />
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 cursor-pointer"
            >
              <LogOut className="h-5 w-5 text-red-500" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white p-4 md:hidden relative z-40">
            <nav className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 select-none"
                >
                  <item.icon className="h-5 w-5 text-slate-500" />
                  {item.name}
                </Link>
              ))}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <DatabaseBackupButton variant="menu" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}

