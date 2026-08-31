
import React, { useState, useEffect, useRef } from 'react';
import type { Persona, TranscriptEntry } from '../types';

interface ChatViewProps {
    persona: Persona;
    chatHistory: TranscriptEntry[];
    onSendMessage: (message: string) => void;
    isAiChatting: boolean;
    onEndChat: () => void;
}

const BackIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L8.842 10l3.948 3.71a.75.75 0 11-1.06 1.06l-4.5-4.25a.75.75 0 010-1.06l4.5-4.25a.75.75 0 011.06 0z" clipRule="evenodd" />
    </svg>
);

const SendIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M3.105 3.105a.75.75 0 01.814-.148L19.427 9.25a.75.75 0 010 1.5L3.92 17.043a.75.75 0 01-1.03-.62V4.573a.75.75 0 01.214-.523z" />
    </svg>
);


export const ChatView: React.FC<ChatViewProps> = ({ persona, chatHistory, onSendMessage, isAiChatting, onEndChat }) => {
    const [message, setMessage] = useState('');
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isAiChatting]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message.trim());
            setMessage('');
        }
    };

    return (
        <div className="w-full h-full flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center p-2 bg-black/20 rounded-t-xl">
                <button onClick={onEndChat} className="p-2 text-white hover:bg-gray-700 rounded-full">
                    <BackIcon className="w-6 h-6" />
                </button>
                <img src={persona.imageUrl} alt={persona.name} className="w-10 h-10 rounded-full ml-2 object-cover" />
                <div className="ml-3">
                    <h2 className="font-bold text-white">{persona.name}</h2>
                    <p className="text-xs text-green-400">Online</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((entry, index) => (
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
                        <p className="whitespace-pre-wrap">{entry.text}</p>
                    </div>
                    </div>
                ))}
                {isAiChatting && (
                     <div className="flex items-end gap-2 justify-start">
                         <div className="max-w-xs md:max-w-md lg:max-w-2xl rounded-2xl px-4 py-2 text-white bg-gray-700 rounded-bl-none">
                             <div className="flex items-center justify-center gap-1.5">
                                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0s'}}></div>
                                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                             </div>
                         </div>
                     </div>
                )}
                <div ref={endOfMessagesRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-2 bg-black/20 rounded-b-xl">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-700 border-transparent focus:border-purple-500 focus:ring-purple-500 text-white rounded-full px-4 py-2"
                        autoFocus
                    />
                    <button type="submit" className="p-3 bg-purple-600 rounded-full text-white hover:bg-purple-500 disabled:bg-gray-600" disabled={!message.trim() || isAiChatting}>
                       <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};
