import { Response } from 'express';

interface Notification {
  name: string;
  icon: string;
  notif: string;
  path: string;
  'data-creation': string;
}

class NotificationManager {
  private connections: Set<Response> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Khởi tạo heartbeat interval chung cho tất cả connections
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

  sendNotification(notification: Notification) {
    const message = `data: ${JSON.stringify(notification)}\n\n`;
    
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
