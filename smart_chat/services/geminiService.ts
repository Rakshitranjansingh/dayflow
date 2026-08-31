
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';
import { encode, decode, decodeAudioData } from './audioUtils';
import { VoiceName, Soundscape, TranscriptEntry } from '../types';

interface ConnectOptions {
  onMessage: (message: LiveServerMessage) => void;
  onOpen: () => void;
  onError: (e: ErrorEvent) => void;
  onClose: (e: CloseEvent) => void;
  systemInstruction: string;
  voiceName: VoiceName;
  initialSoundscape: Soundscape;
}

let sessionPromise: Promise<LiveSession> | null = null;
let mediaStream: MediaStream | null = null;
let inputAudioContext: AudioContext | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;

// Audio playback state
let outputAudioContext: AudioContext | null = null;
let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();

// Audio effects state
let voicePipelineStartNode: AudioNode | null = null;
let voiceGainNode: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let backgroundSourceNode: AudioBufferSourceNode | null = null;
let backgroundGainNode: GainNode | null = null;

const getApiKey = (): string => {
  try {
    const stateObj = JSON.parse(localStorage.getItem('state') || '{}');
    if (stateObj.apiKey) return stateObj.apiKey;
  } catch(e) {}
  const localKey = localStorage.getItem('apiKey') || localStorage.getItem('dayflow_api_key');
  const winKey = (window as any).GEMINI_API_KEY;
  const envKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';
  return localKey || winKey || envKey || '';
};

export const connectToLiveApi = async (options: ConnectOptions): Promise<void> => {
  if (sessionPromise) {
    console.warn("Session already exists. Disconnect first.");
    return;
  }
  
  const apiKey = getApiKey();
  if (!apiKey) {
    options.onError(new ErrorEvent('API Key Missing', { message: "No Gemini API key found. Please add your key in Settings." }));
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  // --- Output Audio & Effects Setup ---
  outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  nextStartTime = 0;

  // Create nodes for effects
  voiceGainNode = outputAudioContext.createGain();
  voiceGainNode.gain.value = 0.8; // Lower the volume
  filterNode = outputAudioContext.createBiquadFilter();
  backgroundGainNode = outputAudioContext.createGain();

  // Connect gain nodes to the destination
  voiceGainNode.connect(outputAudioContext.destination);
  backgroundGainNode.connect(outputAudioContext.destination);

  // Set the initial audio pipeline
  voicePipelineStartNode = voiceGainNode; // Default to direct connection
  updateAudioEffects(options.initialSoundscape);

  sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: () => {
        options.onOpen();
        startMicrophoneStreaming();
      },
      onmessage: async (message: LiveServerMessage) => {
        options.onMessage(message);
        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (audioData && outputAudioContext) {
            playAudio(audioData, outputAudioContext);
        }
        if (message.serverContent?.interrupted && outputAudioContext) {
            stopAllPlayback();
        }
      },
      onerror: options.onError,
      onclose: options.onClose,
    },
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: options.voiceName } },
      },
      systemInstruction: options.systemInstruction,
    },
  });

  const startMicrophoneStreaming = async () => {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

        const source = inputAudioContext.createMediaStreamSource(mediaStream);
        scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
            }
            const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
            };
            if(sessionPromise) {
                sessionPromise.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            }
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);

    } catch (err) {
        console.error("Microphone access denied:", err);
        options.onError(new ErrorEvent('Microphone Error', { message: "Microphone access denied"}));
    }
  };
};

const playAudio = async (base64Audio: string, ctx: AudioContext) => {
    if (!voicePipelineStartNode) return;
    nextStartTime = Math.max(nextStartTime, ctx.currentTime);
    const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(voicePipelineStartNode);
    
    source.addEventListener('ended', () => {
        sources.delete(source);
    });

    source.start(nextStartTime);
    nextStartTime += audioBuffer.duration;
    sources.add(source);
};

const stopAllPlayback = () => {
    sources.forEach(source => {
        source.stop();
    });
    sources.clear();
    nextStartTime = 0;
};

export const updateAudioEffects = async (soundscape: Soundscape) => {
    if (!outputAudioContext || !filterNode || !voiceGainNode || !backgroundGainNode) return;

    // --- Handle Background Noise ---
    if (backgroundSourceNode) {
        backgroundSourceNode.stop();
        backgroundSourceNode.disconnect();
        backgroundSourceNode = null;
    }
    if (soundscape.background) {
        try {
            const response = await fetch(soundscape.background.url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await outputAudioContext.decodeAudioData(arrayBuffer);
            
            backgroundSourceNode = outputAudioContext.createBufferSource();
            backgroundSourceNode.buffer = audioBuffer;
            backgroundSourceNode.loop = true;
            backgroundSourceNode.connect(backgroundGainNode);
            backgroundSourceNode.start();
            backgroundGainNode.gain.setValueAtTime(soundscape.background.volume, outputAudioContext.currentTime);
        } catch (e) {
            console.error("Failed to load background audio:", e);
        }
    }

    // --- Handle Voice Filter ---
    filterNode.disconnect();
    if (soundscape.filter) {
        filterNode.type = soundscape.filter.type;
        filterNode.frequency.setValueAtTime(soundscape.filter.frequency, outputAudioContext.currentTime);
        filterNode.Q.setValueAtTime(soundscape.filter.q, outputAudioContext.currentTime);
        filterNode.connect(voiceGainNode);
        voicePipelineStartNode = filterNode;
    } else {
        voicePipelineStartNode = voiceGainNode;
    }
}


export const disconnectFromLiveApi = () => {
  if (sessionPromise) {
    sessionPromise.then(session => session.close());
    sessionPromise = null;
  }

  // Stop microphone
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (inputAudioContext) {
    inputAudioContext.close();
    inputAudioContext = null;
  }

  // Stop playback and effects
  if (outputAudioContext) {
    if (backgroundSourceNode) {
        backgroundSourceNode.stop();
    }
    stopAllPlayback();
    outputAudioContext.close();
    outputAudioContext = null;
    voicePipelineStartNode = null;
    filterNode = null;
    voiceGainNode = null;
    backgroundGainNode = null;
    backgroundSourceNode = null;
  }
};

export const generateSummary = async (
  transcript: TranscriptEntry[],
  userName: string,
  personaName: string,
): Promise<string> => {
  if (transcript.length === 0) {
    return "";
  }
  
  const apiKey = getApiKey();
  if (!apiKey) return "API Key missing";

  const ai = new GoogleGenAI({ apiKey });

  const formattedTranscript = transcript
    .map(entry => `${entry.role === 'user' ? userName : personaName}: ${entry.text}`)
    .join('\n');

  const prompt = `Concisely summarize the key moments and overall sentiment of this conversation between ${userName} (user) and ${personaName} (assistant) in 50 words or less. Transcript:\n\n${formattedTranscript}`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text || "Could not generate a summary.";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Summary generation failed.";
  }
};

export const generateChatResponse = async (
    history: TranscriptEntry[],
    newMessage: string,
    personaInstruction: string,
): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "Please add your Gemini API key in Settings.";

    const ai = new GoogleGenAI({ apiKey });

    const contents = history.map(entry => ({
        role: entry.role,
        parts: [{ text: entry.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: newMessage }] });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: personaInstruction,
            }
        });
        return response.text || "Sorry, I couldn't think of a response.";
    } catch (error) {
        console.error("Error generating chat response:", error);
        return "Sorry, I encountered an error.";
    }
};