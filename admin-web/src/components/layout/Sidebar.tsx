import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { slideUpItem, fadeSlideCard } from '../animations/motionPresets';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  isOpen: boolean;
  navItems: NavItem[];
  onLogout: () => void;
}

export function Sidebar({ isOpen, navItems, onLogout }: SidebarProps) {
  const location = useLocation();

  return (
    <motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'transition-all duration-300 ease-in-out bg-white border-r border-slate-200 flex flex-col z-50',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="p-6 flex items-center justify-between">
        <NavLink
          to="/"
          className={cn(
            'flex items-center gap-3 overflow-hidden cursor-pointer',
            !isOpen && 'justify-center'
          )}
        >
          <div className="overflow-hidden rounded-md w-10 h-10">
            <img src="../../icon-192.webp" className="w-full h-full object-cover" alt="Logo" />
          </div>
          {isOpen && (
            <span className="font-bold text-xl tracking-tight text-slate-900 whitespace-nowrap">
              Teyvat Admin
            </span>
          )}
        </NavLink>
      </div>

      <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.div
              key={item.path}
              variants={slideUpItem}
              initial="hidden"
              animate="visible"
              custom={index}
            >
              <NavLink
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
                  isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                  !isOpen && 'justify-center'
                )}
              >
                <span className="shrink-0 text-lg">{item.icon}</span>
                {isOpen && <span className="font-medium text-sm">{item.label}</span>}
                {isOpen && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      <motion.div
        className="p-4 border-t border-slate-100"
        variants={fadeSlideCard}
        initial="hidden"
        animate="visible"
      >
        <button
          onClick={onLogout}
          className={cn(
            'flex items-center gap-3 px-3 py-3 w-full rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all',
            !isOpen && 'justify-center'
          )}
        >
          <span className="text-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </span>
          {isOpen && <span className="font-medium text-sm">Logout</span>}
        </button>
      </motion.div>
    </motion.aside>
  );
}
