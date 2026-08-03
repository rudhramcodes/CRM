import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { MessageSquare, Send, Paperclip, X, Image as ImageIcon, Trash2, AtSign, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetProjectMessagesQuery, useAddProjectMessageMutation, useDeleteProjectMessageMutation } from '../../../services/projectApi';
import { useGetUsersQuery } from '../../../services/userApi';
import Button from '../../../components/ui/Button';
import ImageViewer from './ImageViewer';
import { renderText } from './TaskComment';

export default function ProjectMessageFeed({ projectId }) {
  const user = useSelector((state) => state.auth.user);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [viewerImage, setViewerImage] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const fileInputRef = useRef(null);
  const listRef = useRef(null);
  const textInputRef = useRef(null);
  const mentionListRef = useRef(null);
  const selectedMentionsRef = useRef({});

  const { data: messagesData, isLoading } = useGetProjectMessagesQuery({ id: projectId });
  const [addMessage, { isLoading: isSending }] = useAddProjectMessageMutation();
  const [deleteMessage] = useDeleteProjectMessageMutation();
  const { data: usersData } = useGetUsersQuery({ limit: 100 }, { skip: !user });

  const messages = messagesData?.data || [];
  const users = usersData?.data?.users || usersData?.data || [];
  const mentionUsers = users.filter((u) => u._id !== user?._id);
  const filteredMentions = mentionQuery
    ? mentionUsers.filter((u) => u.name?.toLowerCase().includes(mentionQuery.toLowerCase()))
    : mentionUsers;

  const canPost = user && ['super_admin', 'admin', 'manager'].includes(user.role);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews((p) => [...p, ev.target.result]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...dropped]);
    dropped.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews((p) => [...p, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const preprocessMentions = useCallback((raw) => {
    return raw.replace(/@(\w[\w.\-']*(?:\s+\w[\w.\-']*)?)/g, (match, name) => {
      const selected = selectedMentionsRef.current[name];
      if (selected) return `@[${selected.name}](${selected._id})`;
      const u = mentionUsers.find((x) => x.name === name || x.email?.split('@')[0] === name);
      return u ? `@[${u.name}](${u._id})` : match;
    });
  }, [mentionUsers]);

  const handleSend = async () => {
    if (!text.trim() && files.length === 0) return;
    const formData = new FormData();
    if (text.trim()) formData.append('text', preprocessMentions(text.trim()));
    files.forEach((f) => formData.append('images', f));
    try {
      await addMessage({ id: projectId, formData }).unwrap();
      setText('');
      setFiles([]);
      setPreviews([]);
      selectedMentionsRef.current = {};
    } catch (err) {
      // toast handled by default
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

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage({ id: projectId, messageId }).unwrap();
    } catch (err) { /* handled */ }
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Messages ({messages.length})
        </h3>
      </div>

      <div ref={listRef} className="max-h-[500px] overflow-y-auto px-6 py-4 space-y-1">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-7 h-7 rounded-full bg-zinc-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-zinc-100 rounded w-24" />
                  <div className="h-3 bg-zinc-50 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div key={msg._id} className="flex items-start gap-3 py-2 group">
              <div className="w-7 h-7 rounded-full bg-primary-900/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-primary-900">
                  {msg.createdBy?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900">{msg.createdBy?.name || 'Unknown'}</span>
                  <span className="text-[10px] text-zinc-400">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                  {msg.taskId && (
                    <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      Task created
                    </span>
                  )}
                </div>
                {msg.text && (
                  <p className="text-sm text-zinc-600 mt-0.5 whitespace-pre-wrap">
                    {msg.text.startsWith('/task ') ? (
                      <>
                        <span className="text-xs font-mono text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded mr-1">/task</span>
                        {renderText(msg.text.replace('/task', ''))}
                      </>
                    ) : (
                      renderText(msg.text)
                    )}
                  </p>
                )}
                {msg.taskTitle && (
                  <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    Task &ldquo;{msg.taskTitle}&rdquo; created
                  </p>
                )}
                {msg.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.images.map((img, i) => (
                      <button key={i} onClick={() => setViewerImage(img)}
                        className="group/img relative">
                        <img src={img.url} alt={img.name || 'Image'}
                          className="w-24 h-24 object-cover rounded-lg border border-zinc-200 hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 bg-black/20 rounded-lg transition-opacity">
                          <ImageIcon className="w-6 h-6 text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {user && msg.createdBy?._id === user._id && (
                <button onClick={() => handleDeleteMessage(msg._id)}
                  className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canPost && (
        <div className="border-t border-zinc-100 px-6 py-3">
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-zinc-200" />
                  <button onClick={() => removeFile(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            className={`relative flex items-end gap-2 ${dragOver ? 'ring-2 ring-primary-500 rounded-lg' : ''}`}>
            {dragOver && (
              <div className="absolute inset-0 bg-primary-900/5 rounded-lg flex items-center justify-center z-10">
                <p className="text-sm text-primary-900 font-medium">Drop images here</p>
              </div>
            )}
            <button onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors shrink-0">
              <Paperclip className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
            <div className="flex-1 relative">
              <textarea ref={textInputRef} value={text} onChange={handleTextChange} onKeyDown={handleKeyDown}
                placeholder={files.length > 0 ? 'Add a message...' : 'Type a message... (use /task to create a task)'}
                rows={1}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900 resize-none min-h-[36px] max-h-24"
                style={{ height: 'auto' }}
                onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }}
              />
              <AnimatePresence>
                {mentionOpen && filteredMentions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full left-0 mb-1.5 w-72 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto py-1"
                    ref={mentionListRef}>
                    <div className="px-3 py-1.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-100">Mentions</div>
                    {filteredMentions.slice(0, 8).map((u, i) => (
                      <button key={u._id} onClick={() => insertMention(u)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${i === mentionIndex ? 'bg-primary-50 text-primary-900' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-medium ${i === mentionIndex ? 'bg-primary-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                          {u.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{u.name}</div>
                          {u.email && <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{u.email}</div>}
                        </div>
                        <AtSign className={`w-3.5 h-3.5 shrink-0 ${i === mentionIndex ? 'text-primary-600' : 'text-zinc-300'}`} />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button size="sm" onClick={handleSend} loading={isSending} disabled={!text.trim() && files.length === 0}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {viewerImage && <ImageViewer image={viewerImage} onClose={() => setViewerImage(null)} currentUserId={user?._id} />}
    </div>
  );
}
