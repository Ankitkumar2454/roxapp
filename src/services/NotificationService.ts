import { Alert } from 'react-native';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'call' | 'friend_request' | 'group_invite';
  senderId?: string;
  senderName?: string;
  conversationId?: string;
  groupId?: string;
  timestamp: string;
  read: boolean;
}

class NotificationService {
  private notifications: NotificationData[] = [];
  private listeners: Set<(notifications: NotificationData[]) => void> = new Set();

  addNotification(notification: Omit<NotificationData, 'id' | 'read'>): void {
    const newNotification: NotificationData = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false,
    };

    this.notifications.unshift(newNotification);
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    this.notifyListeners();
    
    // Show in-app alert for important notifications
    if (notification.type === 'message' || notification.type === 'call') {
      this.showInAppAlert(newNotification);
    }
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.notifyListeners();
  }

  getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  clearNotifications(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  removeNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notifyListeners();
  }

  subscribe(listener: (notifications: NotificationData[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener([...this.notifications]);
    });
  }

  private showInAppAlert(notification: NotificationData): void {
    const title = notification.type === 'message' 
      ? `New message from ${notification.senderName || 'Unknown'}`
      : notification.type === 'call'
      ? `Incoming call from ${notification.senderName || 'Unknown'}`
      : notification.title;

    Alert.alert(
      title,
      notification.message,
      [
        {
          text: 'Dismiss',
          style: 'cancel',
          onPress: () => this.markAsRead(notification.id),
        },
        {
          text: 'View',
          onPress: () => {
            this.markAsRead(notification.id);
            // Navigate to the relevant screen
            // This would be handled by the component using the service
          },
        },
      ],
      { cancelable: true }
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;

