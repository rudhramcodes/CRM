import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DatePickerSimple } from './components/ui/DatePickerSimple';
import './index.css';

function DatePickerQa() {
  const [date, setDate] = useState('');

  return (
    <main className="min-h-screen bg-zinc-50 p-10">
      <div className="w-72 rounded-xl border border-zinc-200 bg-white p-4">
        <DatePickerSimple
          label="From Date"
          value={date}
          onChange={setDate}
          placeholder="From date"
        />
        <p data-testid="selected-date" className="mt-4 text-sm text-zinc-500">
          {date || 'No date selected'}
        </p>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<DatePickerQa />);
