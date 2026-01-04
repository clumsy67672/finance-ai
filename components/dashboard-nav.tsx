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
    <nav className="flex flex-wrap gap-3">
      {items
        .filter((item) => !item.roles || item.roles.includes(role))
        .map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full border px-4 py-1 text-sm font-medium transition ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
