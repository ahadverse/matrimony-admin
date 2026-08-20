import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAdminNotificationsSocket } from '../lib/socket';
import { playAlertSound } from '../lib/notificationSound';
import type { SupportSenderRole } from '../api/types';

interface SupportMessageNewPayload {
  id: string;
  userId: string;
  senderRole: SupportSenderRole;
  body: string;
  createdAt: string;
  user: { id: string; phone: string; name: string | null };
}

/** Mounted once in AppShell so every authenticated admin page gets a live alert. */
export function useSupportChatAlerts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getAdminNotificationsSocket();
    if (!socket) return;

    function handleNewMessage(payload: SupportMessageNewPayload) {
      queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });

      // Don't beep for an admin's own outgoing reply (or a colleague's) —
      // only a message from the user is something an admin needs to react to.
      if (payload.senderRole !== 'user') return;
      playAlertSound();
      toast.success(`New support message from ${payload.user.name ?? payload.user.phone}`, {
        duration: 6000,
      });
    }

    socket.on('support:message-new', handleNewMessage);
    return () => {
      socket.off('support:message-new', handleNewMessage);
    };
  }, [queryClient]);
}
