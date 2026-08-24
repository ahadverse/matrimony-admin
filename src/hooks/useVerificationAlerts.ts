import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAdminNotificationsSocket } from '../lib/socket';
import { playAlertSound } from '../lib/notificationSound';

interface VerificationSubmittedPayload {
  id: string;
  userId: string;
  nidNumber: string;
  phone: string;
  submittedAt: string;
}

/** Mounted once in AppShell so every authenticated admin page gets a live alert. */
export function useVerificationAlerts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getAdminNotificationsSocket();
    if (!socket) return;

    function handleSubmitted(payload: VerificationSubmittedPayload) {
      playAlertSound();
      toast.success(`New verification submission from ${payload.phone}`, { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
    }

    socket.on('verification:submitted', handleSubmitted);
    return () => {
      socket.off('verification:submitted', handleSubmitted);
    };
  }, [queryClient]);
}
