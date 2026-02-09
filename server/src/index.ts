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
// TEST ROUTES - Có thể xóa an toàn mà không ảnh hưởng chương trình chính
import { testRoutes } from './test/testRoutes.js';
import path from 'path';
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

// Middleware
const frontendUrl = process.env.GAME_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
// TEST ROUTES - Có thể xóa an toàn mà không ảnh hưởng chương trình chính
app.use('/api/test', testRoutes);

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
