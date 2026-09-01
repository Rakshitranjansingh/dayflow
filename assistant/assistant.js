/* ============================================================
   AI PERSONAL VOICE ASSISTANT MODULE (KHUSHI & SONU)
   ============================================================ */

let chatSpeechRecognition = null;
let chatIsListening = false;
let currentUtterance = null;

var currentChatTabMode = 'assistant';

// ─── MOBILE AUDIO UNLOCK ─────────────────────────────────────────────────────
// iOS Safari and Android Chrome block audio.play() called after async fetch.
// We keep a single AudioContext that gets unlocked on the FIRST user tap,
// then stays usable forever — even after async API calls.
var _sharedAudioCtx = null;
// Stores the resume() Promise kicked off during a user gesture, so we can
// await it later in async code without needing a new gesture (iOS fix).
var _audioUnlockPromise = null;

function getAudioContext() {
  if (!_sharedAudioCtx) {
    _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _sharedAudioCtx;
}

// Call this inside every user-tap handler (send button, mic button, etc.)
// It is safe to call multiple times.
function unlockAudioContext() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      // Store the promise — it resolves because it was triggered by a user gesture.
      // We can then safely await it later in async code.
      _audioUnlockPromise = ctx.resume();
    }
    // Play a zero-duration silent buffer to fully unlock on iOS
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch(e) {}
}

// Also unlock on any first touch/click anywhere on the page
document.addEventListener('touchstart', unlockAudioContext, { passive: true });
document.addEventListener('click',      unlockAudioContext, { passive: true });

// Pre-load voices on browser ready
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    try { window.speechSynthesis.getVoices(); } catch(e) {}
  };
}


