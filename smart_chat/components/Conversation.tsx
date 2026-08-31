
import React, { useEffect, useRef } from 'react';
import type { TranscriptEntry } from '../types';

interface ConversationProps {
  transcript: TranscriptEntry[];
}

export const Conversation: React.FC<ConversationProps> = ({ transcript }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="w-full max-w-4xl flex-1 overflow-y-auto p-4 space-y-4 mb-4">
      {transcript.map((entry, index) => (
        <div
          key={index}
          className={`flex items-end gap-2 ${
            entry.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-xs md:max-w-md lg:max-w-2xl rounded-2xl px-4 py-2 text-white ${
              entry.role === 'user'
                ? 'bg-purple-600 rounded-br-none'
                : 'bg-gray-700 rounded-bl-none'
            }`}
          >
            <p className="whitespace-pre-wrap">{entry.text || '...'}</p>
          </div>
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};
