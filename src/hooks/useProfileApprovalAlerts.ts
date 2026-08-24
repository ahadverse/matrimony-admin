import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAdminNotificationsSocket } from '../lib/socket';
import { playAlertSound } from '../lib/notificationSound';

interface ProfileSubmittedPayload {
  id: string;
  userId: string;
  name: string;
  phone: string;
  submittedAt: string;
}

/** Mounted once in AppShell so every authenticated admin page gets a live alert. */
export function useProfileApprovalAlerts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getAdminNotificationsSocket();
    if (!socket) return;

    function handleSubmitted(payload: ProfileSubmittedPayload) {
      playAlertSound();
      toast.success(`New profile pending approval: ${payload.name}`, { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiles', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    }

    socket.on('profile:submitted', handleSubmitted);
    return () => {
      socket.off('profile:submitted', handleSubmitted);
    };
  }, [queryClient]);
}