function buildAppPersonalContext() {
  const d = state.selectedDate || (typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10));
  const userName = state.name ? (state.name.charAt(0).toUpperCase() + state.name.slice(1)) : 'User';

  // Sleep
  const sl = state.sleep[d] || {};
  const sleepStr = (sl.wake && sl.sleep) ? `${typeof calcSleepDur === 'function' ? calcSleepDur(sl.wake, sl.sleep) : ''} (Bedtime: ${sl.sleep}, Wake: ${sl.wake})` : 'Not logged today';

  // Habits
  let habitsDone = 0, habitsTotal = 0;
  const habitDetails = [];
  if (state.habits && state.habits.categories) {
    state.habits.categories.forEach(c => {
      c.items.forEach(it => {
        habitsTotal++;
        const isDone = !!it.done[d];
        if (isDone) habitsDone++;
        habitDetails.push(`${c.name}: ${it.name} (${isDone ? 'Done ✅' : 'Pending ⏳'})`);
      });
    });
  }
  const habitsSummary = `${habitsDone}/${habitsTotal} completed today. Items: ${habitDetails.slice(0, 8).join(', ')}`;

  // Nutrition
  const meals = state.nutrition[d] || [];
  const totCal = meals.reduce((s, m) => s + (m.cal || 0), 0);
  const totCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totProt = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totFat = meals.reduce((s, m) => s + (m.fat || 0), 0);
  const mealsList = meals.length ? meals.map(m => `${m.mealType || 'Meal'}: ${m.name} (${m.cal} cal)`).join('; ') : 'No meals logged today';
  const nutritionSummary = `Calories: ${totCal} cal (Carbs: ${totCarbs}g, Protein: ${totProt}g, Fat: ${totFat}g). Meals: ${mealsList}`;

  // Expenses
  const exps = state.expenses[d] || [];
  const todayExp = exps.reduce((s, e) => s + (e.amount || 0), 0);
  let monthExp = 0;
  if (state.expenses) {
    Object.entries(state.expenses).forEach(([dateStr, items]) => {
      if (dateStr.startsWith(d.slice(0, 7))) {
        monthExp += items.reduce((s, e) => s + (e.amount || 0), 0);
      }
    });
  }
  const expsList = exps.length ? exps.map(e => `₹${e.amount} [${e.category}] ${e.note ? '(' + e.note + ')' : ''}`).join(', ') : 'No expenses logged today';
  const expenseSummary = `Today's Spending: ₹${todayExp.toFixed(0)}, Monthly Spending: ₹${monthExp.toFixed(0)}. Transactions: ${expsList}`;

  // To-Dos
  const todos = state.todos || [];
  const pendingTodos = todos.filter(t => !t.done);
  const completedTodos = todos.filter(t => t.done);
  const pendingList = pendingTodos.length ? pendingTodos.slice(0, 6).map(t => `- ${t.text}${t.note ? ' (' + t.note + ')' : ''}`).join('\n') : 'No pending tasks!';
  const todoSummary = `Pending Tasks (${pendingTodos.length}):\n${pendingList}\nCompleted Tasks Count: ${completedTodos.length}`;

  // Journal
  const journalEntries = (state.journal && state.journal[d]) || [];
  const journalSummary = journalEntries.length ? journalEntries.map(j => `[${j.time}] ${j.text} ${j.mood ? '(Mood: ' + j.mood + ')' : ''}`).join('\n') : 'No journal entries today.';

  // Grow & Learn
  const javaEnroll = state.learning?.enrollments?.java;
  let learnSummary = 'No active course enrolled.';
  if (javaEnroll && javaEnroll.enrolled) {
    const doneLessons = javaEnroll.completed?.length || 0;
    learnSummary = `Course: Java Development Roadmap. Progress: ${javaEnroll.progress || 0}% (${doneLessons}/12 lessons done). Streak: ${javaEnroll.streak || 0} days.`;
  }
  const huntSummary = `Job Hunt Target Role: ${state.hunt?.targetRole || 'Software Engineer'}, Applications Tracked: ${state.hunt?.applications?.length || 0}`;

  // Persona
  const persona = state.chatPersona || 'khushi';
  const personaName = persona === 'sonu' ? 'Sonu' : 'Khushi';

  return `[SYSTEM CONTEXT: You are ${personaName}, a warm, highly intelligent Indian AI Personal Assistant inside BeCreator app. Speak naturally in conversational Indian Hinglish tone. You know ALL live user data for "${userName}". Today is ${d}.

LIVE USER APP DATA & STATS SNAPSHOT:
• User Name: ${userName}
• Date Selected: ${d}
• Sleep: ${sleepStr}
• Habits: ${habitsSummary}
• Nutrition: ${nutritionSummary}
• Expenses: ${expenseSummary}
• To-Dos: ${todoSummary}
• Journal: ${journalSummary}
• Grow & Learn: ${learnSummary}
• Job Hunt: ${huntSummary}

INSTRUCTIONS FOR ${personaName.toUpperCase()}:
1. Answer any question about the user's stats, sleep, calories, expenses, todos, or learning with precise numbers from the snapshot above — BUT ONLY when the user asks about them directly.
2. Answer any general knowledge, programming, advice, or general info query intelligently and clearly.
3. Keep spoken responses concise (2-4 sentences max per reply) so verbal voice conversations flow smoothly.
4. Maintain a warm, friendly Indian Hinglish tone like a real personal assistant.
5. CRITICAL — DO NOT proactively bring up habits, todos, sleep, nutrition, expenses or any app data unless the user explicitly asks. Just have a natural conversation. Never give unsolicited advice or reminders about the user's pending tasks or habits.]\n\n`;
}

function switchChatTabMode(mode) {
  currentChatTabMode = mode;
  const panel = document.getElementById('panel-body');
  if (panel && currentPanel === 'chat') {
    panel.innerHTML = renderChat();
  }
}

