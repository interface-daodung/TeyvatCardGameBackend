import { type ReactNode } from 'react';

/**
 * Bọc toàn bộ nội dung pages khi đã đăng nhập.
 * Logic (trong api interceptor): khi request lỗi (401, 5xx, mất mạng) →
 * thử refresh token; nếu thành công thì retry request, nếu thất bại thì tự động logout và chuyển về /login.
 */
export function DbAuthGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
