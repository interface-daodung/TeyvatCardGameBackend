import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { notificationService } from '../../services/notificationService';
import { Sidebar, type NavItem, type NavSection } from './Sidebar';
import { AppHeader } from './AppHeader';
import { DbAuthGuard } from '../DbAuthGuard';
import type { NotificationItem } from './NotificationDropdown';
import { AIChatBubble } from './AIChatBubble';

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: '📊' },
      { path: '/users', label: 'Users', icon: '👥' },
      { path: '/payments', label: 'Payments', icon: '💳' },
      { path: '/payment-link', label: 'Create payment link', icon: '🔗' },
    ],
  },
  {
    id: 'game-data',
    label: 'Game data',
    items: [
      { path: '/characters', label: 'Characters', icon: '⚔️' },
      { path: '/equipment', label: 'Equipment', icon: '🛡️' },
      { path: '/adventure-cards', label: 'Adventure Cards', icon: '🎴' },
      { path: '/maps', label: 'Maps', icon: '🗺️' },
    ],
  },
  {
    id: 'content-assets',
    label: 'Content & Assets',
    items: [
      { path: '/localization', label: 'Localization', icon: '🌐' },
      { path: '/themes', label: 'Themes', icon: '🎨' },
      { path: '/manager-assets', label: 'Manager Assets', icon: '📁' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { path: '/server-configuration-versions', label: 'Server config', icon: '⚙️' },
      { path: '/logs', label: 'Logs', icon: '📝' },
      { path: '/calculate-movement', label: 'Calculate Movement', icon: '🧩' },
      { path: '/ai-manage', label: 'AI Manage', icon: '🤖' },
      { path: '/database-management', label: 'Database Management', icon: '🗄️' },
      { path: '/about', label: 'About', icon: 'ℹ️' },
    ],
  },
];

const RECENT_LINKS_STORAGE_KEY = 'teyvat_admin_recent_links';
const RECENT_LINKS_LIMIT = 4;

type RecentLinkEntry = {
  path: string;
  label: string;
  icon: string;
};

const FLAT_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

/** Gợi ý link search (khớp prefix trong handleSearchKeyDown); hash theo từng trang: Users name, Localization key, Payments/Logs email */
export const SEARCH_ROUTE_HINTS: {
  prefix: string;
  label: string;
  hint: string;
  basePath: string;
}[] = [
  { prefix: 'users:', label: 'Users', hint: 'name', basePath: '/users' },
  { prefix: 'local:', label: 'Localization', hint: 'key', basePath: '/localization' },
  { prefix: 'pays:', label: 'Payments', hint: 'email', basePath: '/payments' },
  { prefix: 'logs:', label: 'Logs', hint: 'email', basePath: '/logs' },
];