function renderChat() {
  const msgs = (state.chatHistory || []).map(m => `
    <div class="chat-msg ${m.role === 'user' ? 'user' : 'ai'}">${m.content.replace(/\n/g,'<br>')}</div>
  `).join('');
  const hasKey = typeof getActiveApiKey === 'function' ? getActiveApiKey() : state.apiKey;
  const apiStatus = hasKey
    ? `<span style="color:var(--green);font-size:11px">● API key active</span>`
    : `<span style="color:var(--red);font-size:11px">● No API key &mdash; <span style="cursor:pointer;text-decoration:underline" onclick="closePanel();openPanel('settings')">Add in Settings</span></span>`;

  const activePersona = state.chatPersona || 'khushi';
  const autoSpeakChecked = state.autoSpeak !== false ? 'checked' : '';

  return `
    <!-- Khushi Header -->
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0 14px 0;border-bottom:1px solid var(--border);margin-bottom:12px">
      <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#ec4899);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">&#x1F469;</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:800;color:var(--text);letter-spacing:-0.3px">Khushi &#x2728;</div>
        <div style="font-size:11px;color:var(--text2)">Your AI Personal Assistant &bull; Always here</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:11px;color:var(--text2);display:flex;align-items:center;gap:4px;cursor:pointer">
          <input type="checkbox" ${autoSpeakChecked} onchange="toggleAutoSpeak(this.checked)"> &#x1F50A;
        </label>
        <button class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:10.5px" onclick="testVoiceSynthesis()">&#x1F50A; Test</button>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      ${apiStatus}
      <button class="btn btn-secondary btn-sm" onclick="testChatConnection()">&#x1F50D; Test Key</button>
    </div>

    <div class="chat-messages" id="chat-msgs">${msgs || '<div class="empty-state"><div class="e-icon">&#x1F469;</div><div class="e-text">Hi! I\'m Khushi, your personal AI. Ask me about your tasks, sleep, habits, or just chat!</div></div>'}</div>

    <div id="chat-speech-equalizer" class="chat-equalizer" style="display:none;margin-bottom:6px">
      <span id="chat-speech-label">&#x1F50A; Khushi Speaking...</span>
      <div class="chat-voice-wave">
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
      </div>
      <button class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:10px" onclick="stopAISpeech()">&#x23F9;&#xFE0F; Stop</button>
    </div>

    <div class="chat-voice-action-box">
      <button class="chat-voice-btn" id="chat-voice-btn" onclick="toggleChatVoiceInput()">
        &#x1F399;&#xFE0F; Speak to Khushi
      </button>
      <div id="chat-voice-wave" class="chat-voice-wave" style="display:none">
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
      </div>
    </div>

    <div class="chat-input-row" style="margin-top:10px">
      <input class="input" id="chat-input" placeholder="Message Khushi..." style="flex:1" onkeydown="if(event.key==='Enter')sendChat()">
      <button class="btn btn-primary" onclick="sendChat()">&#x2192;</button>
    </div>
    <div class="chat-insight-note">&#x1F4A1; Full app awareness &bull; to-do auto-detection &bull; key insights saved to journal</div>
  `;
}


function renderChatMsgs() {
  const msgs = (state.chatHistory || []).map(m => `
    <div class="chat-msg ${m.role === 'user' ? 'user' : 'ai'}">${m.content.replace(/\n/g,'<br>')}</div>
  `).join('');
  const el = document.getElementById('chat-msgs');
  if (el) el.innerHTML = msgs || '<div class="empty-state"><div class="e-icon">💬</div><div class="e-text">Ask me anything.</div></div>';
}

function setChatPersona(val) {
  state.chatPersona = val;
  if (typeof saveState === 'function') saveState();
  const name = val === 'sonu' ? 'Sonu' : 'Khushi';
  if (typeof showToast === 'function') showToast(`Persona set to ${name} (${val === 'sonu' ? 'Male' : 'Female'})`);
  testVoiceSynthesis();
}

function toggleAutoSpeak(enabled) {
  state.autoSpeak = enabled;
  if (typeof saveState === 'function') saveState();
  if (!enabled) stopAISpeech();
  if (typeof showToast === 'function') showToast(`Auto-speak ${enabled ? 'enabled' : 'disabled'}`);
}

let activeAudioQueue = [];
let currentPlayingAudio = null;
let activeTtsAbortController = null;  // aborts in-flight TTS fetch on stopAISpeech

// Test the voice — called by the 🔊 Test button in the chat header
function testVoiceSynthesis() {
  const persona = state.chatPersona || 'khushi';
  const name = persona === 'sonu' ? 'Sonu' : 'Khushi';
  speakWithGeminiTTS(`Hi! I'm ${name}, your personal assistant. How can I help you today?`, persona)
    .catch(() => speakHinglishWebSpeech(`Hi! I'm ${name}. Voice test!`, persona));
}

