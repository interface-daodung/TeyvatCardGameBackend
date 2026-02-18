import { Link } from 'react-router-dom';
import { CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

export interface UserRowUser {
  _id: string;
  email: string;
  role: string;
  xu: number;
  isBanned: boolean;
}

function stringToSafeColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 40%)`;
}

export function UserRow({ user }: { user: UserRowUser }) {
  return (
    <Link
      to={`/users/${user._id}`}
      className="block hover:bg-slate-100 transition-colors"
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
              style={{ backgroundColor: stringToSafeColor(user.email) }}
            >
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">{user.email}</div>
              <div className="text-sm text-muted-foreground mt-1">
                <span className="inline-flex items-center">
                  <span className="mr-2">👤</span>
                  {user.role}
                </span>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center">
                  <span className="mr-1">💰</span>
                  {user.xu.toLocaleString()} Xu
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {user.isBanned ? (
              <Badge variant="destructive">Banned</Badge>
            ) : (
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                Active
              </Badge>
            )}
            <svg
              className="h-5 w-5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
