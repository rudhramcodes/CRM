import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';

function renderText(text) {
  // Split on @[Name](id) markdown mentions AND plain @Name mentions
  const parts = text.split(/(@\[[^\]]+\]\([a-f0-9]+\))/g);
  return parts.map((part, i) => {
    const mdMatch = part.match(/^@\[([^\]]+)\]\(([a-f0-9]+)\)$/);
    if (mdMatch) {
      return <span key={i} className="text-primary-900 font-medium bg-primary-900/5 rounded px-0.5">{mdMatch[1]}</span>;
    }
    // Also highlight plain @name mentions (backward compat)
    const subParts = part.split(/(@\w[\w\s.-]*)/g);
    return subParts.map((sub, j) => {
      if (sub.startsWith('@') && sub.length > 1) {
        return <span key={`${i}-${j}`} className="text-primary-900 font-medium bg-primary-900/5 rounded px-0.5">{sub}</span>;
      }
      return <span key={`${i}-${j}`}>{sub}</span>;
    });
  });
}

export default function TaskComment({ comment, currentUserId, onDelete }) {
  return (
    <div className="flex items-start gap-3 py-3 group">
      <div className="w-7 h-7 rounded-full bg-primary-900/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-medium text-primary-900">
          {comment.createdBy?.name?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900">{comment.createdBy?.name || 'Unknown'}</span>
          <span className="text-[10px] text-zinc-400">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-zinc-600 mt-0.5">{renderText(comment.text)}</p>
      </div>
      {onDelete && currentUserId && comment.createdBy?._id === currentUserId && (
        <button onClick={() => onDelete(comment._id)}
          className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