function speakAIResponse(text) {
  if (state.autoSpeak === false) return;

  stopAISpeech();

  let cleanText = text
    .replace(/INSIGHT:.*$/gm, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[*#_~`>]/g, '')
    .replace(/--+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  const persona = state.chatPersona || 'khushi';

  // Tier 1: Gemini TTS (uses same Gemini API key — no extra setup needed)
  speakWithGeminiTTS(cleanText, persona).catch(() => {
    // Tier 2: Segmented Hinglish browser WebSpeech (Hindi words in Hindi voice, English in English)
    speakHinglishWebSpeech(cleanText, persona);
  });
}

function speakInstantFiller() {
  if (state.autoSpeak === false) return;

  stopAISpeech();

  const persona = state.chatPersona || 'khushi';
  const khushiFillers = [
    "Acha, ek second.",
    "Sure, checking now!",
    "Hmm, let me look into this.",
    "One sec, got you!"
  ];
  const sonuFillers = [
    "Ha bhai, ek sec.",
    "Sure, dekh raha hoon.",
    "Give me a moment.",
    "Right away!"
  ];

  const arr = persona === 'sonu' ? sonuFillers : khushiFillers;
  const fillerText = arr[Math.floor(Math.random() * arr.length)];

  speakWithGeminiTTS(fillerText, persona).catch(() => {
    speakHinglishWebSpeech(fillerText, persona);
  });
}

// ─── VOICE ENGINE ─────────────────────────────────────────────────────────────

// Detect if text contains Devanagari (Hindi) script
function isDevanagariWord(word) {
  return /[\u0900-\u097F]/.test(word);
}

// Segment mixed Hinglish text into { lang: 'hi'|'en', text } chunks
function segmentHinglish(text) {
  const words = text.split(/(\s+)/g);
  const segments = [];
  let cur = { lang: null, text: '' };
  words.forEach(w => {
    if (!w.trim()) { cur.text += w; return; }
    const lang = isDevanagariWord(w) ? 'hi' : 'en';
    if (lang === cur.lang) { cur.text += w; }
    else {
      if (cur.text.trim()) segments.push({ ...cur });
      cur = { lang, text: w };
    }
  });
  if (cur.text.trim()) segments.push({ ...cur });
  return segments;
}

// ── TIER 1: Gemini TTS ──────────────────────────────────────────────────────
// Uses the same Gemini API key the user already has.
// Model: gemini-2.5-flash-preview-tts  |  Returns LINEAR16 PCM audio.
async function speakWithGeminiTTS(text, persona, signal) {
  const activeKey = typeof getActiveApiKey === 'function' ? getActiveApiKey() : state.apiKey;
  if (!activeKey) throw new Error('No API key');

  // Khushi = warm Indian female voice; Sonu = natural Indian male voice
  const voiceName = persona === 'khushi' ? 'Aoede' : 'Puck';

  const body = {
    contents: [{ parts: [{ text: text.slice(0, 1200) }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } }
      }
    }
  };

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${activeKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }
  );

  if (r.status === 429) {
    // Rate limited on TTS — wait 2 seconds and retry once before falling back to WebSpeech
    await new Promise(res => setTimeout(res, 2000));
    const r2 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${activeKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }
    );
    if (!r2.ok) throw new Error(`Gemini TTS ${r2.status}`);
    const data2 = await r2.json();
    const b64_2 = data2?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64_2) throw new Error('No audio data from Gemini TTS (retry)');
    const pcmRetry = Uint8Array.from(atob(b64_2), c => c.charCodeAt(0)).buffer;
    const ctxR = getAudioContext();
    if (_audioUnlockPromise) { try { await _audioUnlockPromise; } catch(e) {} }
    const audioBufRetry = await ctxR.decodeAudioData(pcmToWav(new Uint8Array(pcmRetry), 24000, 1, 16));
    return new Promise((resolve) => {
      const src = ctxR.createBufferSource();
      src.buffer = audioBufRetry;
      src.connect(ctxR.destination);
      const name = persona === 'sonu' ? 'Sonu' : 'Khushi';
      const equalizer = document.getElementById('chat-speech-equalizer');
      const label = document.getElementById('chat-speech-label');
      if (equalizer) equalizer.style.display = 'flex';
      if (label) label.textContent = `🔊 ${name} Speaking...`;
      src.onended = () => { if (equalizer) equalizer.style.display = 'none'; resolve(); };
      src.start(0);
      currentPlayingAudio = src;
    });
  }
  if (!r.ok) {
    const errMsg = `Voice error (${r.status}). Check API key or try again.`;
    if (typeof showToast === 'function') showToast('🔇 ' + errMsg);
    throw new Error(`Gemini TTS ${r.status}`);
  }
  const data = await r.json();

  const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) {
    if (typeof showToast === 'function') showToast('🔇 No audio received from Gemini TTS.');
    throw new Error('No audio data from Gemini TTS');
  }

  // Gemini TTS returns raw PCM (LINEAR16, 24kHz, mono) — wrap in WAV header
  const pcm = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;

  // Use AudioContext to play — bypasses mobile autoplay restriction.
  // Await the unlock promise that was stored during the user gesture tap.
  // This is critical on iOS: ctx.resume() MUST be called during user gesture,
  // but we can await the same promise later in async code.
  const ctx = getAudioContext();
  if (_audioUnlockPromise) { try { await _audioUnlockPromise; } catch(e) {} }
  if (ctx.state === 'suspended') {
    // Last-resort: try resume even if outside gesture (works on Android, hangs on iOS but we timeout)
    const resumeTimeout = new Promise(resolve => setTimeout(resolve, 500));
    await Promise.race([ctx.resume().catch(() => {}), resumeTimeout]);
  }

  const audioBuf = await ctx.decodeAudioData(pcmToWav(new Uint8Array(pcm), 24000, 1, 16));

  return new Promise((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);

    const name = persona === 'sonu' ? 'Sonu' : 'Khushi';
    const equalizer = document.getElementById('chat-speech-equalizer');
    const label   = document.getElementById('chat-speech-label');
    if (equalizer) equalizer.style.display = 'flex';
    if (label) label.textContent = `🔊 ${name} Speaking...`;

    src.onended = () => {
      if (equalizer) equalizer.style.display = 'none';
      resolve();
    };

    src.start(0);
    // Keep a reference so stopAISpeech() can kill it
    currentPlayingAudio = src;
  });
}

