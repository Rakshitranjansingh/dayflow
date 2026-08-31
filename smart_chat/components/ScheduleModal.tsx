
import React, { useState } from 'react';

interface ScheduleModalProps {
  onSchedule: (dateTime: number, note: string) => void;
  onClose: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ onSchedule, onClose }) => {
  const [dateTime, setDateTime] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDate = new Date(dateTime).getTime();
    if (!dateTime || !note) {
      setError('Please fill out all fields.');
      return;
    }
    if (selectedDate < Date.now()) {
      setError('Please select a future date and time.');
      return;
    }
    onSchedule(selectedDate, note);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md border border-purple-500/30"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-purple-300 mb-4">Schedule a Future Call</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="note" className="block mb-2 text-sm font-medium text-gray-300">
              What should we talk about?
            </label>
            <textarea
              id="note"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
              placeholder="e.g., Check my progress on the project"
            />
          </div>
          <div>
            <label htmlFor="datetime" className="block mb-2 text-sm font-medium text-gray-300">
              When should I call you?
            </label>
            <input
              type="datetime-local"
              id="datetime"
              value={dateTime}
              onChange={e => setDateTime(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
