import Link from 'next/link';
import { useRouter } from 'next/router';

const routes = [
  { href: '/', label: 'Write' },
  { href: '/summaries', label: 'Summaries' },
];

export default function AppShell({ children }) {
  const router = useRouter();

  return (
    <div className="app-shell">
      <div className="device-frame">
        <header className="device-header">
          <div>
            <p className="eyebrow">MindText</p>
            <h1>Daily Journal</h1>
          </div>
          <nav className="device-nav" aria-label="Sections">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={router.pathname === route.href ? 'is-active' : undefined}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="device-main">{children}</main>
      </div>
    </div>
  );
}
