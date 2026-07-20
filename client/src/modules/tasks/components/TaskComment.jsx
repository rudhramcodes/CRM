import { Trash2 } from 'lucide-react';
import { getTimeAgo } from '../../../utils/formatters';

export default function TaskComment({ comment, currentUserId, onDelete }) {
  const isAuthor = currentUserId && comment.createdBy?._id === currentUserId;

  return (
    <div className="flex gap-3 py-3 group">
      <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs font-medium text-zinc-600">
          {comment.createdBy?.name?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700">{comment.createdBy?.name || 'Unknown'}</span>
          <span className="text-xs text-zinc-400">{getTimeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-zinc-600 mt-0.5">{comment.text}</p>
      </div>
      {isAuthor && onDelete && (
        <button onClick={() => onDelete(comment._id)}
          className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0 self-start">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
