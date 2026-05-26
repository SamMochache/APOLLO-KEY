/**
 * useNotification Hook
 * Provides notification/toast functionality
 */

import { useNotificationStore } from '@store';
import { Notification } from '@types';

export const useNotification = () => {
  const { notifications, addNotification, removeNotification, clearNotifications } = useNotificationStore();

  const notify = (
    type: Notification['type'],
    title: string,
    message: string,
    duration: number = 3000
  ) => {
    addNotification({
      type,
      title,
      message,
      duration,
    });
  };

  const success = (title: string, message: string = '', duration?: number) => {
    notify('success', title, message, duration);
  };

  const error = (title: string, message: string = '', duration?: number) => {
    notify('error', title, message, duration || 5000);
  };

  const warning = (title: string, message: string = '', duration?: number) => {
    notify('warning', title, message, duration);
  };

  const info = (title: string, message: string = '', duration?: number) => {
    notify('info', title, message, duration);
  };

  return {
    notifications,
    notify,
    success,
    error,
    warning,
    info,
    removeNotification,
    clearNotifications,
  };
};
