
import React from 'react';
import type { AppStatus } from '../types';

interface VisualizerProps {
  status: AppStatus;
  callDuration: number; // in seconds
}

const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

export const Visualizer: React.FC<VisualizerProps> = ({ status, callDuration }) => {
    const getStatusContent = () => {
        switch(status) {
            case 'connecting': return 'Connecting...';
            case 'error': return 'Connection error.';
            case 'listening':
            case 'speaking':
                return formatDuration(callDuration);
            default: return '';
        }
    }
  
  const baseClasses = "relative w-40 h-40 md:w-48 md:h-48 rounded-full transition-all duration-500 ease-in-out flex items-center justify-center";
  const statusClasses = {
    idle: "bg-gray-700/50",
    connecting: "bg-purple-500/50 animate-pulse",
    listening: "bg-blue-500/50",
    speaking: "bg-green-500/50",
    error: "bg-red-500/50",
  };

  return (
    <div className="flex flex-col items-center justify-center my-8">
      <div className={`${baseClasses} ${statusClasses[status]}`}>
        <div className="absolute inset-0 rounded-full border-2 border-purple-400/30 animate-pulse"></div>
        {status === 'listening' && (
             <div className="absolute inset-0 rounded-full bg-blue-400/30 scale-75 animate-ping"></div>
        )}
        {status === 'speaking' && (
             <div className="absolute inset-2 rounded-full border-2 border-green-300/50 animate-pulse" style={{ animationDuration: '1.5s' }}></div>
        )}
        <span className="text-xl font-mono text-white z-10 tracking-wider">{getStatusContent()}</span>
      </div>
    </div>
  );
};
