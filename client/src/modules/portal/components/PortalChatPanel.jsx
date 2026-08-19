import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Send, Trash2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
  useGetProjectMessagesQuery,
  useAddProjectMessageMutation,
  useDeleteProjectMessageMutation,
} from '../../../services/projectApi';

export default function PortalChatPanel({ projectId }) {
  const user = useSelector((state) => state.auth.user);
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  const { data: messagesData, isLoading } = useGetProjectMessagesQuery({ id: projectId });
  const [addMessage, { isLoading: isSending }] = useAddProjectMessageMutation();
  const [deleteMessage] = useDeleteProjectMessageMutation();

  const messages = messagesData || [];

  const scrollToBottom = useCallback((smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      scrollToBottom(false);
    } else {
      scrollToBottom();
    }
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    try {
      const formData = new FormData();
      formData.append('text', trimmed);
      await addMessage({ id: projectId, formData }).unwrap();
      setText('');
      scrollToBottom();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send message');
    }
  };

  const handleDelete = async (messageId) => {
    try {
      await deleteMessage({ id: projectId, messageId }).unwrap();
      toast.success('Message deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete message');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100">
        <MessageSquare className="w-4 h-4 text-primary-900" />
        <h3 className="text-sm font-semibold text-primary-900">Project Chat</h3>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {isLoading && <p className="text-sm text-zinc-400">Loading messages...</p>}
        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-zinc-400">No messages yet. Say hello to your team!</p>
        )}
        {messages.map((message) => {
          const own = message.createdBy?._id === user?._id;
          return (
            <div key={message._id} className={`flex items-start gap-2.5 ${own ? 'justify-end' : ''}`}>
              {!own && (
                <div className="w-7 h-7 rounded-full bg-primary-900/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-primary-900">
                    {message.createdBy?.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <div className={`max-w-[80%] ${own ? 'text-right' : ''}`}>
                <div className="flex items-center gap-2 mb-0.5 justify-end">
                  <span className="text-xs font-medium text-zinc-700">{message.createdBy?.name || 'Unknown'}</span>
                  <span className="text-[10px] text-zinc-400">
                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                  </span>
                  {own && (
                    <button
                      onClick={() => handleDelete(message._id)}
                      className="p-0.5 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="Delete message"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div
                  className={`inline-block rounded-2xl px-3.5 py-2 text-sm text-left ${
                    own ? 'bg-primary-900 text-white' : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  {message.images?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {message.images.map((img, i) => (
                        <a
                          key={i}
                          href={img.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline underline-offset-2 opacity-90 hover:opacity-100"
                        >
                          {img.name || 'attachment'}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-zinc-100">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3.5 py-2 text-sm border border-zinc-200 rounded-full focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="w-9 h-9 rounded-full bg-primary-900 text-white flex items-center justify-center hover:bg-primary-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}