import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { cn } from '../lib/utils';

interface Notification {
  name: string;
  icon: string;
  notif: string;
  path: string;
  'data-creation': string;
}

function stringToSafeColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 60;
  const lightness = 40;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
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

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
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
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showNotifications]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }

    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const eventSource = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('SSE connection opened');
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
        };

        eventSource.onmessage = (event) => {
          try {
            const notification: Notification = JSON.parse(event.data);
            setNotifications((prev) => [notification, ...prev]);
          } catch (error) {
            console.error('Error parsing notification:', error);
          }
        };

        eventSource.onerror = () => {
          if (eventSource.readyState === EventSource.CLOSED) {
            console.log('SSE connection closed');
            if (authService.isAuthenticated() && !reconnectTimeout) {
              reconnectTimeout = setTimeout(() => {
                connectSSE();
              }, 3000);
            }
          }
        };
      } catch (error) {
        console.error('Error setting up SSE connection:', error);
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/payments', label: 'Payments', icon: '💳' },
    { path: '/characters', label: 'Characters', icon: '⚔️' },
    { path: '/equipment', label: 'Equipment', icon: '🛡️' },
    { path: '/adventure-cards', label: 'Adventure Cards', icon: '🎴' },
    { path: '/maps', label: 'Maps', icon: '🗺️' },
    { path: '/localization', label: 'Localization', icon: '🌐' },
    { path: '/logs', label: 'Logs', icon: '📝' },
  ];

  return (
    <div className="flex h-screen overflow-hidden text-slate-700">
      {/* Sidebar */}
      <aside 
        className={cn(
          "transition-all duration-300 ease-in-out bg-white border-r border-slate-200 flex flex-col z-50",
          isSidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <div className={cn(
            "flex items-center gap-3 overflow-hidden",
            !isSidebarOpen && 'justify-center'
          )}>


<div className="overflow-hidden rounded-md w-6 h-6">
  <img src="../../favicon.ico" className="w-full h-full object-cover" alt="Logo"/>
</div>


            {isSidebarOpen && (
              <span className="font-bold text-xl tracking-tight text-slate-900 whitespace-nowrap">
                Teyvat Admin
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all",
                  isActive 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                  !isSidebarOpen && 'justify-center'
                )}
              >
                <span className="shrink-0 text-lg">{item.icon}</span>
                {isSidebarOpen && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
                {isSidebarOpen && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-3 w-full rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all",
              !isSidebarOpen && 'justify-center'
            )}
          >
            <span className="text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </span>
            {isSidebarOpen && <span className="font-medium text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isSidebarOpen ? (
                <span className="text-xl">✕</span>
              ) : (
                <span className="text-xl">☰</span>
              )}
            </button>
            <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-1.5 w-64">
              <span className="text-slate-400 mr-2">🔍</span>
              <input 
                type="text" 
                placeholder="Search everything..." 
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="bg-transparent border-none text-sm focus:ring-0 w-full outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            <button 
              data-notification-button
              onClick={handleNotificationClick}
              className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="text-slate-600 text-lg">🔔</span>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && notifications.length > 0 && (
              <div
                ref={notificationRef}
                className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-96 overflow-y-auto animate-slide-in"
              >
                <div className="p-2">
                  {notifications.map((notif, index) => (
                    <div
                      key={`${notif.name}-${index}`}
                      onClick={() => handleNotificationItemClick(notif.path)}
                      className={cn(
                        "p-4 mb-2 rounded-lg cursor-pointer transition-all duration-300 transform",
                        "hover:bg-slate-50 hover:shadow-md hover:scale-[1.02]",
                        "border border-slate-100 hover:border-indigo-200",
                        "animate-slide-in"
                      )}
                      style={{
                        animationDelay: `${index * 50}ms`
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl shrink-0">{notif.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm text-slate-900">{notif.name}</p>
                            <span className="text-xs text-slate-400">
                              {new Date(notif['data-creation']).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{notif.notif}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
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

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-br from-background via-primary-50/20 to-red-50/20">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
