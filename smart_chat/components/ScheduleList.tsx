
import React from 'react';
import type { ScheduledItem } from '../types';

interface ScheduleListProps {
  items: ScheduledItem[];
  onCancel: (id: string) => void;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({ items, onCancel }) => {
  if (items.length === 0) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="w-full p-4 bg-black/20 rounded-lg">
      <h3 className="text-lg font-semibold text-purple-300 mb-3">Upcoming Chats</h3>
      <ul className="space-y-2 max-h-40 overflow-y-auto">
        {items.map(item => (
          <li
            key={item.id}
            className="flex justify-between items-center bg-gray-700/50 p-3 rounded-md"
          >
            <div>
              <p className="font-medium text-white">{item.note}</p>
              <p className="text-sm text-purple-400/80">{formatDate(item.dateTime)}</p>
            </div>
            <button
              onClick={() => onCancel(item.id)}
              className="px-3 py-1 text-sm bg-red-600/80 text-white rounded-md hover:bg-red-500 transition-colors"
              aria-label={`Cancel reminder for ${item.note}`}
            >
              Cancel
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
