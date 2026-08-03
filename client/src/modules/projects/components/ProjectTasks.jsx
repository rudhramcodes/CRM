import { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Trash2, CheckSquare, Circle, Flag, ChevronDown, Send, AtSign, Mail, MessageSquare, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../../components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { formatDate } from '../../../utils/formatters';
import { TASK_STATUS, TASK_PRIORITY } from '../../../constants';
import { useAddTaskCommentMutation, useDeleteTaskCommentMutation } from '../../../services/taskApi';
import TaskPriorityBadge from './TaskPriorityBadge';
import TaskStatusBadge from './TaskStatusBadge';
import TaskComment from './TaskComment';
import toast from 'react-hot-toast';

export default function ProjectTasks({ tasks = [], milestones = [], users = [], canManage, onUpdate, onDelete, onAddClick }) {
  const user = useSelector((state) => state.auth.user);
  const [expandedId, setExpandedId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [commentText, setCommentText] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const commentInputRef = useRef(null);
  const mentionListRef = useRef(null);
  const selectedMentionsRef = useRef({});
  const [addComment, { isLoading: isAddingComment }] = useAddTaskCommentMutation();
  const [deleteComment, { isLoading: isDeletingComment }] = useDeleteTaskCommentMutation();

  const handleDeleteComment = async (taskId, commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment({ id: taskId, commentId }).unwrap();
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const mentionUsers = users.filter((u) => u._id !== user?._id);
  const filteredMentions = mentionQuery
    ? mentionUsers.filter((u) => u.name?.toLowerCase().includes(mentionQuery.toLowerCase()))
    : mentionUsers;
  const expandedTask = tasks.find((t) => t._id === expandedId) || null;

  const handleToggle = (task) => {
    onUpdate?.(task._id, { status: task.status === 'done' ? 'todo' : 'done' });
  };

  const handleExpand = (task) => {
    if (expandedId === task._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(task._id);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setCommentText('');
    setMentionOpen(false);
    selectedMentionsRef.current = {};
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !expandedId) return;
    onUpdate?.(expandedId, { title: editTitle.trim(), description: editDesc.trim() || undefined });
  };

  const milestoneTitle = (task) => {
    if (!task.milestone) return null;
    return milestones.find((m) => String(m._id) === String(task.milestone))?.title || null;
  };

  const preprocessMentions = useCallback((text) => {
    return text.replace(/@(\w[\w.\-']*(?:\s+\w[\w.\-']*)?)/g, (match, name) => {
      const selected = selectedMentionsRef.current[name];
      if (selected) return `@[${selected.name}](${selected._id})`;
      const u = mentionUsers.find((x) => x.name === name || x.email?.split('@')[0] === name);
      return u ? `@[${u.name}](${u._id})` : match;
    });
  }, [mentionUsers]);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() || !expandedId) return;
    try {
      await addComment({ id: expandedId, text: preprocessMentions(commentText.trim()) }).unwrap();
      setCommentText('');
      selectedMentionsRef.current = {};
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add comment');
    }
  }, [expandedId, commentText, addComment, preprocessMentions]);

  const handleCommentChange = useCallback((e) => {
    const val = e.target.value;
    setCommentText(val);
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
  }, []);

  const insertMention = useCallback((u) => {
    const cursorPos = commentInputRef.current?.selectionStart ?? commentText.length;
    const textBeforeCursor = commentText.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const before = commentText.slice(0, lastAtIndex);
    const after = commentText.slice(cursorPos);
    selectedMentionsRef.current[u.name] = u;
    const text = `${before}@${u.name} ${after}`;
    setCommentText(text);
    setMentionOpen(false);
    commentInputRef.current?.focus();
    setTimeout(() => {
      const el = commentInputRef.current;
      if (el) {
        const pos = before.length + u.name.length + 2;
        el.setSelectionRange(pos, pos);
        el.focus();
      }
    }, 0);
  }, [commentText]);

  const handleCommentKeyDown = useCallback((e) => {
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
      handleAddComment();
    }
  }, [mentionOpen, filteredMentions, mentionIndex, insertMention, handleAddComment]);

  useEffect(() => {
    if (mentionOpen && mentionListRef.current) {
      const el = mentionListRef.current.children[mentionIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [mentionIndex, mentionOpen]);

  if (!tasks.length && !canManage) return null;

  return (
    <div className="bg-white rounded-xl border border-zinc-200">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary-900">Tasks ({tasks.length})</h3>
        {canManage && (
          <Button type="button" size="sm" onClick={onAddClick}>
            <Plus className="w-3.5 h-3.5" /> Add Task
          </Button>
        )}
      </div>
      <div className="px-6 py-3 space-y-1">
        {tasks.length === 0
          ? <p className="text-sm text-zinc-400 text-center py-4">No tasks for this project</p>
          : [...tasks].sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0)).map((task) => (
              <div key={task._id} className={`rounded-lg border transition-colors ${expandedId === task._id ? 'border-primary-200 bg-zinc-50' : 'border-transparent hover:border-zinc-100'}`}>
                <div onClick={() => handleExpand(task)}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer group">
                  <button onClick={(e) => { e.stopPropagation(); handleToggle(task); }} className="shrink-0">
                    {task.status === 'done'
                      ? <CheckSquare className="w-5 h-5 text-green-500" />
                      : <Circle className="w-5 h-5 text-zinc-300 hover:text-primary-900" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.status === 'done' ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <TaskPriorityBadge priority={task.priority} />
                      <TaskStatusBadge status={task.status} />
                      {milestoneTitle(task) && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Flag className="w-2.5 h-2.5" /> {milestoneTitle(task)}
                        </span>
                      )}
                      {task.assignedTo?.name && <span className="text-xs text-zinc-400">{task.assignedTo.name}</span>}
                      {task.dueDate && <span className="text-xs text-zinc-400">Due {formatDate(task.dueDate)}</span>}
                      {task.comments?.length > 0 && (
                        <span className="text-xs text-zinc-400 flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{task.comments.length}</span>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); handleExpand(task); }}
                        className="p-1 rounded text-zinc-300 hover:text-primary-900 hover:bg-zinc-100" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete?.(task._id); }}
                        className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <ChevronDown className={`w-4 h-4 text-zinc-300 shrink-0 transition-transform ${expandedId === task._id ? 'rotate-180' : ''}`} />
                </div>

                <AnimatePresence>
                  {expandedId === task._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-zinc-100">
                        {/* Title + description edit */}
                        <div className="flex gap-2 mb-3">
                          <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Task title"
                            className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900" />
                          <Button type="button" size="sm" onClick={handleSaveEdit} disabled={!editTitle.trim()}>Save</Button>
                        </div>
                        <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
                          placeholder="Description..."
                          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900 resize-none mb-3" />

                        {/* Quick edit grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div>
                            <label className="text-xs text-zinc-400 uppercase tracking-wide">Status</label>
                            <Select value={task.status || 'todo'} onValueChange={(v) => onUpdate?.(task._id, { status: v })}>
                              <SelectTrigger className="mt-1 h-8 px-2 py-1 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TASK_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-400 uppercase tracking-wide">Priority</label>
                            <Select value={task.priority || 'medium'} onValueChange={(v) => onUpdate?.(task._id, { priority: v })}>
                              <SelectTrigger className="mt-1 h-8 px-2 py-1 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TASK_PRIORITY.map((p) => <SelectItem key={p.value} value={p.value} className="capitalize">{p.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-400 uppercase tracking-wide">Assignee</label>
                            <Select value={task.assignedTo?._id || task.assignedTo || ''} onValueChange={(v) => onUpdate?.(task._id, { assignedTo: v || undefined })}>
                              <SelectTrigger className="mt-1 h-8 px-2 py-1 text-sm"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Unassigned</SelectItem>
                                {users.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-400 uppercase tracking-wide">Milestone</label>
                            <Select value={task.milestone || 'none'} onValueChange={(v) => onUpdate?.(task._id, { milestone: v === 'none' ? null : v })}>
                              <SelectTrigger className="mt-1 h-8 px-2 py-1 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Milestone</SelectItem>
                                {milestones.map((m) => <SelectItem key={m._id} value={m._id}>{m.title}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-400 uppercase tracking-wide">Due Date</label>
                            <input type="date" value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                              onChange={(e) => onUpdate?.(task._id, { dueDate: e.target.value || undefined })}
                              className="mt-1 w-full px-2 py-1 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900" />
                          </div>
                        </div>

                        {/* Comments */}
                        <div className="mt-4 pt-4 border-t border-zinc-100">
                          <h4 className="text-xs font-semibold text-primary-900 mb-3 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" /> Comments ({task.comments?.length || 0})
                          </h4>
                          {canManage && (
                            <div className="flex gap-2 mb-3 relative">
                              <div className="flex-1 relative">
                                <textarea ref={commentInputRef} value={commentText} onChange={handleCommentChange}
                                  onKeyDown={handleCommentKeyDown} rows={2}
                                  placeholder="Write a comment... Type @ to mention someone"
                                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900 resize-none min-h-[38px]" />
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
                              <Button size="sm" onClick={handleAddComment} loading={isAddingComment} disabled={!commentText.trim()}>Send</Button>
                            </div>
                          )}
                          {(!task.comments || task.comments.length === 0) ? (
                            <p className="text-sm text-zinc-400 text-center py-3">No comments yet</p>
                          ) : (
                            <div className="divide-y divide-zinc-100">
                              {[...task.comments].reverse().map((comment) => (
                                <TaskComment key={comment._id} comment={comment} currentUserId={user?._id}
                                  onDelete={(commentId) => handleDeleteComment(task._id, commentId)} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
        }
      </div>
    </div>
  );
}
