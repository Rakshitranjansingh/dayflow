
export type AppStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

export interface TranscriptEntry {
  role: 'user' | 'model';
  text: string;
}

export type VoiceName = 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';

export interface Persona {
    id: string;
    name: string;
    instruction: string;
    voice: VoiceName;
    imageUrl: string;
    subtitle: string;
    address: string;
}

export interface ScheduledItem {
  id: string;
  dateTime: number; // Store as timestamp for easy comparison and serialization
  note: string;
}

export type SoundscapeId = 'clear' | 'phone' | 'cafe';

export interface Soundscape {
  id: SoundscapeId;
  name: string;
  filter?: {
    type: BiquadFilterType;
    frequency: number;
    q: number;
  };
  background?: {
    url: string;
    volume: number;
  };
}

export interface CallHistoryEntry {
  id: string;
  date: number;
  duration: number; // in seconds
  type: 'Outgoing' | 'Missed';
  summary?: string;
}
