import { PayOS } from '@payos/node';

let _payos: PayOS | null = null;

/**
 * Lazy-initialize PayOS client. Server có thể chạy mà không cần cấu hình PayOS.
 * Khi gọi API PayOS mà chưa cấu hình sẽ trả lỗi rõ ràng.
 */
export function getPayos(): PayOS {
  if (!_payos) {
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
    if (!clientId || !apiKey || !checksumKey) {
      throw new Error(
        'PayOS chưa được cấu hình. Thêm PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY vào file .env'
      );
    }
    _payos = new PayOS({ clientId, apiKey, checksumKey });
  }
  return _payos;
}
