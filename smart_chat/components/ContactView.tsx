
import React, { useRef } from 'react';
import type { Persona, ScheduledItem, CallHistoryEntry, AppStatus } from '../types';
import { ScheduleList } from './ScheduleList';

interface ContactViewProps {
  persona: Persona;
  onStartCall: () => void;
  onStartChat: () => void;
  onScheduleClick: () => void;
  scheduledItems: ScheduledItem[];
  onCancelSchedule: (id: string) => void;
  onImageChange: (file: File) => void;
  callHistory: CallHistoryEntry[];
  latestCallSummary: string | null;
  onDismissSummary: () => void;
  voiceStatus: AppStatus;
  onDismissError: () => void;
}

const PhoneIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M6.62 10.79a15.25 15.25 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.02.74-.25 1.02l-2.2 2.2z"/>
  </svg>
);

const VideoIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
  </svg>
);

const ChatIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
);

const CalendarIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-1 2v2H8V5h8ZM8 9h8v2H8V9Z" />
    </svg>
);

const LocationIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
);

const EditIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
);

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
);


const formatCallTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    // check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    return date.toLocaleDateString();
};

const formatCallDuration = (totalSeconds: number) => {
    if (totalSeconds < 60) return `${totalSeconds} sec`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} min ${seconds > 0 ? `${seconds} sec` : ''}`;
}


export const ContactView: React.FC<ContactViewProps> = ({ persona, onStartCall, onStartChat, onScheduleClick, scheduledItems, onCancelSchedule, onImageChange, callHistory, latestCallSummary, onDismissSummary, voiceStatus, onDismissError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-start animate-fade-in p-4 overflow-y-auto">
      {voiceStatus === 'error' && (
        <div className="w-full max-w-sm bg-red-900/50 rounded-2xl shadow-lg p-4 mb-4 border border-red-500/50 relative animate-fade-in">
          <h3 className="text-lg font-semibold text-red-300 mb-2">Connection Failed</h3>
          <p className="text-gray-200 text-sm">Could not connect to the voice service. Please ensure your API key is configured correctly in your deployment environment and try again.</p>
          <button onClick={onDismissError} className="absolute top-3 right-3 text-gray-400 hover:text-white" aria-label="Dismiss error">
              <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      
      <div className="w-full max-w-sm flex-shrink-0 text-center">
        <div className="relative inline-block group">
            <img 
                src={persona.imageUrl}
                alt={persona.name}
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-purple-500/50"
            />
            <button 
                onClick={handleImageClick}
                className="absolute bottom-4 right-0 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Change profile picture"
            >
                <EditIcon className="w-4 h-4" />
            </button>
            <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />
        </div>
        <h1 className="text-3xl font-bold text-white">{persona.name}</h1>
        <p className="text-purple-300/80 mb-6">{persona.subtitle}</p>
        
        <div className="flex justify-center gap-4 mb-6">
            <button onClick={onStartCall} className="flex flex-col items-center text-purple-300 hover:text-white transition-colors">
                <div className="w-14 h-14 bg-purple-600/50 rounded-full flex items-center justify-center mb-1">
                    <PhoneIcon className="w-6 h-6"/>
                </div>
                <span className="text-xs">Voice Call</span>
            </button>
            <button disabled className="flex flex-col items-center text-gray-500 cursor-not-allowed">
                 <div className="w-14 h-14 bg-gray-700/50 rounded-full flex items-center justify-center mb-1">
                    <VideoIcon className="w-6 h-6"/>
                </div>
                <span className="text-xs">Video Call</span>
            </button>
            <button onClick={onStartChat} className="flex flex-col items-center text-purple-300 hover:text-white transition-colors">
                <div className="w-14 h-14 bg-purple-600/50 rounded-full flex items-center justify-center mb-1">
                    <ChatIcon className="w-6 h-6"/>
                </div>
                <span className="text-xs">Chat</span>
            </button>
        </div>
      </div>
      
      {latestCallSummary && (
        <div className="w-full max-w-sm bg-purple-900/40 rounded-2xl shadow-lg p-4 mb-4 border border-purple-500/50 relative animate-fade-in">
          <h3 className="text-lg font-semibold text-purple-300 mb-2">Moment of the meeting</h3>
          <p className="text-gray-200 text-sm">{latestCallSummary}</p>
          <button onClick={onDismissSummary} className="absolute top-3 right-3 text-gray-400 hover:text-white" aria-label="Dismiss summary">
              <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      
      <div className="w-full max-w-sm bg-black/20 rounded-2xl shadow-lg p-4 mb-4 text-sm">
        <div className="flex items-center gap-3">
            <LocationIcon className="w-5 h-5 text-purple-300 flex-shrink-0"/>
            <div>
                <p className="text-gray-400">Address</p>
                <p className="text-white font-medium">{persona.address}</p>
            </div>
        </div>
      </div>
      
       <div className="w-full max-w-sm bg-black/20 rounded-2xl shadow-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-purple-300 mb-3">Call History</h3>
          {callHistory.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {callHistory.slice(0, 5).map(call => (
                <li key={call.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <PhoneIcon className={`w-4 h-4 ${call.type === 'Outgoing' ? 'text-green-400' : 'text-red-400 -rotate-90'}`}/>
                        <div>
                            <p className="text-white">{call.type} Call</p>
                            {call.duration > 0 && <p className="text-xs text-gray-400">{formatCallDuration(call.duration)}</p>}
                        </div>
                    </div>
                    <p className="text-gray-400">{formatCallTime(call.date)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm text-center py-2">No recent calls.</p>
          )}
      </div>

      <div className="w-full max-w-sm mb-4">
         <ScheduleList items={scheduledItems} onCancel={onCancelSchedule} />
      </div>

       <button 
          onClick={onScheduleClick} 
          className="mt-auto flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          aria-label="Schedule a call"
      >
          <CalendarIcon className="w-5 h-5 text-white" />
          <span className="text-white">Schedule a Call</span>
      </button>

    </div>
  );
};