function updateRecentLinks(pathname: string) {
  if (typeof window === 'undefined') return;

  const item = FLAT_NAV_ITEMS.find((navItem) => navItem.path === pathname);
  if (!item) return;

  try {
    const raw = window.localStorage.getItem(RECENT_LINKS_STORAGE_KEY);
    const current: RecentLinkEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(current) ? current.filter((entry) => entry.path !== item.path) : [];

    const next: RecentLinkEntry[] = [
      { path: item.path, label: item.label, icon: item.icon },
      ...filtered,
    ].slice(0, RECENT_LINKS_LIMIT);

    window.localStorage.setItem(RECENT_LINKS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastViewedNotifications, setLastViewedNotifications] = useState<string | null>(null);
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationPagesTotal, setNotificationPagesTotal] = useState(0);
  const [loadingMoreNotifications, setLoadingMoreNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const hasMoreNotifications = notificationPage < notificationPagesTotal;
  const userEmail = authService.getUserEmail() || 'Admin';

  const newestNotificationDate = notifications[0]?.['data-creation'] ?? null;
  const hasUnreadNotifications =
    newestNotificationDate != null &&
    (lastViewedNotifications == null || new Date(newestNotificationDate) > new Date(lastViewedNotifications));

  const handleLogout = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    authService.logout();
    setNotifications([]);
    navigate('/login');
  };

  const filteredSearchHints = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return SEARCH_ROUTE_HINTS;
    return SEARCH_ROUTE_HINTS.filter(
      (h) =>
        h.prefix.toLowerCase().includes(q) ||
        h.label.toLowerCase().includes(q) ||
        h.hint.toLowerCase().includes(q) ||
        h.basePath.toLowerCase().includes(q)
    );
  }, [searchValue]);

  const handleSearchSuggestionPick = useCallback(
    (basePath: string) => {
      navigate(basePath);
      setSearchValue('');
      setSearchFocused(false);
      searchInputRef.current?.blur();
    },
    [navigate]
  );

  useEffect(() => {
    const onDocKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'k') return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    document.addEventListener('keydown', onDocKey);
    return () => document.removeEventListener('keydown', onDocKey);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const trimmed = searchValue.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('logs:')) {
      const rest = trimmed.slice(5).trim();
      navigate(`/logs${rest ? `#${encodeURIComponent(rest)}` : ''}`);
      setSearchValue('');
      return;
    }
    if (trimmed.startsWith('pays:')) {
      const rest = trimmed.slice(5).trim();
      navigate(`/payments${rest ? `#${encodeURIComponent(rest)}` : ''}`);
      setSearchValue('');
      return;
    }
    if (trimmed.startsWith('users:')) {
      const rest = trimmed.slice(6).trim();
      navigate(`/users${rest ? `#${encodeURIComponent(rest)}` : ''}`);
      setSearchValue('');
      return;
    }
    if (trimmed.startsWith('local:')) {
      const rest = trimmed.slice(6).trim();
      navigate(`/localization${rest ? `#${encodeURIComponent(rest)}` : ''}`);
      setSearchValue('');
      return;
    }
    const searchQuery = encodeURIComponent(trimmed);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
    setSearchValue('');
  };

  const handleNotificationItemClick = (path: string) => {
    navigate(path);
    setShowNotifications(false);
  };

  const handleNotificationToggle = async () => {
    const next = !showNotifications;
    if (next) {
      const updated = await authService.markNotificationsViewed();
      if (updated) setLastViewedNotifications(updated);
    }
    setShowNotifications(next);
  };

  const fetchInitialNotifications = async () => {
    try {
      const res = await notificationService.getNotifications(1, 50);
      setNotifications(res.notifications);
      setNotificationPage(res.pagination.page);
      setNotificationPagesTotal(res.pagination.pages);
    } catch {
      setNotifications([]);
    }
  };

  const handleNotificationLoadMore = async () => {
    if (loadingMoreNotifications || !hasMoreNotifications) return;
    setLoadingMoreNotifications(true);
    try {
      const nextPage = notificationPage + 1;
      const res = await notificationService.getNotifications(nextPage, 50);
      setNotifications((prev) => [...prev, ...res.notifications]);
      setNotificationPage(res.pagination.page);
      setNotificationPagesTotal(res.pagination.pages);
    } finally {
      setLoadingMoreNotifications(false);
    }
  };

  useEffect(() => {
    updateRecentLinks(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('button[data-notification-button]')
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  useEffect(() => {
    if (!authService.isAuthenticated()) return;

    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      if (eventSourceRef.current) eventSourceRef.current.close();

      try {
        const eventSource = new EventSource(
          `/api/notifications/stream?token=${encodeURIComponent(token)}`
        );
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
        };

        eventSource.onmessage = (event) => {
          try {
            const notification: NotificationItem = JSON.parse(event.data);
            setNotifications((prev) => {
              if (notification._id && prev.some((n) => n._id === notification._id)) {
                return prev;
              }
              return [notification, ...prev];
            });
          } catch (err) {
            console.error('Error parsing notification:', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource.readyState === EventSource.CLOSED) {
            if (authService.isAuthenticated() && !reconnectTimeout) {
              reconnectTimeout = setTimeout(reconnectWithRefresh, 3000);
            }
          }
        };
      } catch (err) {
        console.error('Error setting up SSE connection:', err);
      }
    };

    const reconnectWithRefresh = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const axios = (await import('axios')).default;
          const { data } = await axios.post<{ accessToken: string }>('/api/auth/refresh', {
            refreshToken,
          });
          localStorage.setItem('accessToken', data.accessToken);
        } catch {
          // Refresh failed, will try connect with current token (may 401 again)
        }
      }
      connectSSE();
    };

    const init = async () => {
      const me = await authService.getMe();
      if (me?.lastViewedNotifications != null) setLastViewedNotifications(me.lastViewedNotifications);
      await fetchInitialNotifications();
      connectSSE();
    };
    init();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden text-slate-700">
      <Sidebar isOpen={isSidebarOpen} navSections={NAV_SECTIONS} onLogout={handleLogout} />

      <main className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          searchInputRef={searchInputRef}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSearchFocus={() => setSearchFocused(true)}
          onSearchBlur={() => {
            window.setTimeout(() => setSearchFocused(false), 180);
          }}
          searchHintsOpen={searchFocused}
          filteredSearchHints={filteredSearchHints}
          onSearchSuggestionPick={handleSearchSuggestionPick}
          onSearchKeyDown={handleSearchKeyDown}
          notifications={notifications}
          showNotifications={showNotifications}
          onNotificationToggle={handleNotificationToggle}
          notificationRef={notificationRef}
          onNotificationItemClick={handleNotificationItemClick}
          onNotificationLoadMore={handleNotificationLoadMore}
          hasMoreNotifications={hasMoreNotifications}
          loadingMoreNotifications={loadingMoreNotifications}
          userEmail={userEmail}
          hasUnreadNotifications={hasUnreadNotifications}
        />

        <div
          id="admin-main-scroll"
          className={`relative z-30 flex-1 min-h-0 bg-gradient-to-br from-background via-primary-50/20 to-blue-50/20 ${
            location.pathname === '/ai-manage' || location.pathname === '/calculate-movement'
              ? 'flex flex-col overflow-hidden p-0'
              : location.pathname.startsWith('/characters') ||
                  location.pathname.startsWith('/equipment') ||
                  location.pathname.startsWith('/adventure-cards')
                ? 'flex min-h-0 flex-col overflow-y-auto p-0'
                : 'overflow-y-auto p-4 md:p-8'
          }`}
        >
          <DbAuthGuard>
            <Outlet />
          </DbAuthGuard>
        </div>

        {location.pathname !== '/ai-manage' && location.pathname !== '/calculate-movement' && (
          <AIChatBubble />
        )}
      </main>
    </div>
  );
}
