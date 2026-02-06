# Test API Routes

Thư mục này chứa các API test có thể hoạt động độc lập và dễ dàng xóa mà không ảnh hưởng đến chương trình chính.

## Cách sử dụng

### Test Payment Success
Gửi GET request để tạo payment demo và test logging khi payment thành công:

```bash
GET /api/test/payment-success
```

Response:
```json
{
  "message": "Test payment success created and logged successfully",
  "payment": {
    "_id": "...",
    "userId": "...",
    "amount": 100000,
    "xuReceived": 1000,
    "status": "success",
    "transactionId": "TEST-...",
    ...
  },
  "logCreated": true
}
```

## Cách xóa

Để xóa hoàn toàn test API mà không ảnh hưởng chương trình:

1. Xóa thư mục `server/src/test/`
2. Trong `server/src/index.ts`, xóa 2 dòng:
   - `import { testRoutes } from './test/testRoutes.js';`
   - `app.use('/api/test', testRoutes);`

Sau đó chương trình sẽ hoạt động bình thường như trước.
