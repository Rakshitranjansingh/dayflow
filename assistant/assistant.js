/* ============================================================
   AI PERSONAL VOICE ASSISTANT MODULE (KHUSHI & SONU)
   ============================================================ */

let chatSpeechRecognition = null;
let chatIsListening = false;
let currentUtterance = null;

var currentChatTabMode = 'assistant'; // 'assistant' or 'smart_call'
var isNativeCallActive = false;
var nativeCallTimerInterval = null;
var nativeCallDurationSecs = 0;
var activeSoundscape = 'clear'; // 'clear', 'phone', 'cafe'
var backgroundAudioObj = null;

// ─── MOBILE AUDIO UNLOCK ─────────────────────────────────────────────────────
// iOS Safari and Android Chrome block audio.play() called after async fetch.
// We keep a single AudioContext that gets unlocked on the FIRST user tap,
// then stays usable forever — even after async API calls.
var _sharedAudioCtx = null;

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
    if (ctx.state === 'suspended') ctx.resume();
    // Play a zero-duration silent buffer to fully unlock on iOS
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch(e) {}
}

// Also unlock on any first touch/click anywhere on the page
document.addEventListener('touchstart', unlockAudioContext, { once: true, passive: true });
document.addEventListener('click',      unlockAudioContext, { once: true, passive: true });

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
1. Answer any question about the user's stats, sleep, calories, expenses, todos, or learning with precise numbers from the snapshot above.
2. Answer any general knowledge, latest news, programming, web search, or general info query asked by the user intelligently and clearly.
3. Keep spoken responses concise (2-4 sentences max per reply) so verbal voice conversations flow smoothly.
4. Maintain a warm, friendly Indian Hinglish tone like a real personal assistant.]\n\n`;
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
    : `<span style="color:var(--red);font-size:11px">● No API key — <span style="cursor:pointer;text-decoration:underline" onclick="closePanel();openPanel('settings')">Add in Settings</span></span>`;

  const activePersona = state.chatPersona || 'khushi';
  const autoSpeakChecked = state.autoSpeak !== false ? 'checked' : '';

  const tabsHeader = `
    <div style="display:flex;gap:6px;margin-bottom:10px;background:var(--card-bg);padding:4px;border-radius:10px;border:1px solid var(--border)">
      <button class="btn ${currentChatTabMode==='assistant'?'btn-primary':'btn-secondary'}" style="flex:1;font-size:11.5px;padding:6px 10px" onclick="switchChatTabMode('assistant')">
        💬 Chat Assistant
      </button>
      <button class="btn ${currentChatTabMode==='smart_call'?'btn-primary':'btn-secondary'}" style="flex:1;font-size:11.5px;padding:6px 10px" onclick="switchChatTabMode('smart_call')">
        📞 Voice Call Companion
      </button>
    </div>
  `;

  if (currentChatTabMode === 'smart_call') {
    return renderNativeCallView(apiStatus, activePersona);
  }

  return `
    ${tabsHeader}
    <div class="chat-mode-bar">
      <div>
        <label style="font-size:11.5px;font-weight:700;color:var(--text2);margin-right:6px">Persona:</label>
        <select class="chat-persona-select" id="chat-persona-select" onchange="setChatPersona(this.value)">
          <option value="khushi" ${activePersona==='khushi'?'selected':''}>👩 Khushi (Female)</option>
          <option value="sonu" ${activePersona==='sonu'?'selected':''}>👨 Sonu (Male)</option>
          <option value="aanya" ${activePersona==='aanya'?'selected':''}>👩 Aanya Sharma (Cloud Kitchen)</option>
        </select>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:10.5px" onclick="testVoiceSynthesis()">🔊 Test Voice</button>
        <label style="font-size:11px;color:var(--text2);display:flex;align-items:center;gap:4px;cursor:pointer">
          <input type="checkbox" ${autoSpeakChecked} onchange="toggleAutoSpeak(this.checked)"> 🔊 Auto-Speak
        </label>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      ${apiStatus}
      <button class="btn btn-secondary btn-sm" onclick="testChatConnection()">🔍 Test Key</button>
    </div>

    <div class="chat-messages" id="chat-msgs">${msgs || '<div class="empty-state"><div class="e-icon">🎙️</div><div class="e-text">Talk to Khushi or Sonu! Ask about your stats, tasks, habits, learning, or any web info.</div></div>'}</div>

    <div id="chat-speech-equalizer" class="chat-equalizer" style="display:none;margin-bottom:6px">
      <span id="chat-speech-label">🔊 AI Speaking...</span>
      <div class="chat-voice-wave">
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
        <div class="chat-wave-bar"></div>
      </div>
      <button class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:10px" onclick="stopAISpeech()">⏹️ Stop</button>
    </div>

    <div class="chat-voice-action-box">
      <button class="chat-voice-btn" id="chat-voice-btn" onclick="toggleChatVoiceInput()">
        🎙️ Speak to Assistant
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
      <input class="input" id="chat-input" placeholder="Type or speak your query..." style="flex:1" onkeydown="if(event.key==='Enter')sendChat()">
      <button class="btn btn-primary" onclick="sendChat()">→</button>
    </div>
    <div class="chat-insight-note">💡 Full live app awareness + Web knowledge · Key insights saved to journal</div>
  `;
}

function renderNativeCallView(apiStatus, activePersona) {
  const name = activePersona === 'sonu' ? 'Sonu' : (activePersona === 'aanya' ? 'Aanya Sharma' : 'Khushi');
  const role = activePersona === 'sonu' ? 'Daily Coach & Mentor' : (activePersona === 'aanya' ? 'Cloud Kitchen Dreamer • Thane' : 'AI Personal Voice Companion');
  const avatar = activePersona === 'sonu' ? '👨' : (activePersona === 'aanya' ? '👩‍🍳' : '👩');

  const formattedTimer = formatCallTimer(nativeCallDurationSecs);

  return `
    <div style="display:flex;gap:6px;margin-bottom:10px;background:var(--card-bg);padding:4px;border-radius:10px;border:1px solid var(--border)">
      <button class="btn ${currentChatTabMode==='assistant'?'btn-primary':'btn-secondary'}" style="flex:1;font-size:11.5px;padding:6px 10px" onclick="switchChatTabMode('assistant')">
        💬 Chat Assistant
      </button>
      <button class="btn ${currentChatTabMode==='smart_call'?'btn-primary':'btn-secondary'}" style="flex:1;font-size:11.5px;padding:6px 10px" onclick="switchChatTabMode('smart_call')">
        📞 Voice Call Companion
      </button>
    </div>

    <div class="chat-mode-bar" style="margin-bottom:8px">
      <div>
        <label style="font-size:11.5px;font-weight:700;color:var(--text2);margin-right:6px">Persona:</label>
        <select class="chat-persona-select" id="chat-persona-select" onchange="setChatPersona(this.value)">
          <option value="khushi" ${activePersona==='khushi'?'selected':''}>👩 Khushi (Female)</option>
          <option value="sonu" ${activePersona==='sonu'?'selected':''}>👨 Sonu (Male)</option>
          <option value="aanya" ${activePersona==='aanya'?'selected':''}>👩 Aanya Sharma (Cloud Kitchen)</option>
        </select>
      </div>
      ${apiStatus}
    </div>

    <div class="assistant-call-card">
      <div style="font-size:48px;line-height:1;margin-bottom:4px">${avatar}</div>
      <div>
        <h3 style="font-size:18px;font-weight:800;color:var(--text);margin:0">${name}</h3>
        <p style="font-size:12px;color:var(--text2);margin:2px 0 0 0">${role}</p>
      </div>

      <div class="assistant-call-timer" id="call-timer-display">${isNativeCallActive ? formattedTimer : '00:00'}</div>

      <div class="visualizer-orb ${isNativeCallActive ? 'speaking' : ''}" id="call-visualizer-orb">
        <div style="font-size:24px">${isNativeCallActive ? '🎙️' : '💤'}</div>
      </div>

      <div style="font-size:12px;color:var(--text3);" id="call-status-label">
        ${isNativeCallActive ? '🟢 Live Voice Conversation Active' : 'Tap Start Call to speak out loud'}
      </div>

      <div class="soundscape-pill-row">
        <div class="soundscape-pill ${activeSoundscape==='clear'?'active':''}" onclick="setSoundscape('clear')">✨ Clear HD Voice</div>
        <div class="soundscape-pill ${activeSoundscape==='phone'?'active':''}" onclick="setSoundscape('phone')">📞 Phone Call</div>
        <div class="soundscape-pill ${activeSoundscape==='cafe'?'active':''}" onclick="setSoundscape('cafe')">☕ Cozy Cafe</div>
      </div>

      <div style="display:flex;gap:12px;width:100%;margin-top:8px">
        ${!isNativeCallActive ? `
          <button class="btn btn-primary" style="flex:1;padding:12px;font-size:14px;border-radius:12px;" onclick="startNativeVoiceCall()">
            📞 Start Voice Call
          </button>
        ` : `
          <button class="btn" style="flex:1;padding:12px;font-size:14px;border-radius:12px;background:var(--red);color:#fff" onclick="stopNativeVoiceCall()">
            ⏹️ End Call
          </button>
        `}
      </div>
    </div>
  `;
}

function formatCallTimer(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function setSoundscape(val) {
  activeSoundscape = val;
  if (backgroundAudioObj) {
    backgroundAudioObj.pause();
    backgroundAudioObj = null;
  }
  if (val === 'cafe') {
    backgroundAudioObj = new Audio('https://cdn.pixabay.com/download/audio/2022/04/18/audio_097a610557.mp3?filename=ambience-of-a-coffee-shop-10901.mp3');
    backgroundAudioObj.loop = true;
    backgroundAudioObj.volume = 0.15;
    backgroundAudioObj.play().catch(() => {});
  }
  if (typeof showToast === 'function') showToast(`Soundscape set to ${val === 'cafe' ? 'Cozy Cafe' : (val === 'phone' ? 'Phone Call Filter' : 'Clear HD Voice')}`);
  switchChatTabMode('smart_call');
}

function startNativeVoiceCall() {
  isNativeCallActive = true;
  nativeCallDurationSecs = 0;

  if (nativeCallTimerInterval) clearInterval(nativeCallTimerInterval);
  nativeCallTimerInterval = setInterval(() => {
    nativeCallDurationSecs++;
    const timerEl = document.getElementById('call-timer-display');
    if (timerEl) timerEl.textContent = formatCallTimer(nativeCallDurationSecs);
  }, 1000);

  const persona = state.chatPersona || 'khushi';
  const openingGreeting = persona === 'sonu'
    ? "Namaste! Main Sonu hu. Aap bataiye, aaj mai aapki kaise help kar sakta hu?"
    : (persona === 'aanya'
      ? "Hey! Main Aanya hu. Cloud Kitchen updates discuss kare ya aapke daily goals check kare?"
      : "Namaste! Main Khushi hu. Aapke saare stats, tasks aur habit reports ready hain. Bataiye kya check karna hai?");

  speakAIResponse(openingGreeting);
  setTimeout(() => {
    if (isNativeCallActive) toggleChatVoiceInput();
  }, 3500);

  switchChatTabMode('smart_call');
}

function stopNativeVoiceCall() {
  isNativeCallActive = false;
  if (nativeCallTimerInterval) {
    clearInterval(nativeCallTimerInterval);
    nativeCallTimerInterval = null;
  }
  if (backgroundAudioObj) {
    backgroundAudioObj.pause();
    backgroundAudioObj = null;
  }
  stopAISpeech();
  stopChatVoiceInput();
  if (typeof showToast === 'function') showToast('Voice Call Ended');
  switchChatTabMode('smart_call');
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
async function speakWithGeminiTTS(text, persona) {
  const activeKey = typeof getActiveApiKey === 'function' ? getActiveApiKey() : state.apiKey;
  if (!activeKey) throw new Error('No API key');

  // Khushi = warm Indian female voice; Sonu = natural Indian male voice
  const voiceName = persona === 'khushi' ? 'Aoede' : 'Puck';

  const body = {
    contents: [{ parts: [{ text: text.slice(0, 600) }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } }
      }
    }
  };

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${activeKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  if (!r.ok) throw new Error(`Gemini TTS ${r.status}`);
  const data = await r.json();

  const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error('No audio data from Gemini TTS');

  // Gemini TTS returns raw PCM (LINEAR16, 24kHz, mono) — wrap in WAV header
  const pcm = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;

  // Use AudioContext to play — bypasses mobile autoplay restriction
  // (AudioContext was already unlocked by the user tap via unlockAudioContext())
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();

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
  speakInstantFiller();

  const personaName = (state.chatPersona === 'sonu') ? 'Sonu' : 'Khushi';
  const loadEl = document.createElement('div');
  loadEl.className = 'loading';
  loadEl.innerHTML = `<div class="spinner"></div> ${personaName} is checking...`;
  const msgsEl = document.getElementById('chat-msgs');
  if (msgsEl) msgsEl.appendChild(loadEl);
  if (typeof scrollChatToBottom === 'function') scrollChatToBottom();

  try {
    const systemCtx = buildAppPersonalContext();

    const contents = state.chatHistory.map((m, i) => ({
      role: m.role === 'assistant' ? 'model' : (m.role || 'user'),
      parts: m.parts ? m.parts : [{ text: i === 0 && m.role === 'user' ? systemCtx + m.content : m.content }]
    }));

    contents[contents.length - 1].parts[0].text +=
      '\n\n[After your response add on a new line: INSIGHT: <one line key takeaway or NONE>]';

    const raw = await callGemini(contents);

    const lines = raw.split('\n');
    const insightIdx = lines.findIndex(l => l.trim().startsWith('INSIGHT:'));
    const response = insightIdx > -1
      ? lines.slice(0, insightIdx).join('\n').trim()
      : raw.trim();
    const insightLine = insightIdx > -1 ? lines[insightIdx].replace('INSIGHT:', '').trim() : null;

    if (loadEl.parentNode) loadEl.remove();
    state.chatHistory.push({ role: 'assistant', content: response });

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

    if (typeof saveState === 'function') saveState();
    renderChatMsgs();
    if (typeof scrollChatToBottom === 'function') scrollChatToBottom();

    // Speak AI response in natural Indian Voice
    speakAIResponse(response);

  } catch(e) {
    if (loadEl.parentNode) loadEl.remove();
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
