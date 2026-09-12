import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Send, Paperclip, X, Image as ImageIcon, Trash2, MessageSquare, ArrowDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  useGetProjectMessagesQuery,
  useAddProjectMessageMutation,
  useDeleteProjectMessageMutation,
} from '../../../services/projectApi';
import { useGetPortalStaffQuery } from '../../../services/userApi';
import useSocketEntity from '../../../hooks/useSocketEntity';
import { renderText } from '../../projects/components/TaskComment';
import ImageViewer from '../../projects/components/ImageViewer';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function PortalChatPanel({ projectId }) {
  const user = useSelector((state) => state.auth.user);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [viewerImage, setViewerImage] = useState(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const fileInputRef = useRef(null);
  const listRef = useRef(null);
  const isFirstLoadRef = useRef(true);
  const textInputRef = useRef(null);
  const mentionListRef = useRef(null);
  const selectedMentionsRef = useRef({});

  const { data: messagesData, isLoading, refetch } = useGetProjectMessagesQuery({ id: projectId });
  const [addMessage, { isLoading: isSending }] = useAddProjectMessageMutation();
  const [deleteMessage] = useDeleteProjectMessageMutation();
  const { data: staffData } = useGetPortalStaffQuery();

  const messages = messagesData?.data || [];
  const staff = staffData?.data?.staff || [];
  const mentionUsers = staff.filter((u) => u._id !== user?._id);
  const filteredMentions = mentionQuery
    ? mentionUsers.filter((u) => u.name?.toLowerCase().includes(mentionQuery.toLowerCase()))
    : mentionUsers;

  useSocketEntity('project', projectId, { onUpdate: () => refetch() });

  const isNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

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
    scrollToBottom(!isFirstLoadRef.current);
    isFirstLoadRef.current = false;
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollBtn(!isNearBottom());
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isNearBottom]);

  const addFiles = (selected) => {
    selected.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        return;
      }
      setFiles((prev) => [...prev, file]);
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews((p) => [...p, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    addFiles(dropped);
  };

  const handleSend = async () => {
    if (!text.trim() && files.length === 0) return;
    const formData = new FormData();
    if (text.trim()) {
      const raw = text.trim().replace(/@(\w[\w.\-']*)/g, (match, name) => {
        const selected = selectedMentionsRef.current[name];
        if (selected) return `@[${selected.name}](${selected._id})`;
        const u = staff.find((x) => x.name === name || x.email?.split('@')[0] === name);
        return u ? `@[${u.name}](${u._id})` : match;
      });
      formData.append('text', raw);
    }
    files.forEach((f) => formData.append('images', f));
    try {
      await addMessage({ id: projectId, formData }).unwrap();
      setText('');
      setFiles([]);
      setPreviews([]);
      selectedMentionsRef.current = {};
      setTimeout(() => scrollToBottom(), 50);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send message');
    }
  };

  const handleKeyDown = (e) => {
    if (mentionOpen && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, filteredMentions.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredMentions[mentionIndex]) {
          e.preventDefault();
          insertMention(filteredMentions[mentionIndex]);
          return;
        }
      }
      if (e.key === 'Escape') { setMentionOpen(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (afterAt.length > 0 && !/\s/.test(afterAt) && !afterAt.includes(']')) {
        setMentionQuery(afterAt);
        setMentionOpen(true);
        setMentionIndex(0);
        return;
      }
    }
    setMentionOpen(false);
  };

  const insertMention = useCallback((u) => {
    const cursorPos = textInputRef.current?.selectionStart ?? text.length;
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const before = text.slice(0, lastAtIndex);
    const after = text.slice(cursorPos);
    selectedMentionsRef.current[u.name] = u;
    const newText = `${before}@${u.name} ${after}`;
    setText(newText);
    setMentionOpen(false);
    textInputRef.current?.focus();
    setTimeout(() => {
      const el = textInputRef.current;
      if (el) {
        const pos = before.length + u.name.length + 2;
        el.setSelectionRange(pos, pos);
        el.focus();
      }
    }, 0);
  }, [text]);

  useEffect(() => {
    if (mentionOpen && mentionListRef.current) {
      const el = mentionListRef.current.children[mentionIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [mentionIndex, mentionOpen]);

  const handleDelete = async (messageId) => {
    try {
      await deleteMessage({ id: projectId, messageId }).unwrap();
      toast.success('Message deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete message');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-900 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 leading-tight">Project Team Chat</h3>
            <p className="text-[11px] text-zinc-500 leading-tight">{messages.length} message{messages.length === 1 ? '' : 's'}</p>
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={listRef} className="h-full overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-zinc-200 rounded w-28" />
                    <div className="h-3 bg-zinc-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-700">No messages yet.</p>
              <p className="text-xs text-zinc-400 mt-1">Start a conversation with your project team.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const own = msg.createdBy?._id === user?._id;
              return (
                <div key={msg._id} className="flex items-start gap-3 group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold ${
                    own
                      ? 'bg-primary-900 text-white'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}>
                    {msg.createdBy?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xs font-semibold ${own ? 'text-primary-900' : 'text-zinc-900'}`}>
                        {msg.createdBy?.name || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                      {own && (
                        <button
                          onClick={() => handleDelete(msg._id)}
                          className="ml-1 p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                          aria-label="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {msg.text && (
                      <p className="text-sm text-zinc-700 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                        {renderText(msg.text)}
                      </p>
                    )}
                    {msg.images?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setViewerImage(img)}
                            className="group/img relative rounded-xl overflow-hidden border border-zinc-200 hover:border-primary-900 transition-colors"
                          >
                            <img
                              src={img.url}
                              alt={img.name || 'Image'}
                              className="w-24 h-24 object-cover hover:opacity-90 transition-opacity"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 bg-black/30 transition-opacity">
                              <ImageIcon className="w-5 h-5 text-white" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 p-2 bg-white border border-zinc-200 rounded-full shadow-md hover:bg-zinc-50 text-zinc-600 transition-all z-10"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 border-t border-zinc-200 bg-zinc-50/60 relative">
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="w-14 h-14 object-cover rounded-xl border border-zinc-200" />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="relative flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors shrink-0"
            aria-label="Attach image"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
          <textarea
            ref={textInputRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={files.length > 0 ? 'Add a message...' : 'Write message to team... Type @ for mentions'}
            rows={1}
            className="flex-1 px-4 py-2.5 text-sm bg-white border border-zinc-300 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 resize-none min-h-[40px] max-h-24 overflow-hidden scrollbar-hide transition-colors"
            style={{ height: 'auto' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              const maxH = 96;
              const newH = Math.min(e.target.scrollHeight, maxH);
              e.target.style.height = `${newH}px`;
              e.target.style.overflowY = e.target.scrollHeight > maxH ? 'auto' : 'hidden';
            }}
          />
          <button
            onClick={handleSend}
            disabled={(!text.trim() && files.length === 0) || isSending}
            className="w-10 h-10 rounded-xl bg-primary-900 text-white flex items-center justify-center hover:bg-primary-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {mentionOpen && filteredMentions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.1 }}
                className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto p-1.5"
                ref={mentionListRef}
              >
                <div className="px-3 py-1.5 text-[10px] font-mono text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                  Mention team member
                </div>
                {filteredMentions.slice(0, 6).map((u, i) => (
                  <button
                    key={u._id}
                    onClick={() => insertMention(u)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl text-left transition-colors ${
                      i === mentionIndex ? 'bg-primary-50 text-primary-900 font-medium' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-semibold ${
                      i === mentionIndex ? 'bg-primary-900 text-white' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {u.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{u.name}</div>
                      {u.email && <div className="text-[10px] text-zinc-400 truncate">{u.email}</div>}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {viewerImage && <ImageViewer image={viewerImage} onClose={() => setViewerImage(null)} />}
    </div>
  );
}