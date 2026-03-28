import type { RefObject } from 'react';
import { motion } from 'framer-motion';
import { NotificationDropdown, type NotificationItem } from './NotificationDropdown';
import { fadeSlideCard } from '../animations/motionPresets';

export type SearchRouteHint = {
  prefix: string;
  label: string;
  hint: string;
  basePath: string;
};

function stringToSafeColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 40%)`;
}

interface AppHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  searchInputRef: RefObject<HTMLInputElement>;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  searchHintsOpen: boolean;
  filteredSearchHints: SearchRouteHint[];
  onSearchSuggestionPick: (basePath: string) => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  notifications: NotificationItem[];
  showNotifications: boolean;
  onNotificationToggle: () => void;
  notificationRef: React.RefObject<HTMLDivElement>;
  onNotificationItemClick: (path: string) => void;
  onNotificationLoadMore?: () => void;
  hasMoreNotifications?: boolean;
  loadingMoreNotifications?: boolean;
  userEmail: string;
  hasUnreadNotifications?: boolean;
}

export function AppHeader({
  isSidebarOpen,
  onToggleSidebar,
  searchInputRef,
  searchValue,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  searchHintsOpen,
  filteredSearchHints,
  onSearchSuggestionPick,
  onSearchKeyDown,
  notifications,
  showNotifications,
  onNotificationToggle,
  notificationRef,
  onNotificationItemClick,
  onNotificationLoadMore,
  hasMoreNotifications = false,
  loadingMoreNotifications = false,
  userEmail,
  hasUnreadNotifications = false,
}: AppHeaderProps) {
  return (
    <motion.header
      className="relative z-40 h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0"
      variants={fadeSlideCard}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <span className="text-xl">✕</span> : <span className="text-xl">☰</span>}
        </button>
        <div className="hidden md:block relative w-64">
          <div className="flex items-center bg-slate-100 rounded-full px-4 py-1.5">
            <span className="text-slate-400 mr-2 shrink-0">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search everything..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              onKeyDown={onSearchKeyDown}
              className="bg-transparent border-none text-sm focus:ring-0 w-full outline-none min-w-0"
            />
          </div>
          {searchHintsOpen && filteredSearchHints.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Search link
              </p>
              <ul className="max-h-56 overflow-y-auto">
                {filteredSearchHints.map((h) => (
                  <li key={h.prefix}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSearchSuggestionPick(h.basePath)}
                    >
                      <span className="font-mono text-xs text-slate-600">{h.prefix}</span>
                      <span className="flex-1">
                        <span className="font-medium text-slate-800">{h.label}</span>
                        <span className="text-slate-400"> · </span>
                        <span className="text-xs text-slate-500">{h.hint}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        <button
          data-notification-button
          onClick={onNotificationToggle}
          className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <span className="text-slate-600 text-lg">🔔</span>
          {hasUnreadNotifications && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>

        {showNotifications && (
          <NotificationDropdown
            ref={notificationRef}
            notifications={notifications}
            onItemClick={onNotificationItemClick}
            onLoadMore={onNotificationLoadMore}
            hasMore={hasMoreNotifications}
            loadingMore={loadingMoreNotifications}
          />
        )}

        <div className="h-8 w-[1px] bg-slate-200 mx-2" />
        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 leading-none">{userEmail}</p>
            <p className="text-[10px] text-slate-500 mt-1">Admin</p>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: stringToSafeColor(userEmail) }}
          >
            {userEmail.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
