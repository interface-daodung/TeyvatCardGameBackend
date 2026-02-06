# Teyvat Card Game - Backend & Admin System

A complete sample project for a card-based single-player offline game with user accounts and in-app payments.

## Project Structure

```
├── server/          # Backend (Node.js + Express + MongoDB)
└── admin-web/       # Frontend Admin (React + Vite + Tailwind)
```

## Tech Stack

### Backend
- Node.js + TypeScript (ESM)
- Express
- MongoDB + Mongoose
- JWT (access + refresh tokens)
- bcrypt, Zod, pino

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
- Axios + Recharts

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets
npm run dev
```

### Frontend Setup

```bash
cd admin-web
npm install
npm run dev
```

### Seed Data

```bash
cd server
npm run seed
```

## Features

- **Authentication**: Admin login with JWT
- **User Management**: View, ban/unban users, manage banned cards
- **Payments**: Track transactions and revenue
- **Game Data**: Manage characters, equipment, adventure cards, maps
- **Localization**: Multi-language support
- **Audit Logs**: Track all admin actions

## Default Admin Credentials

- Email: `admin@example.com`
- Password: `admin123`

**⚠️ Change these in production!**
