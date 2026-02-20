# Backend Server

Node.js + Express + MongoDB backend for the Teyvat Card Game admin system.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB URI and JWT secrets.

4. Seed the database:
```bash
npm run seed
```

5. Start the server:
```bash
npm run dev
```

## Production (PM2)

Trên server Linux sau khi `git pull`:

```bash
cd /var/www/TeyvatCardGameBackend/server
npm ci
npm run build
pm2 start ecosystem.config.cjs
# hoặc restart nếu đã add rồi:
# pm2 restart teyvat-backend
```

**Xem lỗi / log để biết lỗi gì:**

```bash
# Realtime (stdout + stderr gộp)
pm2 logs teyvat-backend

# 200 dòng gần nhất
pm2 logs teyvat-backend --lines 200

# Chỉ lỗi
pm2 logs teyvat-backend --err

# Trạng thái process
pm2 show teyvat-backend
pm2 list
```

Log file nằm tại `~/.pm2/logs/teyvat-backend-error.log` và `~/.pm2/logs/teyvat-backend-out.log`.

**Lưu ý:** Phải chạy `npm run build` trước khi start PM2, nếu không sẽ lỗi `Cannot find module '.../dist/index.js'`.

**Đăng nhập Google (tránh 500 "Google OAuth not configured"):** Trong `.env` trên server **bắt buộc** có `GOOGLE_CLIENT_ID` (cùng giá trị với `VITE_GOOGLE_CLIENT_ID` ở TeyvatCard). Sau khi sửa `.env` chạy `pm2 restart teyvat-backend`.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/refresh` - Refresh access token

### Users
- `GET /api/users` - List users (paginated)
- `GET /api/users/:id` - Get user details
- `PATCH /api/users/:id/ban` - Ban/unban user
- `PATCH /api/users/:id/xu` - Update user currency
- `POST /api/users/:id/ban-card` - Ban a card for user
- `POST /api/users/:id/unban-card` - Unban a card for user

### Payments
- `GET /api/payments` - List payments (paginated)
- `GET /api/payments/:id` - Get payment details
- `GET /api/payments/stats` - Get payment statistics

### Game Data
- Characters: `GET, POST, PATCH, DELETE /api/characters`
- Equipment: `GET, POST, PATCH, DELETE /api/equipment`
- Adventure Cards: `GET, POST, PATCH, DELETE /api/adventure-cards`
- Maps: `GET, POST, PATCH, DELETE /api/maps`

### Localization
- `GET /api/localization` - List all localizations
- `GET /api/localization/:key` - Get localization by key
- `POST /api/localization` - Create localization
- `PATCH /api/localization/:key` - Update localization
- `GET /api/localization/missing` - Get missing keys for a language

### Logs
- `GET /api/logs` - List audit logs (paginated)
- `GET /api/logs/:id` - Get log details
- `GET /api/logs/dashboard` - Get dashboard statistics

## Default Admin

- Email: `admin@example.com`
- Password: `admin123`

**⚠️ Change these in production!**
