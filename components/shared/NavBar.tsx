'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-fog bg-pure-white px-10 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-serif text-xl text-aged-sepia font-medium">
          Plan2Reality
        </Link>
        <div className="flex gap-6 font-sans text-sm">
          <Link
            href="/planner"
            className={pathname === '/planner' ? 'text-teal-accent font-medium' : 'text-moss-shadow hover:text-aged-sepia'}
          >
            Planner Console
          </Link>
          <Link
            href="/review"
            className={pathname === '/review' ? 'text-teal-accent font-medium' : 'text-moss-shadow hover:text-aged-sepia'}
          >
            Review Queue
          </Link>
        </div>
      </div>
      <div className="font-mono text-xs text-moss-shadow uppercase tracking-wider">
        SIH 2026 • Team Seekers
      </div>
    </nav>
  );
}
