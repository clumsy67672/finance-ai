'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = {
  href: string;
  label: string;
  roles?: Array<'admin' | 'member'>;
};

export default function DashboardNav({ items, role }: { items: NavItem[]; role: 'admin' | 'member' }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex gap-5 border-b border-slate-200">
      {items
        .filter((item) => !item.roles || item.roles.includes(role))
        .map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}