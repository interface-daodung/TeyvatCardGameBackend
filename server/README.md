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