// Build a minimal WAV header around raw PCM bytes
function pcmToWav(pcmData, sampleRate, numChannels, bitsPerSample) {
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer).set(pcmData, 44);
  return buffer;
}

// ── TIER 2: Segmented Hinglish Web Speech ───────────────────────────────────
// Speaks each language segment with the matching voice:
//  • Hindi (Devanagari) segments → hi-IN voice
//  • English / Roman Hinglish   → en-IN voice
function findBestVoice(lang, persona) {
  const voices = window.speechSynthesis.getVoices() || [];
  if (lang === 'hi') {
    return voices.find(v => v.lang && v.lang.startsWith('hi')) ||
           voices.find(v => v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('neerja') || v.name.toLowerCase().includes('heera')) ||
           null;
  }
  // English / Hinglish
  if (persona === 'khushi') {
    return voices.find(v => ['Neerja', 'Heera', 'Kara', 'Aria', 'Jenny', 'Samantha'].some(n => v.name.includes(n))) ||
           voices.find(v => v.lang === 'en-IN' || v.lang === 'en-GB') ||
           voices.find(v => v.lang && v.lang.startsWith('en')) ||
           null;
  }
  return voices.find(v => ['Prabhat', 'Ravi', 'Guy', 'David'].some(n => v.name.includes(n))) ||
         voices.find(v => v.lang === 'en-IN') ||
         voices.find(v => v.lang && v.lang.startsWith('en')) ||
         null;
}

