import Modal from '../../../components/ui/Modal';
import { Command, Keyboard } from 'lucide-react';

export default function TaskShortcutsModal({ open, onClose }) {
  const shortcuts = [
    { key: 'C / N', description: 'Create new task' },
    { key: '1', description: 'Switch to Kanban board view' },
    { key: '2', description: 'Switch to List / Table view' },
    { key: '3', description: 'Switch to My Day focus planner' },
    { key: '4', description: 'Switch to Calendar deadlines view' },
    { key: 'I', description: 'Open Task Insights & Analytics' },
    { key: '?', description: 'Open keyboard shortcuts help' },
    { key: 'Esc', description: 'Close slide-over drawer or modal' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts Cheat Sheet" size="md">
      <div className="space-y-4">
        <p className="text-xs text-zinc-500">
          Navigate and operate tasks at lightning speed using these keyboard shortcuts:
        </p>

        <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-2 text-xs">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 px-2">
              <span className="text-zinc-700 font-medium">{s.description}</span>
              <kbd className="px-2 py-1 rounded-md bg-white border border-zinc-300 font-mono text-[11px] font-bold text-zinc-800 shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
