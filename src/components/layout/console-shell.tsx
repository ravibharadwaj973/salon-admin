'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, CalendarClock, LayoutDashboard, LogOut, Package, ShieldCheck, Wallet } from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/tenants', label: 'Salons', icon: Building2 },
  { href: '/renewals', label: 'Renewals', icon: CalendarClock },
  { href: '/plans', label: 'Plans', icon: Package },
  { href: '/packs', label: 'Add-ons', icon: Wallet },
];

export function ConsoleShell({ children, operator }: { children: React.ReactNode; operator: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    // Hard navigation, for the same reason as signing in: the cookie changed
    // on the server, and a client-side navigation would leave cached pages
    // rendered as though the operator were still signed in.
    window.location.replace('/login');
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* The console is deliberately dark: you should always know you are not
          inside a salon's own app. */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col bg-stone-900 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <ShieldCheck className="h-4 w-4 text-white" />
          <span className="text-sm font-semibold tracking-tight text-white">Platform</span>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                      active ? 'bg-white/10 font-medium text-white' : 'text-stone-400 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 px-1">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{operator}</p>
              <p className="text-2xs text-stone-500">Operator</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-md p-1.5 text-stone-400 hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-56">
        <header className="flex h-14 items-center gap-3 border-b border-stone-200 bg-white px-4 lg:hidden">
          <ShieldCheck className="h-4 w-4 text-ink" />
          <span className="text-sm font-semibold text-ink">Salon OS Platform</span>
          <nav className="ml-auto flex gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-2 py-1 text-xs font-medium',
                  isActive(item.href, item.exact) ? 'bg-stone-100 text-ink' : 'text-ink-muted',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
