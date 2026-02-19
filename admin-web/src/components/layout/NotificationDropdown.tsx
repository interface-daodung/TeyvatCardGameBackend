import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface NotificationItem {
  _id?: string;
  name: string;
  icon: string;
  notif: string;
  path: string;
  'data-creation': string;
}

interface NotificationDropdownProps {
  notifications: NotificationItem[];
  onItemClick: (path: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  className?: string;
}

export const NotificationDropdown = forwardRef<HTMLDivElement, NotificationDropdownProps>(
  (
    {
      notifications,
      onItemClick,
      onLoadMore,
      hasMore = false,
      loadingMore = false,
      className,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col max-h-96 animate-slide-in',
          className
        )}
      >
        <div className="p-2 overflow-y-auto flex-1 min-h-0">
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Chưa có thông báo</p>
          ) : (
            notifications.map((notif, index) => (
              <div
                key={notif._id ?? `notif-${index}`}
                onClick={() => onItemClick(notif.path)}
                className={cn(
                  'p-4 mb-2 rounded-lg cursor-pointer transition-all duration-300 transform',
                  'hover:bg-slate-50 hover:shadow-md hover:scale-[1.02]',
                  'border border-slate-100 hover:border-indigo-200',
                  'animate-slide-in'
                )}
                style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl shrink-0">{notif.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm text-slate-900">{notif.name}</p>
                      <span className="text-xs text-slate-400 shrink-0 ml-1">
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
            ))
          )}
        </div>
        {hasMore && (
          <div className="p-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className={cn(
                'w-full py-2 text-sm font-medium rounded-lg transition-colors',
                'text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loadingMore ? 'Đang tải...' : 'Xem thêm'}
            </button>
          </div>
        )}
      </div>
    );
  }
);

NotificationDropdown.displayName = 'NotificationDropdown';
