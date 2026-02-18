import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { paymentRoutes } from './routes/payments.js';
import { characterRoutes } from './routes/characters.js';
import { equipmentRoutes } from './routes/equipment.js';
import { adventureCardRoutes } from './routes/adventureCards.js';
import { mapRoutes } from './routes/maps.js';
import { localizationRoutes } from './routes/localization.js';
import { itemRoutes } from './routes/items.js';
import { logRoutes } from './routes/logs.js';
import { notificationRoutes } from './routes/notifications.js';
import { payosRoutes } from './routes/payos.js';
import { filesRoutes } from './routes/files.js';
import { serverConfigurationVersionRoutes } from './routes/serverConfigurationVersions.js';
import { themeRoutes } from './routes/themes.js';
// TEST ROUTES - Có thể xóa an toàn mà không ảnh hưởng chương trình chính
import { testRoutes } from './test/testRoutes.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.example') });

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware – CORS: khi SERVE_ADMIN_UI=true thì admin cùng gốc, không cần ADMIN_URL
const frontendUrl = process.env.GAME_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
const adminUrl = process.env.ADMIN_URL;
const corsOrigins = [frontendUrl];
if (adminUrl) corsOrigins.push(adminUrl);
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve uploaded images (REST + Multer)
const uploadsPath = path.join(rootDir, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/adventure-cards', adventureCardRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/localization', localizationRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payos', payosRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/server-configuration-versions', serverConfigurationVersionRoutes);
app.use('/api/themes', themeRoutes);
// TEST ROUTES - Có thể xóa an toàn mà không ảnh hưởng chương trình chính
app.use('/api/test', testRoutes);

/**
 * Serve React build (admin-web) khi SERVE_ADMIN_UI=true trong .env.
 * Dev: SERVE_ADMIN_UI=false, chạy admin-web riêng (CORS dùng ADMIN_URL).
 * Build: SERVE_ADMIN_UI=true, cùng cổng → không cần CORS.
 */
const serveAdminUi = process.env.SERVE_ADMIN_UI === 'true' || process.env.SERVE_ADMIN_UI === '1';
if (serveAdminUi) {
  // __dirname = server/dist (khi chạy node dist/index.js) hoặc server/src (khi chạy tsx src/index.ts)
  const clientPath = path.resolve(__dirname, '..', '..', 'admin-web', 'dist');
  const exists = fs.existsSync(clientPath);
  const indexExists = exists && fs.existsSync(path.join(clientPath, 'index.html'));
  if (!indexExists) {
    logger.warn(
      `SERVE_ADMIN_UI=true nhưng không tìm thấy admin build. Path: ${clientPath} (exists: ${exists}). Chạy "npm run build" trong thư mục admin-web trước.`
    );
  } else {
    app.use(express.static(clientPath));
    /** React Router fallback (SPA) */
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientPath, 'index.html'));
    });
    logger.info(`Serving admin UI from ${clientPath}`);
  }
}

// Error handler
app.use(errorHandler);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teyvat-card-game')
  .then(() => {
    logger.info('Connected to MongoDB');
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });
