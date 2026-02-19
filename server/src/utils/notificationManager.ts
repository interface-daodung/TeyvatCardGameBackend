import { Response } from 'express';
import { Notification } from '../models/Notification.js';

export interface NotificationInput {
  name: string;
  icon: string;
  notif: string;
  path: string;
  'data-creation'?: string;
}

class NotificationManager {
  private connections: Set<Response> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      return;
    }
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  addConnection(res: Response) {
    this.connections.add(res);
    res.on('close', () => {
      this.connections.delete(res);
    });
  }

  sendNotification(notification: NotificationInput) {
    Notification.create({
      name: notification.name,
      icon: notification.icon,
      notif: notification.notif,
      path: notification.path,
    })
      .then((doc) => {
        const payload = {
          _id: doc._id.toString(),
          name: doc.name,
          icon: doc.icon,
          notif: doc.notif,
          path: doc.path,
          'data-creation': doc.createdAt.toISOString(),
        };
        this.broadcast(payload);
      })
      .catch((err) => {
        console.error('Failed to save notification to DB:', err);
        this.broadcast({
          _id: undefined,
          ...notification,
          'data-creation': notification['data-creation'] ?? new Date().toISOString(),
        });
      });
  }

  private broadcast(payload: Record<string, unknown>) {
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    const closedConnections: Response[] = [];
    this.connections.forEach((res) => {
      try {
        res.write(message);
      } catch {
        closedConnections.push(res);
      }
    });
    closedConnections.forEach((res) => this.connections.delete(res));
  }

  sendHeartbeat() {
    const message = ': heartbeat\n\n';
    const closedConnections: Response[] = [];
    
    this.connections.forEach((res) => {
      try {
        res.write(message);
      } catch (error) {
        closedConnections.push(res);
      }
    });

    closedConnections.forEach((res) => {
      this.connections.delete(res);
    });
  }

  getConnectionCount() {
    return this.connections.size;
  }
}

export const notificationManager = new NotificationManager();
