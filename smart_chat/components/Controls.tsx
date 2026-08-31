
import React from 'react';
import type { AppStatus, Soundscape } from '../types';

interface ControlsProps {
  status: AppStatus;
  onStop: () => void;
  soundscapes: Soundscape[];
  currentSoundscape: Soundscape;
  onSoundscapeChange: (soundscape: Soundscape) => void;
}

const PhoneHangupIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.7,13.42a1,1,0,0,0-1.41,0l-1.13,1.13a1.49,1.49,0,0,1-2.12,0,14.16,14.16,0,0,1-6-6,1.49,1.49,0,0,1,0-2.12L8.17,5.29a1,1,0,0,0,0-1.41L7.05,2.76a1,1,0,0,0-1.41,0L3.76,4.64a3,3,0,0,0,0,4.24,20,20,0,0,0,11.32,11.32,3,3,0,0,0,4.24,0l1.88-1.88a1,1,0,0,0,0-1.41Z" transform="rotate(-135 12 12)"/>
    </svg>
);

export const Controls: React.FC<ControlsProps> = ({
  status,
  onStop,
  soundscapes,
  currentSoundscape,
  onSoundscapeChange
}) => {
  const isConversing = status === 'listening' || status === 'speaking' || status === 'connecting';

  return (
    <div className="w-full max-w-4xl p-4 bg-black/20 rounded-t-2xl">
      <div className="flex items-center justify-center gap-4">
        <div className="flex-1 flex items-center justify-start gap-2">
            {/* Future left controls can go here */}
        </div>

        {/* Main Action Button */}
        <div className="flex-shrink-0 flex justify-center">
            <button
                onClick={onStop}
                disabled={!isConversing}
                className="relative flex items-center justify-center w-20 h-20 rounded-full text-white transition-all duration-300 ease-in-out transform hover:scale-110 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/50 hover:shadow-xl hover:shadow-red-500/60"
                aria-label="End call"
            >
               <PhoneHangupIcon className="w-8 h-8"/>
            </button>
        </div>
        
        {/* Right Controls */}
        <div className="flex-1 flex items-center justify-end gap-2">
            <select
                value={currentSoundscape.id}
                onChange={(e) => {
                    const scapeId = e.target.value;
                    const scape = soundscapes.find(s => s.id === scapeId);
                    if (scape) onSoundscapeChange(scape);
                }}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5 pr-8"
                aria-label="Select a soundscape"
            >
                {soundscapes.map(scape => (
                    <option key={scape.id} value={scape.id}>{scape.name}</option>
                ))}
            </select>
        </div>
      </div>
    </div>
  );
};
