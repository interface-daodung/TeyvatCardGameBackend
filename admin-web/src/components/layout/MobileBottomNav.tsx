import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

const TABS: { to: string; label: string; icon: string; title: string; end?: boolean }[] = [
  { to: '/mobile', label: 'Home', icon: '📊', title: 'Dashboard', end: true },
  { to: '/mobile/users', label: 'Users', icon: '👥', title: 'User list' },
  { to: '/mobile/adventure-cards', label: 'Cards', icon: '🎴', title: 'Adventure Cards' },
  { to: '/mobile/manager-assets', label: 'Assets', icon: '📁', title: 'Image file management' },
  { to: '/mobile/about', label: 'About', icon: 'ℹ️', title: 'App information' },
];

export function MobileBottomNav() {
  return (
    <nav
      className="safe-area-pb flex shrink-0 items-stretch justify-around border-t border-slate-200 bg-white px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Main navigation (mobile)"
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          title={tab.title}
          className={({ isActive }) =>
            cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            )
          }
        >
          <span className="text-lg leading-none" aria-hidden>
            {tab.icon}
          </span>
          <span className="truncate px-0.5">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
