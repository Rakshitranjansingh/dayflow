
import React from 'react';
import type { ScheduledItem } from '../types';

interface NotificationModalProps {
  item: ScheduledItem;
  onStart: () => void;
  onDismiss: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ item, onStart, onDismiss }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md border border-purple-500/30">
        <h2 className="text-xl font-bold text-purple-300 mb-2">Time for our chat!</h2>
        <p className="text-gray-300 mb-4">We scheduled a call to talk about:</p>
        <blockquote className="border-l-4 border-purple-400 pl-4 py-2 bg-gray-700/50 rounded-r-lg mb-6">
          <p className="text-white italic">{item.note}</p>
        </blockquote>
        <div className="flex justify-end gap-4">
          <button
            onClick={onDismiss}
            className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={onStart}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors"
          >
            Start Call
          </button>
        </div>
      </div>
    </div>
  );
};
