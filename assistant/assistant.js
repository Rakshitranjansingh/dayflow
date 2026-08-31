/* ============================================================
   AI PERSONAL VOICE ASSISTANT MODULE (KHUSHI & SONU)
   ============================================================ */

let chatSpeechRecognition = null;
let chatIsListening = false;
let currentUtterance = null;

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

  return `
    <div class="chat-mode-bar">
      <div>
        <label style="font-size:11.5px;font-weight:700;color:var(--text2);margin-right:6px">Persona:</label>
        <select class="chat-persona-select" id="chat-persona-select" onchange="setChatPersona(this.value)">
          <option value="khushi" ${activePersona==='khushi'?'selected':''}>👩 Khushi (Female)</option>
          <option value="sonu" ${activePersona==='sonu'?'selected':''}>👨 Sonu (Male)</option>
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
      <button class="btn btn-secondary btn-sm" onclick="testChatConnection()">🔍 Test Connection</button>
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

function speakInstantFiller() {
  if (!('speechSynthesis' in window) || state.autoSpeak === false) return;

  try {
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
  } catch(e) {}

  const persona = state.chatPersona || 'khushi';
  const name = persona === 'sonu' ? 'Sonu' : 'Khushi';

  const khushiFillers = [
    "Acha, let me check that for you...",
    "Sure, checking your details now...",
    "Hmm, let me look into this for you...",
    "One second, checking that for you..."
  ];
  const sonuFillers = [
    "Ha, ek sec check karta hu...",
    "Sure, let me check that for you...",
    "Hmm, give me a moment, checking this...",
    "Right away, let me check..."
  ];

  const arr = persona === 'sonu' ? sonuFillers : khushiFillers;
  const fillerText = arr[Math.floor(Math.random() * arr.length)];

  const utterance = new SpeechSynthesisUtterance(fillerText);
  utterance.lang = 'en-IN';
  utterance.rate = 1.05;
  utterance.pitch = persona === 'khushi' ? 1.15 : 0.9;

  const voices = (window.speechSynthesis.getVoices() || []);
  const matched = voices.find(v => (v.lang.includes('en-IN') || v.lang.includes('hi-IN')) && 
    (persona === 'khushi' ? (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('neerja')) : (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('prabhat'))));
  if (matched) utterance.voice = matched;

  const equalizer = document.getElementById('chat-speech-equalizer');
  const label = document.getElementById('chat-speech-label');
  if (equalizer) equalizer.style.display = 'flex';
  if (label) label.textContent = `🔊 ${name} is checking...`;

  window.speechSynthesis.speak(utterance);
}

function testVoiceSynthesis() {
  const persona = state.chatPersona || 'khushi';
  const sample = persona === 'sonu'
    ? "Namaste! Main Sonu hu, aapka AI Personal Assistant."
    : "Namaste! Main Khushi hu, aapki AI Personal Assistant.";
  speakAIResponse(sample);
}

function speakAIResponse(text) {
  if (!('speechSynthesis' in window) || state.autoSpeak === false) return;

  try {
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
  } catch(e) {}

  let cleanText = text
    .replace(/INSIGHT:.*$/gm, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[*#_~`>]/g, '')
    .replace(/--+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'en-IN';

  const persona = state.chatPersona || 'khushi';
  const name = persona === 'sonu' ? 'Sonu' : 'Khushi';

  if (persona === 'khushi') {
    utterance.pitch = 1.15;
    utterance.rate = 1.0;
  } else {
    utterance.pitch = 0.9;
    utterance.rate = 0.98;
  }

  const voices = (window.speechSynthesis.getVoices() || []);
  const indianVoices = voices.filter(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN') || v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('hindi'));

  if (persona === 'khushi') {
    const femaleVoice = indianVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('neerja') || v.name.toLowerCase().includes('heera') || v.name.toLowerCase().includes('veena'));
    if (femaleVoice) utterance.voice = femaleVoice;
    else if (indianVoices.length > 0) utterance.voice = indianVoices[0];
  } else {
    const maleVoice = indianVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('prabhat') || v.name.toLowerCase().includes('ravi') || v.name.toLowerCase().includes('google'));
    if (maleVoice) utterance.voice = maleVoice;
    else if (indianVoices.length > 0) utterance.voice = indianVoices[indianVoices.length - 1];
  }

  const equalizer = document.getElementById('chat-speech-equalizer');
  const label = document.getElementById('chat-speech-label');
  if (equalizer) equalizer.style.display = 'flex';
  if (label) label.textContent = `🔊 ${name} Speaking...`;

  utterance.onend = () => { if (equalizer) equalizer.style.display = 'none'; };
  utterance.onerror = () => { if (equalizer) equalizer.style.display = 'none'; };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function stopAISpeech() {
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
