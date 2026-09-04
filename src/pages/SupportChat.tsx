import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { getSupportConversations, getSupportMessages, sendSupportReply } from '../api/admin';
import type { SupportConversation } from '../api/types';
import { ChevronLeftIcon, SpinnerIcon } from '../components/icons';

export function SupportChat() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ['admin', 'support', 'conversations'],
    queryFn: getSupportConversations,
    refetchInterval: 15_000,
  });
  const conversations = conversationsQuery.data ?? [];
  const didAutoSelectRef = useRef(false);

  // Only auto-select once: on mobile the back button clears the selection to reveal the list,
  // and re-selecting would immediately bounce the user back into the thread.
  useEffect(() => {
    if (didAutoSelectRef.current || selectedUserId || conversations.length === 0) return;
    didAutoSelectRef.current = true;
    setSelectedUserId(conversations[0].userId);
  }, [conversations, selectedUserId]);

  const selected = conversations.find((c) => c.userId === selectedUserId) ?? null;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-text sm:text-2xl">Support Chat</h1>
        <p className="mt-1 text-sm text-text-faint">
          Conversations started from the "Contact Support" button on international top-ups.
        </p>
      </header>

      <div className="flex h-[calc(100svh-11rem)] overflow-hidden rounded-xl border border-border bg-surface lg:h-[70vh]">
        <div
          className={clsx(
            'w-full shrink-0 overflow-y-auto border-border lg:block lg:w-72 lg:border-r',
            selectedUserId ? 'hidden' : 'block',
          )}
        >
          {conversationsQuery.isLoading ? (
            <p className="p-4 text-sm text-text-faint">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-text-faint">No support conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <ConversationRow
                key={c.userId}
                conversation={c}
                isActive={c.userId === selectedUserId}
                onClick={() => setSelectedUserId(c.userId)}
              />
            ))
          )}
        </div>

        <div
          className={clsx(
            'min-w-0 flex-1 flex-col lg:flex',
            selectedUserId ? 'flex' : 'hidden',
          )}
        >
          {selected ? (
            <Thread
              key={selected.userId}
              userId={selected.userId}
              userLabel={selected.user.name ?? selected.user.phone}
              onBack={() => setSelectedUserId(null)}
              onReplySent={() => queryClient.invalidateQueries({ queryKey: ['admin', 'support'] })}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-text-faint">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  isActive,
  onClick,
}: {
  conversation: SupportConversation;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex min-h-[56px] w-full flex-col justify-center gap-0.5 border-b border-border px-4 py-3 text-left transition-colors',
        isActive ? 'bg-primary/10' : 'hover:bg-surface-raised',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-text">
          {conversation.user.name ?? conversation.user.phone}
        </span>
        {conversation.unreadCount > 0 && (
          <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
          </span>
        )}
      </div>
      <span className="truncate text-xs text-text-faint">
        {conversation.lastMessage?.body ?? '—'}
      </span>
    </button>
  );
}

function Thread({
  userId,
  userLabel,
  onBack,
  onReplySent,
}: {
  userId: string;
  userLabel: string;
  onBack: () => void;
  onReplySent: () => void;
}) {
  const [reply, setReply] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const threadQuery = useQuery({
    queryKey: ['admin', 'support', 'thread', userId],
    queryFn: () => getSupportMessages(userId),
  });
  const messages = threadQuery.data?.items ?? [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendSupportReply(userId, body),
    onSuccess: () => {
      setReply('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'thread', userId] });
      onReplySent();
    },
    onError: () => toast.error('Failed to send reply'),
  });

  function handleSend() {
    const trimmed = reply.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-raised hover:text-text lg:hidden"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <p className="truncate text-sm font-semibold text-text">{userLabel}</p>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {threadQuery.isLoading ? (
          <p className="text-sm text-text-faint">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-text-faint">No messages yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <div key={m.id} className={clsx('flex', m.senderRole === 'admin' ? 'justify-end' : 'justify-start')}>
                <div
                  className={clsx(
                    'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%]',
                    m.senderRole === 'admin'
                      ? 'bg-primary text-white'
                      : 'bg-surface-raised text-text',
                  )}
                >
                  {m.body}
                  <div
                    className={clsx(
                      'mt-1 text-[10px]',
                      m.senderRole === 'admin' ? 'text-white/70' : 'text-text-faint',
                    )}
                  >
                    {new Date(m.createdAt).toLocaleString('en-US')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-end gap-2 border-t border-border px-3 py-3 sm:px-4">
        <textarea
          rows={1}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a reply…"
          className="max-h-28 flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!reply.trim() || sendMutation.isPending}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:h-9"
        >
          {sendMutation.isPending && <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />}
          Send
        </button>
      </div>
    </>
  );
}
