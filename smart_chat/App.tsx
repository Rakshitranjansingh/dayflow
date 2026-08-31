
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Conversation } from './components/Conversation';
import { Controls } from './components/Controls';
import { Visualizer } from './components/Visualizer';
import { ScheduleModal } from './components/ScheduleModal';
import { NotificationModal } from './components/NotificationModal';
import { ContactView } from './components/ContactView';
import { Onboarding } from './components/Onboarding';
import { ChatView } from './components/ChatView';
import { connectToLiveApi, disconnectFromLiveApi, updateAudioEffects, generateSummary, generateChatResponse } from './services/geminiService';
import type { AppStatus, TranscriptEntry, ScheduledItem, Persona, Soundscape, CallHistoryEntry } from './types';
import { PERSONA_AANYA, AVAILABLE_SOUNDSCAPES } from './constants';
import { LiveServerMessage } from '@google/genai';
import { blobToBase64 } from './utils/imageUtils';

type View = 'onboarding' | 'contact' | 'voice' | 'chat';

const App: React.FC = () => {
  const [voiceStatus, setVoiceStatus] = useState<AppStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Persisted state
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => localStorage.getItem('onboardingComplete') === 'true');
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('userName') || '');
  const [personaName, setPersonaName] = useState<string>(() => localStorage.getItem('personaName') || PERSONA_AANYA.name);
  const [personaImage, setPersonaImage] = useState<string>(() => localStorage.getItem('personaImage') || PERSONA_AANYA.imageUrl);
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>(() => {
      try { return JSON.parse(localStorage.getItem('scheduledItems') || '[]'); } catch { return []; }
  });
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('callHistory') || '[]'); } catch { return []; }
  });
   const [chatHistory, setChatHistory] = useState<TranscriptEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('chatHistory') || '[]'); } catch { return []; }
  });

  const [view, setView] = useState<View>(onboardingComplete ? 'contact' : 'onboarding');
  
  const [dueItem, setDueItem] = useState<ScheduledItem | null>(null);
  const [currentSoundscape, setCurrentSoundscape] = useState<Soundscape>(AVAILABLE_SOUNDSCAPES[0]);
  const [callDuration, setCallDuration] = useState(0);
  const [latestCallSummary, setLatestCallSummary] = useState<string | null>(null);
  const [isAiChatting, setIsAiChatting] = useState(false);

  const currentInputRef = useRef<string>('');
  const currentOutputRef = useRef<string>('');
  const callStartTimeRef = useRef<number | null>(null);
  
  // --- State Persistence Effects ---
  useEffect(() => { localStorage.setItem('onboardingComplete', String(onboardingComplete)); }, [onboardingComplete]);
  useEffect(() => { localStorage.setItem('userName', userName); }, [userName]);
  useEffect(() => { localStorage.setItem('personaName', personaName); }, [personaName]);
  useEffect(() => { localStorage.setItem('personaImage', personaImage); }, [personaImage]);
  useEffect(() => { localStorage.setItem('scheduledItems', JSON.stringify(scheduledItems)); }, [scheduledItems]);
  useEffect(() => { localStorage.setItem('callHistory', JSON.stringify(callHistory)); }, [callHistory]);
  useEffect(() => { localStorage.setItem('chatHistory', JSON.stringify(chatHistory)); }, [chatHistory]);

  // Check for due items
  useEffect(() => {
    const interval = setInterval(() => {
      if (dueItem) return;
      const now = Date.now();
      const upcomingItems: ScheduledItem[] = [];
      let foundDueItem: ScheduledItem | null = null;

      scheduledItems.forEach(item => {
        if (item.dateTime <= now && !foundDueItem) {
          foundDueItem = item;
        } else if (item.dateTime > now) {
          upcomingItems.push(item);
        }
      });
      
      if (foundDueItem) {
        setDueItem(foundDueItem);
        setScheduledItems(upcomingItems);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledItems, dueItem]);

  // Call duration timer
  useEffect(() => {
    let timerId: number | undefined;
    if (voiceStatus === 'listening' || voiceStatus === 'speaking') {
        timerId = window.setInterval(() => {
            if (callStartTimeRef.current) {
                setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
            }
        }, 1000);
    }
    return () => clearInterval(timerId);
  }, [voiceStatus]);

  useEffect(() => {
    if (voiceStatus === 'listening' || voiceStatus === 'speaking') {
      updateAudioEffects(currentSoundscape);
    }
  }, [currentSoundscape, voiceStatus]);

  const handleMessage = useCallback((message: LiveServerMessage) => {
    if (message.serverContent?.outputTranscription) {
      const text = message.serverContent.outputTranscription.text;
      currentOutputRef.current += text;
      setTranscript(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'model') {
          return [...prev.slice(0, -1), { role: 'model', text: currentOutputRef.current }];
        }
        return [...prev, { role: 'model', text: currentOutputRef.current }];
      });
    } else if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      currentInputRef.current += text;
      setTranscript(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'user') {
          return [...prev.slice(0, -1), { role: 'user', text: currentInputRef.current }];
        }
        return [...prev, { role: 'user', text: currentInputRef.current }];
      });
    }

    if (message.serverContent?.turnComplete) {
      currentInputRef.current = '';
      currentOutputRef.current = '';
    }

    if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
      setVoiceStatus('speaking');
    } else {
      setTimeout(() => setVoiceStatus('listening'), 100);
    }
  }, []);
  
  const currentPersona: Persona = {
    ...PERSONA_AANYA,
    name: personaName,
    imageUrl: personaImage,
    instruction: `Your name is ${personaName}. The user's name is ${userName}. Talk to them as a friend. ${PERSONA_AANYA.instruction}`,
  };

  const startConversation = async (contextualInstruction?: string) => {
    setLatestCallSummary(null);
    setTranscript([]);
    callStartTimeRef.current = Date.now();
    setCallDuration(0);
    setView('voice');
    setVoiceStatus('connecting');

    try {
      await connectToLiveApi({
        onMessage: handleMessage,
        onOpen: () => setVoiceStatus('listening'),
        onError: (e) => {
          console.error('Connection error:', e);
          stopConversation('error');
        },
        onClose: () => stopConversation(),
        systemInstruction: contextualInstruction || currentPersona.instruction,
        voiceName: currentPersona.voice,
        initialSoundscape: currentSoundscape,
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      stopConversation('error');
    }
  };

  const stopConversation = (finalStatus: AppStatus = 'idle') => {
    disconnectFromLiveApi();
    setView('contact');
    
    const finalTranscript = [...transcript];
    setTranscript([]);

    if (callStartTimeRef.current) {
      const duration = Math.round((Date.now() - callStartTimeRef.current) / 1000);
      if (duration > 5) { // Only log and summarize calls longer than 5 seconds
          const newHistoryEntry: CallHistoryEntry = {
            id: crypto.randomUUID(),
            date: Date.now(),
            duration: duration,
            type: 'Outgoing',
          };
          setCallHistory(prev => [newHistoryEntry, ...prev]);

          generateSummary(finalTranscript, userName, personaName).then(summary => {
            setLatestCallSummary(summary);
            setCallHistory(prev => prev.map(entry => 
                entry.id === newHistoryEntry.id ? { ...entry, summary } : entry
            ));
          }).catch(err => console.error("Summary generation failed:", err));
      }
    }
    callStartTimeRef.current = null;
    setVoiceStatus(finalStatus);
  };

  const handleSendChatMessage = async (message: string) => {
    const userMessage: TranscriptEntry = { role: 'user', text: message };
    setChatHistory(prev => [...prev, userMessage]);
    setIsAiChatting(true);
    
    const responseText = await generateChatResponse(chatHistory, message, currentPersona.instruction);

    const modelMessage: TranscriptEntry = { role: 'model', text: responseText };
    setChatHistory(prev => [...prev, modelMessage]);
    setIsAiChatting(false);
  };

  const handleSchedule = (dateTime: number, note: string) => {
    const newItem: ScheduledItem = { id: crypto.randomUUID(), dateTime, note };
    setScheduledItems(prev => [...prev, newItem].sort((a,b) => a.dateTime - b.dateTime));
    setIsScheduling(false);
  };
  
  const handleStartScheduledCall = () => {
    if (!dueItem) return;
    const contextualInstruction = `We scheduled a chat right now to talk about: "${dueItem.note}". Please start by asking me about this, and then ask how my day was. ${currentPersona.instruction}`;
    setDueItem(null);
    startConversation(contextualInstruction);
  }

  const handleOnboardingComplete = (name: string, companionName: string, image: string) => {
    setUserName(name);
    setPersonaName(companionName);
    setPersonaImage(image);
    setOnboardingComplete(true);
    setView('contact');
  };
  
  const handleImageChange = async (file: File) => {
    const base64 = await blobToBase64(file);
    setPersonaImage(base64);
  };

  const renderContent = () => {
    switch(view) {
        case 'onboarding':
            return <Onboarding onComplete={handleOnboardingComplete} defaultImageUrl={PERSONA_AANYA.imageUrl} defaultCompanionName={PERSONA_AANYA.name} />;
        case 'chat':
            return <ChatView 
                        persona={currentPersona}
                        chatHistory={chatHistory}
                        onSendMessage={handleSendChatMessage}
                        isAiChatting={isAiChatting}
                        onEndChat={() => setView('contact')}
                    />;
        case 'voice':
            return (
                <>
                    <Conversation transcript={transcript} />
                    <Visualizer status={voiceStatus} callDuration={callDuration} />
                    <Controls
                        status={voiceStatus}
                        onStop={() => stopConversation()}
                        soundscapes={AVAILABLE_SOUNDSCAPES}
                        currentSoundscape={currentSoundscape}
                        onSoundscapeChange={setCurrentSoundscape}
                    />
                </>
            );
        case 'contact':
        default:
            return <ContactView 
              persona={currentPersona}
              onStartCall={() => startConversation()}
              onStartChat={() => setView('chat')}
              onScheduleClick={() => setIsScheduling(true)}
              scheduledItems={scheduledItems}
              onCancelSchedule={(id: string) => setScheduledItems(prev => prev.filter(item => item.id !== id))}
              onImageChange={handleImageChange}
              callHistory={callHistory}
              latestCallSummary={latestCallSummary}
              onDismissSummary={() => setLatestCallSummary(null)}
              voiceStatus={voiceStatus}
              onDismissError={() => setVoiceStatus('idle')}
            />
    }
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900">
        <main className="flex-1 flex flex-col items-center justify-between p-4 overflow-hidden">
         {renderContent()}
        </main>
      </div>
      {isScheduling && <ScheduleModal onSchedule={handleSchedule} onClose={() => setIsScheduling(false)} />}
      {dueItem && <NotificationModal item={dueItem} onStart={handleStartScheduledCall} onDismiss={() => setDueItem(null)} />}
    </>
  );
};

export default App;
