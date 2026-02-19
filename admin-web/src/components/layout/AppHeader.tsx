import { NotificationDropdown, type NotificationItem } from './NotificationDropdown';

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
  searchValue: string;
  onSearchChange: (v: string) => void;
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
}

export function AppHeader({
  isSidebarOpen,
  onToggleSidebar,
  searchValue,
  onSearchChange,
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
}: AppHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <span className="text-xl">✕</span> : <span className="text-xl">☰</span>}
        </button>
        <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-1.5 w-64">
          <span className="text-slate-400 mr-2">🔍</span>
          <input
            type="text"
            placeholder="Search everything..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="bg-transparent border-none text-sm focus:ring-0 w-full outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        <button
          data-notification-button
          onClick={onNotificationToggle}
          className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <span className="text-slate-600 text-lg">🔔</span>
          {notifications.length > 0 && (
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
    </header>
  );
}