function speakHinglishWebSpeech(text, persona) {
  if (!('speechSynthesis' in window)) return;

  try { window.speechSynthesis.cancel(); } catch(e) {}

  const segments = segmentHinglish(text);
  const equalizer = document.getElementById('chat-speech-equalizer');
  const label = document.getElementById('chat-speech-label');
  const name = persona === 'sonu' ? 'Sonu' : 'Khushi';
  if (equalizer) equalizer.style.display = 'flex';
  if (label) label.textContent = `🔊 ${name} Speaking...`;

  let idx = 0;
  function speakNext() {
    if (idx >= segments.length) {
      if (equalizer) equalizer.style.display = 'none';
      return;
    }
    const seg = segments[idx++];
    if (!seg.text.trim()) { speakNext(); return; }

    const utt = new SpeechSynthesisUtterance(seg.text);
    const voice = findBestVoice(seg.lang, persona);
    if (voice) { utt.voice = voice; utt.lang = voice.lang; }
    else { utt.lang = seg.lang === 'hi' ? 'hi-IN' : 'en-IN'; }

    utt.volume = 1.0;
    utt.rate   = persona === 'khushi' ? 1.0  : 0.93;
    utt.pitch  = persona === 'khushi' ? 1.05 : 0.92;

    utt.onend   = speakNext;
    utt.onerror = speakNext; // skip broken segment, keep going

    window._activeSpeechUtterance = utt;
    window.speechSynthesis.speak(utt);
  }

  setTimeout(speakNext, 50); // tiny delay fixes Safari voice-list race
}

// (dead TTS functions removed — replaced by speakWithGeminiTTS + speakHinglishWebSpeech above)

function stopAISpeech() {
  // Abort any in-flight TTS network request immediately
  if (activeTtsAbortController) {
    try { activeTtsAbortController.abort(); } catch(e) {}
    activeTtsAbortController = null;
  }

  if (currentPlayingAudio) {
    try {
      // AudioBufferSourceNode uses .stop(), HTMLAudioElement uses .pause()
      if (typeof currentPlayingAudio.stop === 'function') currentPlayingAudio.stop();
      else if (typeof currentPlayingAudio.pause === 'function') currentPlayingAudio.pause();
    } catch(e) {}
    currentPlayingAudio = null;
  }
  activeAudioQueue = [];

  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
  }

  const equalizer = document.getElementById('chat-speech-equalizer');
  if (equalizer) equalizer.style.display = 'none';
}

function toggleChatVoiceInput() {
  if (chatIsListening) {
    stopChatVoiceInput();
  } else {
    startChatVoiceInput();
  }
}

function startChatVoiceInput() {
  // MOBILE FIX: unlock AudioContext on mic button tap
  unlockAudioContext();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (typeof showToast === 'function') showToast('🎙️ Speech Recognition not supported in this browser. Type below.');
    return;
  }

  stopAISpeech();

  if (!chatSpeechRecognition) {
    chatSpeechRecognition = new SpeechRecognition();
    chatSpeechRecognition.continuous = false;
    chatSpeechRecognition.interimResults = true;
    chatSpeechRecognition.lang = 'en-IN';

    chatSpeechRecognition.onstart = () => {
      chatIsListening = true;
      updateChatVoiceUI(true);
    };

    chatSpeechRecognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const input = document.getElementById('chat-input');
      if (input) input.value = transcript;
    };

    chatSpeechRecognition.onerror = (e) => {
      console.warn('Voice dictation error:', e);
      stopChatVoiceInput();
    };

    chatSpeechRecognition.onend = () => {
      chatIsListening = false;
      updateChatVoiceUI(false);
      const input = document.getElementById('chat-input');
      if (input && input.value.trim().length > 0) {
        sendChat();
      }
    };
  }

  try {
    chatSpeechRecognition.start();
  } catch(e) {
    console.error(e);
  }
}

function stopChatVoiceInput() {
  if (chatSpeechRecognition && chatIsListening) {
    try { chatSpeechRecognition.stop(); } catch(e) {}
  }
  chatIsListening = false;
  updateChatVoiceUI(false);
}

