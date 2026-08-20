import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAdminNotificationsSocket } from '../lib/socket';
import { playAlertSound } from '../lib/notificationSound';

interface ManualTopupSubmittedPayload {
  id: string;
  amount: number;
  trxId: string | null;
  payerAccountNumber: string | null;
  submittedAt: string;
  user: { id: string; phone: string; name: string | null };
}

/** Mounted once in AppShell so every authenticated admin page gets a live alert. */
export function useAdminTopupAlerts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getAdminNotificationsSocket();
    if (!socket) return;

    function handleSubmitted(payload: ManualTopupSubmittedPayload) {
      playAlertSound();
      toast.success(
        `New bKash top-up: ৳${payload.amount} from ${payload.user.name ?? payload.user.phone}`,
        { duration: 6000 },
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions', 'pending-bkash'] });
    }

    socket.on('topup:manual-submitted', handleSubmitted);
    return () => {
      socket.off('topup:manual-submitted', handleSubmitted);
    };
  }, [queryClient]);
}
