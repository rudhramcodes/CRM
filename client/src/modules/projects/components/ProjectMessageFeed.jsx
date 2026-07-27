import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { MessageSquare, Send, Paperclip, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useGetProjectMessagesQuery, useAddProjectMessageMutation, useDeleteProjectMessageMutation } from '../../../services/projectApi';
import Button from '../../../components/ui/Button';
import ImageViewer from './ImageViewer';

export default function ProjectMessageFeed({ projectId }) {
  const user = useSelector((state) => state.auth.user);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [viewerImage, setViewerImage] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const listRef = useRef(null);

  const { data: messagesData, isLoading } = useGetProjectMessagesQuery({ id: projectId });
  const [addMessage, { isLoading: isSending }] = useAddProjectMessageMutation();
  const [deleteMessage] = useDeleteProjectMessageMutation();

  const messages = messagesData?.data || [];

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

  const handleSend = async () => {
    if (!text.trim() && files.length === 0) return;
    const formData = new FormData();
    if (text.trim()) formData.append('text', text.trim());
    files.forEach((f) => formData.append('images', f));
    try {
      await addMessage({ id: projectId, formData }).unwrap();
      setText('');
      setFiles([]);
      setPreviews([]);
    } catch (err) {
      // toast handled by default
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
                        {msg.text.replace('/task', '')}
                      </>
                    ) : (
                      msg.text
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
              <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={files.length > 0 ? 'Add a message...' : 'Type a message... (use /task to create a task)'}
                rows={1}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900 resize-none min-h-[36px] max-h-24"
                style={{ height: 'auto' }}
                onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }}
              />
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
