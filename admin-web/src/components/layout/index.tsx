import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Sidebar, type NavItem } from './Sidebar';
import { AppHeader } from './AppHeader';
import type { NotificationItem } from './NotificationDropdown';

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/users', label: 'Users', icon: '👥' },
  { path: '/payments', label: 'Payments', icon: '💳' },
  { path: '/payment-link', label: 'Tạo link thanh toán', icon: '🔗' },
  { path: '/characters', label: 'Characters', icon: '⚔️' },
  { path: '/equipment', label: 'Equipment', icon: '🛡️' },
  { path: '/adventure-cards', label: 'Adventure Cards', icon: '🎴' },
  { path: '/maps', label: 'Maps', icon: '🗺️' },
  { path: '/localization', label: 'Localization', icon: '🌐' },
  { path: '/themes', label: 'Themes', icon: '🎨' },
  { path: '/manager-assets', label: 'Manager Assets', icon: '📁' },
  { path: '/logs', label: 'Logs', icon: '📝' },
  { path: '/about', label: 'About', icon: 'ℹ️' },
];

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const navigate = useNavigate();
  const userEmail = authService.getUserEmail() || 'Admin';

  const handleLogout = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    authService.logout();
    setNotifications([]);
    navigate('/login');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      const searchQuery = encodeURIComponent(searchValue.trim());
      window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
      setSearchValue('');
    }
  };

  const handleNotificationItemClick = (path: string) => {
    navigate(path);
    setShowNotifications(false);
  };

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

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
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
            setNotifications((prev) => [notification, ...prev]);
          } catch (err) {
            console.error('Error parsing notification:', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource.readyState === EventSource.CLOSED) {
            if (authService.isAuthenticated() && !reconnectTimeout) {
              reconnectTimeout = setTimeout(connectSSE, 3000);
            }
          }
        };
      } catch (err) {
        console.error('Error setting up SSE connection:', err);
      }
    };

    connectSSE();

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
      <Sidebar
        isOpen={isSidebarOpen}
        navItems={NAV_ITEMS}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSearchKeyDown={handleSearchKeyDown}
          notifications={notifications}
          showNotifications={showNotifications}
          onNotificationToggle={() => setShowNotifications((o) => !o)}
          notificationRef={notificationRef}
          onNotificationItemClick={handleNotificationItemClick}
          userEmail={userEmail}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-br from-background via-primary-50/20 to-red-50/20">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
