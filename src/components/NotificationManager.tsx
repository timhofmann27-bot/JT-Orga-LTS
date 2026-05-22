import React, { useEffect } from 'react';
import { requestNotificationPermission, onMessageListener } from '../lib/firebase';
import toast from 'react-hot-toast';

export default function NotificationManager() {
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const checkRes = await fetch('/api/public/check');
        if (!checkRes.ok) return;
        const { isAdmin } = await checkRes.json();

        // Push permissions only for admins
        if (!isAdmin) return;

        const token = await requestNotificationPermission();
        if (!token) return;

        await fetch('/api/auth/fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
      } catch (e) {
        console.error('Failed to register FCM token', e);
      }
    };

    setupNotifications();

    onMessageListener().then((payload: any) => {
      toast(payload.notification?.title
        ? `${payload.notification.title}: ${payload.notification.body}`
        : payload.notification?.body ?? 'Neue Benachrichtigung', {
        icon: '🔔',
        duration: 6000
      });
    });
  }, []);

  return null;
}