function updateChatVoiceUI(isListening) {
  const personaName = (state.chatPersona === 'sonu') ? 'Sonu' : 'Khushi';
  const btn = document.getElementById('chat-voice-btn');
  const wave = document.getElementById('chat-voice-wave');
  if (btn) {
    btn.classList.toggle('listening', isListening);
    btn.innerHTML = isListening ? '⏹️ Listening... (Speak now)' : `🎙️ Speak to ${personaName}`;
  }
  if (wave) {
    wave.style.display = isListening ? 'flex' : 'none';
  }
}

async function testChatConnection() {
  const activeKey = typeof getActiveApiKey === 'function' ? getActiveApiKey() : state.apiKey;
  if (!activeKey) { if (typeof showToast === 'function') showToast('⚙️ Add API key in Settings first'); return; }
  if (typeof showToast === 'function') showToast('Testing connection...');
  try {
    const result = await testGeminiKey(activeKey);
    if (result.valid) { if (typeof showToast === 'function') showToast('✅ Connection works! API key is valid.'); }
    else if (result.rateLimited) { if (typeof showToast === 'function') showToast('✅ Key valid but rate limited. Wait a moment.'); }
    else { if (typeof showToast === 'function') showToast(`❌ ${result.error || 'API key invalid'}`); }
  } catch(e) {
    if (typeof showToast === 'function') showToast(`❌ Connection failed: ${e.message}`);
  }
}

