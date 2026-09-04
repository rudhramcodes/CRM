import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { format } from 'date-fns';
import { Clock, Coffee, Timer, MapPin } from 'lucide-react';
import { formatMinutes } from '../../../utils/formatters';

export default function ClockOutSummary({ open, onClose, onConfirm, activeSession, totalBreakMinutes = 0 }) {
  if (!activeSession) return null;

  const clockInTime = activeSession.clockIn?.time;
  const now = new Date();

  let liveWorkMinutes = 0;
  if (clockInTime) {
    liveWorkMinutes = Math.round((now - new Date(clockInTime)) / 60000) - totalBreakMinutes;
    if (liveWorkMinutes < 0) liveWorkMinutes = 0;
  }
  const location = activeSession.clockIn?.location;

  return (
    <Modal open={open} onClose={onClose} title="Clock Out Summary">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <Clock className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-green-600 font-medium">Clock In</p>
              <p className="text-sm font-semibold text-green-800">
                {clockInTime ? format(new Date(clockInTime), 'hh:mm a') : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
            <Clock className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-xs text-red-600 font-medium">Clock Out</p>
              <p className="text-sm font-semibold text-red-800">
                {format(now, 'hh:mm a')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
            <Timer className="h-5 w-5 text-primary-900" />
            <div>
              <p className="text-xs text-primary-900 font-medium">Total Work</p>
              <p className="text-sm font-semibold text-primary-900">
                {formatMinutes(liveWorkMinutes)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
            <Coffee className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-xs text-amber-600 font-medium">Break Time</p>
              <p className="text-sm font-semibold text-amber-800">
                {formatMinutes(totalBreakMinutes)}
              </p>
            </div>
          </div>
        </div>

        {location?.lat != null && (
          <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
            <MapPin className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500 font-medium">Location</p>
              <p className="text-sm text-zinc-700">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Confirm Clock Out</Button>
        </div>
      </div>
    </Modal>
  );
}
