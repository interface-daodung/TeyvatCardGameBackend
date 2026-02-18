import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface NotificationItem {
  name: string;
  icon: string;
  notif: string;
  path: string;
  'data-creation': string;
}

interface NotificationDropdownProps {
  notifications: NotificationItem[];
  onItemClick: (path: string) => void;
  className?: string;
}

export const NotificationDropdown = forwardRef<HTMLDivElement, NotificationDropdownProps>(
  ({ notifications, onItemClick, className }, ref) => {
    if (notifications.length === 0) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-96 overflow-y-auto animate-slide-in',
          className
        )}
      >
        <div className="p-2">
          {notifications.map((notif, index) => (
            <div
              key={`${notif.name}-${index}`}
              onClick={() => onItemClick(notif.path)}
              className={cn(
                'p-4 mb-2 rounded-lg cursor-pointer transition-all duration-300 transform',
                'hover:bg-slate-50 hover:shadow-md hover:scale-[1.02]',
                'border border-slate-100 hover:border-indigo-200',
                'animate-slide-in'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0">{notif.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm text-slate-900">{notif.name}</p>
                    <span className="text-xs text-slate-400">
                      {new Date(notif['data-creation']).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
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
    );
  }
);

NotificationDropdown.displayName = 'NotificationDropdown';
