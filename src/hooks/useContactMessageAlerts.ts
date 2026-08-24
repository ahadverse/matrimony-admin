import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAdminNotificationsSocket } from '../lib/socket';
import { playAlertSound } from '../lib/notificationSound';

interface ContactMessageCreatedPayload {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  subject: string;
  createdAt: string;
}

/** Mounted once in AppShell so every authenticated admin page gets a live alert. */
export function useContactMessageAlerts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getAdminNotificationsSocket();
    if (!socket) return;

    function handleCreated(payload: ContactMessageCreatedPayload) {
      playAlertSound();
      toast.success(`New contact message from ${payload.name}: ${payload.subject}`, {
        duration: 6000,
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
    }

    socket.on('contact-message:created', handleCreated);
    return () => {
      socket.off('contact-message:created', handleCreated);
    };
  }, [queryClient]);
}
