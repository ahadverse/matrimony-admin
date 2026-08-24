import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAdminNotificationsSocket } from '../lib/socket';
import { playAlertSound } from '../lib/notificationSound';

interface AssistantRequestCreatedPayload {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
}

/** Mounted once in AppShell so every authenticated admin page gets a live alert. */
export function useAssistantRequestAlerts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getAdminNotificationsSocket();
    if (!socket) return;

    function handleCreated(payload: AssistantRequestCreatedPayload) {
      playAlertSound();
      toast.success(`New assistant request from ${payload.name}`, { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ['admin', 'assistant-requests'] });
    }

    socket.on('assistant-request:created', handleCreated);
    return () => {
      socket.off('assistant-request:created', handleCreated);
    };
  }, [queryClient]);
}
