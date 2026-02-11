# Project Structure

## Overview

This is a monorepo-style project with a backend server and admin frontend for a card-based game.

```
├── server/              # Backend (Node.js + Express + MongoDB)
│   ├── src/
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Auth, authorization, error handling
│   │   ├── models/      # Mongoose schemas
│   │   ├── routes/      # Express routes
│   │   ├── scripts/     # Seed scripts
│   │   ├── types/       # TypeScript types
│   │   ├── utils/       # JWT, audit logging utilities
│   │   ├── validators/  # Zod validation schemas
│   │   └── index.ts     # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── admin-web/           # Frontend (React + Vite + Tailwind)
    ├── src/
    │   ├── components/  # React components
    │   ├── lib/         # Utilities (API client, utils)
    │   ├── pages/       # Page components
    │   ├── services/    # API service functions
    │   ├── App.tsx      # Main app component
    │   ├── main.tsx     # Entry point
    │   └── index.css    # Global styles
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── tailwind.config.js
```

## Backend Architecture

### Models (MongoDB Schemas)

- **User**: Admin/moderator/user accounts, currency (Xu), owned items, banned cards
- **Payment**: Transaction records with status tracking
- **Character**: Game characters with fixed max level (10)
- **Equipment**: Equipment items with slots
- **AdventureCard**: Cards for maps (weapon, enemy, food, trap, treasure, bomb, coin, empty) - from libraryCards.json
- **Map**: Dungeon maps with deck configurations
- **Localization**: Multi-language key-value pairs
- **AuditLog**: Admin action logs

### Controllers

Each controller handles CRUD operations for its resource:
- `authController`: Login, token refresh
- `userController`: User management, ban/unban, currency updates
- `paymentController`: Payment listing, statistics
- `characterController`, `equipmentController`, `adventureCardController`, `mapController`: Game data management
- `localizationController`: Localization management
- `logController`: Audit log viewing
- `dashboardController`: Dashboard statistics

### Middleware

- `authenticate`: JWT token verification
- `authorize`: Role-based access control (admin, moderator)
- `errorHandler`: Global error handling

### Validation

Zod schemas for request validation in `validators/` directory.

## Frontend Architecture

### Services

API service layer using Axios:
- `authService`: Authentication
- `dashboardService`: Dashboard data
- `userService`: User management
- `paymentService`: Payment data
- `gameDataService`: Game data CRUD
- `localizationService`: Localization management
- `logService`: Audit logs

### Pages

- `Login`: Admin login page
- `Dashboard`: Statistics and charts
- `Users`: User list and detail pages
- `Payments`: Payment list
- `Characters`, `Equipment`, `AdventureCards`, `Maps`: Game data management
- `Localization`: Localization management
- `Logs`: Audit log viewer

### Components

- `Layout`: Main layout with navigation

## Key Features

### Authentication & Authorization
- JWT-based authentication (access + refresh tokens)
- Role-based access control (admin, moderator)
- Token refresh mechanism

### User Management
- View users with pagination
- Ban/unban users
- Update user currency (Xu)
- Manage banned cards per user

### Payments
- View all transactions
- Filter by status
- Revenue statistics
- Charts for revenue over time

### Game Data Management
- Characters: Fixed max level (10), status management
- Equipment: Slot-based, status management
- Adventure Cards: Type-based, appearance rate configuration
- Maps: Deck configuration with adventure cards

### Localization
- Multi-language support
- Key-value storage
- Missing key detection

### Audit Logs
- Track all admin actions
- Read-only log viewer
- Filter by action/resource

## Database Constraints

- Character `maxLevel` is fixed at 10 (immutable)
- Equipment slot count is fixed (cannot be changed)
- User roles: admin, moderator, user
- Payment status: pending, success, failed
- Card status: enabled, disabled, hidden, unreleased

## API Design

RESTful API with:
- JSON request/response
- JWT Bearer token authentication
- Pagination for list endpoints
- Error handling with appropriate HTTP status codes

## Security

- Password hashing with bcrypt
- JWT token-based authentication
- Role-based authorization
- Request validation with Zod
- Audit logging for admin actions