async function sendChat() {
  // MOBILE FIX: unlock AudioContext right inside the user gesture (tap/click)
  // so async audio.play() works even after fetch() completes later
  unlockAudioContext();

  const input = document.getElementById('chat-input');
  const text = input ? input.value.trim() : '';
  const activeKey = typeof getActiveApiKey === 'function' ? getActiveApiKey() : state.apiKey;
  if (!text) return;
  if (!activeKey) { if (typeof showToast === 'function') showToast('Add API key in ⚙️ Settings'); return; }

  if (input) input.value = '';
  state.chatHistory.push({ role: 'user', content: text });
  renderChatMsgs();

  // Instant spoken audio filler phrase to eliminate thinking silence
  // (disabled — concurrent TTS call causes mobile audio conflicts)
  // speakInstantFiller();

  const personaName = (state.chatPersona === 'sonu') ? 'Sonu' : 'Khushi';
  
  // Create a placeholder for the live streaming response
  const msgsEl = document.getElementById('chat-msgs');
  const streamId = 'stream-' + Date.now();
  if (msgsEl) {
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg ai';
    msgEl.id = streamId;
    msgEl.innerHTML = `<div class="spinner" style="display:inline-block;width:12px;height:12px;border-width:2px;margin-right:6px"></div><span style="opacity:0.6">${personaName} is typing...</span>`;
    msgsEl.appendChild(msgEl);
    if (typeof scrollChatToBottom === 'function') scrollChatToBottom();
  }

  try {
    const systemCtx = buildAppPersonalContext();

    const contents = state.chatHistory.map((m, i) => ({
      role: m.role === 'assistant' ? 'model' : (m.role || 'user'),
      parts: m.parts ? m.parts : [{ text: i === 0 && m.role === 'user' ? systemCtx + m.content : m.content }]
    }));

    contents[contents.length - 1].parts[0].text +=
      '\n\n[After your response add exactly two lines at the end:' +
      '\nINSIGHT: <one line key takeaway or NONE>' +
      '\nTODOS: <comma-separated tasks to add, or NONE>' +
      '\nIMPORTANT: Only set TODOS to something other than NONE if the user EXPLICITLY asked you to add, create, or remind them of a specific task. Never auto-generate todos from the conversation context.]';

    const onChunk = (partialText) => {
      const lines = partialText.split('\n');
      const insightIdx = lines.findIndex(l => l.trim().startsWith('INSIGHT:'));
      const todosIdx   = lines.findIndex(l => l.trim().startsWith('TODOS:'));
      const markerIdx = [insightIdx, todosIdx].filter(i => i > -1).reduce((a, b) => Math.min(a, b), lines.length);
      const displayResponse = lines.slice(0, markerIdx).join('\n').trim();
      
      const el = document.getElementById(streamId);
      if (el) {
        el.innerHTML = displayResponse.replace(/\n/g, '<br>') || '<span style="opacity:0.6">typing...</span>';
        if (typeof scrollChatToBottom === 'function') scrollChatToBottom();
      }
    };

    const raw = await (typeof callGeminiStream === 'function' ? callGeminiStream(contents, onChunk) : callGemini(contents));

    const lines = raw.split('\n');
    const insightIdx = lines.findIndex(l => l.trim().startsWith('INSIGHT:'));
    const todosIdx   = lines.findIndex(l => l.trim().startsWith('TODOS:'));

    // Response is everything before the first marker line
    const markerIdx = [insightIdx, todosIdx].filter(i => i > -1).reduce((a, b) => Math.min(a, b), lines.length);
    const response = lines.slice(0, markerIdx).join('\n').trim();

    const insightLine = insightIdx > -1 ? lines[insightIdx].replace('INSIGHT:', '').trim() : null;
    const todosRaw    = todosIdx   > -1 ? lines[todosIdx].replace('TODOS:', '').trim()   : null;

    const el = document.getElementById(streamId);
    if (el) el.innerHTML = response.replace(/\n/g, '<br>');

    state.chatHistory.push({ role: 'assistant', content: response });

    // Save insight to journal
    if (insightLine && insightLine !== 'NONE' && !insightLine.startsWith('NONE')) {
      if (!state.chatInsights) state.chatInsights = [];
      state.chatInsights.push({ date: state.selectedDate, text: insightLine });

      if (!state.journal) state.journal = {};
      if (!state.journal[state.selectedDate]) state.journal[state.selectedDate] = [];
      state.journal[state.selectedDate].push({
        id: Date.now() + '',
        text: `💬 ${insightLine}`,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        source: 'chat',
        todos: []
      });
    }

    // Auto-add detected to-dos to state.todos
    if (todosRaw && todosRaw !== 'NONE' && !todosRaw.startsWith('NONE')) {
      const detectedTodos = todosRaw
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 2 && t.toLowerCase() !== 'none');

      let addedCount = 0;
      detectedTodos.forEach(todoText => {
        // Avoid duplicate todos — check both exact and partial/similar matches
        const tLow = todoText.toLowerCase().trim();
        const alreadyExists = (state.todos || []).some(t => {
          const eLow = t.text.toLowerCase().trim();
          // Exact match OR one contains the other (handles rephrasing like "Exercise" vs "Exercise daily")
          return eLow === tLow || eLow.includes(tLow) || tLow.includes(eLow);
        });
        if (!alreadyExists) {
          state.todos = state.todos || [];
          state.todos.push({
            id: Date.now() + Math.random() + '',
            text: todoText,
            done: false,
            createdDate: state.selectedDate,
            source: 'khushi'
          });
          addedCount++;
        }
      });

      if (addedCount > 0) {
        if (typeof updateTodoBadge === 'function') updateTodoBadge();
        if (typeof updateAlertBar === 'function') updateAlertBar();
        if (typeof showToast === 'function') showToast(`✅ Khushi added ${addedCount} task${addedCount > 1 ? 's' : ''} to your To-Do`);
      }
    }

    if (typeof saveState === 'function') saveState();
    renderChatMsgs();
    if (typeof scrollChatToBottom === 'function') scrollChatToBottom();

    // Speak Khushi's response aloud
    speakAIResponse(response);

  } catch(e) {
    const el = document.getElementById(streamId);
    if (el) el.remove();
    state.chatHistory.pop();
    renderChatMsgs();
    console.error('Chat error full:', e);
    const msg =
      e.message?.includes('NETWORK_ERROR') ? '📵 No internet or API blocked. Check connection.' :
      e.message?.includes('API_KEY') || e.message?.includes('API key') ? '❌ Invalid API key. Check ⚙️ Settings.' :
      e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('Rate') ? '⏳ Rate limited. Trying fallback model...' :
      e.message?.includes('No API key') ? '⚙️ Add your Gemini API key in Settings first.' :
      `❌ ${e.message}`;
    if (typeof showToast === 'function') showToast(msg);
  }
}
