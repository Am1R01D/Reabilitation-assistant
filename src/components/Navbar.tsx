'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
}

interface NavbarProps {
  items: NavItem[];
  userName: string;
  role: string;
}

export function Navbar({ items, userName, role }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-white/80 sticky top-0 z-50 shadow-[0_1px_0_rgba(15,53,58,0.06)]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href={items[0]?.href || '/'} className="flex items-center gap-2">
            <div className="w-9 h-9 bg-medical-600 rounded-xl flex items-center justify-center shadow-[0_5px_12px_rgba(34,117,108,0.25)]">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-clinical-900 hidden sm:block">RehabAssist</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  pathname === item.href
                    ? 'bg-medical-50 text-medical-700'
                    : 'text-clinical-600 hover:bg-clinical-50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-clinical-900">{userName}</p>
              <p className="text-xs text-clinical-500 capitalize">{role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-clinical-500 hover:text-clinical-700 hover:bg-clinical-50 rounded-xl transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              className="md:hidden p-2 text-clinical-500"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block px-3 py-2 rounded-lg text-sm font-medium',
                  pathname === item.href
                    ? 'bg-medical-50 text-medical-700'
                    : 'text-clinical-600'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
