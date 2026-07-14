// ============================================================
// CONTENT GENERATOR PLATFORM ENGINE
// ============================================================

function renderContentPanel() {
  const apiActive = getActiveApiKey()
    ? `<span style="color:var(--green);font-size:11px">● API key active</span>`
    : `<span style="color:var(--red);font-size:11px">● No API key — <span style="cursor:pointer;text-decoration:underline" onclick="closePanel();openPanel('settings')">Add in Settings</span></span>`;

  return `
    <div class="content-tool-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        ${apiActive}
      </div>

      <div style="margin-bottom:10px">
        <label class="builder-label" style="display:block;margin-bottom:4px">Channel Name / Motto Line (Optional)</label>
        <input class="input" id="c-channel-info" placeholder="e.g. BeCreator, Tech Simplified..." style="width:100%;font-size:12px;padding:6px 8px">
      </div>

      <div>
        <label class="builder-label" style="display:block;margin-bottom:6px">Topic or Paste Your Own Script</label>
        <textarea class="input" id="c-topic" rows="3" placeholder="Type a topic to generate, or paste your own script text directly..." style="width:100%;resize:vertical;font-family:inherit;font-size:12px;padding:8px"></textarea>
        <div style="font-size:10px;color:var(--text3);margin-top:4px">Enter a topic to generate a script, or paste your own script text to convert it to audio.</div>
      </div>
      
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-primary" id="c-generate-btn" onclick="generateContentScript('standard')" style="flex:1;height:40px;font-weight:600;font-size:11px;padding:0 4px">
          🎬 2-Min Script
        </button>
        <button class="btn btn-primary" id="c-dramatic-btn" onclick="generateContentScript('dramatic')" style="flex:1;height:40px;font-weight:600;font-size:11px;padding:0 4px;background:linear-gradient(135deg, #ff007f, #7f00ff);border:none;color:#ffffff">
          🎭 Dramatic Script
        </button>
      </div>
      <button class="btn btn-secondary" id="c-own-script-btn" onclick="addOwnScript()" style="width:100%;height:34px;font-weight:600;margin-top:8px;font-size:11px">
        ✍️ Add Own Script
      </button>
      
      <div id="c-loading" style="display:none;margin-top:20px;text-align:center;color:var(--text2)">
        <div class="spinner" style="margin:0 auto 10px"></div>
        <div id="c-loading-text">Searching trending news...</div>
      </div>
      
      <div id="c-result-container" style="display:none;margin-top:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:12px;font-weight:700;color:var(--text2)" id="c-viewing-topic">Generated Script</div>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="content-read-toggle-btn" id="c-read-toggle-btn" onclick="toggleViewedScriptRead()">Mark Read</button>
            <button class="btn btn-secondary btn-sm" onclick="copyContentScript()">📋 Copy</button>
          </div>
        </div>
        <div class="content-script-box" id="c-script-box" style="margin-bottom:12px"></div>

        <!-- Audio Synthesizer Panel -->
        <div class="content-audio-controls">
          <div style="font-size:11px;font-weight:700;color:var(--text2);display:flex;justify-content:space-between;align-items:center">
            <span>🔊 Gemini Speech Narrator</span>
            <span id="c-audio-counter" style="color:var(--accent);font-size:10px;font-weight:700">Generations: 0/10</span>
          </div>
          
          <div style="font-size:11px;color:var(--text2);display:flex;justify-content:space-between;align-items:center;margin-top:-4px">
            <span>Voice Gender</span>
            <span class="content-audio-status-text" id="c-audio-status">Ready</span>
          </div>
          
          <div class="content-audio-gender-selector">
            <button class="content-gender-btn active" id="c-voice-female" onclick="selectContentVoiceGender('female')">👩 Female (Kore)</button>
            <button class="content-gender-btn" id="c-voice-male" onclick="selectContentVoiceGender('male')">👨 Male (Schedar)</button>
          </div>
          
          <canvas id="c-audio-canvas" height="40" style="width:100%;background:#ffffff;border-radius:4px;border:1px solid var(--border);display:block"></canvas>
          
          <div class="content-audio-playback-row">
            <div class="content-playback-btns">
              <button class="btn btn-primary btn-sm" id="c-audio-play" onclick="playOrGenerateAudio()" style="width:80px">▶ Listen</button>
              <button class="btn btn-secondary btn-sm" id="c-audio-pause" onclick="pauseContentAudio()" style="display:none;width:80px">⏸ Pause</button>
              <button class="btn btn-secondary btn-sm" id="c-audio-stop" onclick="stopContentAudio()" style="display:none;width:80px">⏹ Stop</button>
              <button class="btn btn-secondary btn-sm" id="c-audio-download" onclick="downloadCurrentAudioFile()" style="display:none">📥 Download</button>
            </div>
            <div>
              <select class="content-audio-speed-select" id="c-audio-speed" onchange="updateContentAudioSpeed()">
                <option value="0.9">0.9x Speed</option>
                <option value="0.95">0.95x Speed</option>
                <option value="1.0" selected>1.0x Speed</option>
                <option value="1.05">1.05x Speed</option>
                <option value="1.1">1.1x Speed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--text)">Recent Scripts</div>
        <div id="c-history-list" style="display:flex;flex-direction:column;gap:8px"></div>
      </div>
    </div>
  `;
}

function initContentPanel() {
  if (typeof state === 'undefined') return;
  state.contentScripts = state.contentScripts || [];
  window._contentVoiceGender = 'female'; // default to Zephyr (Female)
  window._audioPlayerNode = null;
  window._currentAudioBlobUrl = null;
  window._currentAudioBlob = null;
  window._currentAudioFilename = '';
  
  // Persistent in-session cache for generated audio
  window._audioCache = window._audioCache || {};
  
  window._audioCtx = null;
  window._audioAnalyser = null;
  window._audioSource = null;
  window._audioVisualId = null;

  // Initialize/Reset daily counter
  const today = getTtsTodayStr();
  state.ttsCounter = state.ttsCounter || { date: today, count: 0 };
  if (state.ttsCounter.date !== today) {
    state.ttsCounter = { date: today, count: 0 };
    saveState();
  }

  renderContentHistory();
  
  // Restore channel name/motto if it exists in state
  const channelEl = document.getElementById('c-channel-info');
  if (channelEl && state.channelInfo) {
    channelEl.value = state.channelInfo;
  }
}

function getTtsTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function updateTtsCounterUI() {
  if (typeof state === 'undefined') return;
  const today = getTtsTodayStr();
  state.ttsCounter = state.ttsCounter || { date: today, count: 0 };
  if (state.ttsCounter.date !== today) {
    state.ttsCounter = { date: today, count: 0 };
    saveState();
  }

  const counterEl = document.getElementById('c-audio-counter');
  if (counterEl) {
    counterEl.textContent = `Generations: ${state.ttsCounter.count}/10`;
    if (state.ttsCounter.count >= 10) {
      counterEl.style.color = 'var(--red)';
    } else {
      counterEl.style.color = 'var(--accent)';
    }
  }
}

async function callGeminiWithSearch(prompt, modelIndex = 0) {
  const apiKey = getActiveApiKey();
  const models = typeof getModelList === 'function' ? getModelList() : ['gemini-2.0-flash'];
  if (modelIndex >= models.length) {
    throw new Error('All models rate limited or unsupported. Try again in a moment.');
  }

  const model = models[modelIndex];
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      })
    });
  } catch (netErr) {
    console.error(`Network error calling ${model}:`, netErr);
    if (modelIndex + 1 < models.length) {
      return callGeminiWithSearch(prompt, modelIndex + 1);
    }
    throw netErr;
  }

  if (response.status === 429 && modelIndex + 1 < models.length) {
    console.warn(`${model} rate limited → trying fallback...`);
    return callGeminiWithSearch(prompt, modelIndex + 1);
  }
  if (response.status >= 500 && modelIndex + 1 < models.length) {
    console.warn(`${model} server error (${response.status}) → trying fallback...`);
    return callGeminiWithSearch(prompt, modelIndex + 1);
  }
  if (!response.ok) {
    if ((response.status === 404 || response.status === 400) && modelIndex + 1 < models.length) {
      console.warn(`${model} unsupported status (${response.status}) → trying fallback...`);
      return callGeminiWithSearch(prompt, modelIndex + 1);
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API Error ${response.status}`);
  }

  return response.json();
}

async function generateContentScript(style = 'standard') {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Please configure your Gemini API Key in Settings first.');
    }
    return;
  }

  const topicInput = document.getElementById('c-topic');
  const topic = topicInput ? topicInput.value.trim() : '';
  const channelEl = document.getElementById('c-channel-info');
  const channelInfo = channelEl ? channelEl.value.trim() : '';

  // Save channel name/motto to state so it persists
  if (channelEl) {
    state.channelInfo = channelInfo;
    saveState();
  }

  const generateBtn = document.getElementById('c-generate-btn');
  const dramaticBtn = document.getElementById('c-dramatic-btn');
  const loadingDiv = document.getElementById('c-loading');
  const loadingText = document.getElementById('c-loading-text');
  const resultDiv = document.getElementById('c-result-container');
  
  if (generateBtn) generateBtn.disabled = true;
  if (dramaticBtn) dramaticBtn.disabled = true;
  if (loadingDiv) loadingDiv.style.display = 'block';
  if (resultDiv) resultDiv.style.display = 'none';
  if (loadingText) loadingText.textContent = 'Searching for trending news on the web...';

  let brandingInstructions = '';
  if (channelInfo) {
    brandingInstructions = `- Seamlessly integrate the channel name or motto line "${channelInfo}" in the script's intro or outro CTA.`;
  }

  let prompt = '';
  if (style === 'dramatic') {
    prompt = `Generate a highly dramatic, cinematic, and suspenseful 2-minute video script for a trending news topic.
Topic/Keyword requested: ${topic || 'Find the latest major hot trending news of today using Google Search grounding.'}
${brandingInstructions}

CRITICAL FORMATTING & STYLE RULES:
- The script MUST start with a powerful, hyper-dramatic hook in the FIRST 2 seconds:
  ⏱️ 0:00-0:02 | [DRAMATIC HOOK] - 2-second punchy hook.
- Make the tone intense, cinematic, fast-paced, and high-energy.
- The script must be in natural "Hinglish" as spoken by modern Indian creators (e.g. YouTube/Instagram Reels creators).
- Hindi words MUST be written in Devanagari script (e.g., नमस्कार, आज, बात, काम).
- English words MUST be written in English (Roman script) (e.g., technology, mobile, trending, startup).
- Do NOT write English words in Devanagari (e.g., write "mobile" instead of "मोबाइल").
- Do NOT write Hindi words in Roman script (e.g., write "आज" instead of "aaj").
- Strictly base the script on true, verified FACTS. Keep the facts accurate.
- Structure it with timestamps for a 2-minute video:
  ⏱️ 0:00-0:02 | [DRAMATIC HOOK] - 2-second punchy hook (MUST capture attention instantly!)
  ⏱️ 0:02-0:15 | [INTRO] - Quick dramatic intro introducing the topic and branding
  ⏱️ 0:15-0:45 | [THE NEWS] - Core dramatic news facts and revelations
  ⏱️ 0:45-1:15 | [DEEPER ANALYSIS] - Why this matters/shocking insights
  ⏱️ 1:15-1:45 | [IMPACT & FUTURE] - Future projection/consequences of this trend
  ⏱️ 1:45-2:00 | [OUTRO + CTA] - Final dramatic question, like/subscribe/comment CTA

Return ONLY the script formatted with time markers.`;
  } else {
    prompt = `Generate a highly engaging 2-minute video script for a trending news topic.
Topic/Keyword requested: ${topic || 'Find the latest major hot trending news of today using Google Search grounding.'}
${brandingInstructions}

CRITICAL LANGUAGE RULES:
- The script must be in natural "Hinglish" as spoken by modern Indian creators (e.g. YouTube/Instagram Reels creators).
- Hindi words MUST be written in Devanagari script (e.g., नमस्कार, आज, बात, काम).
- English words MUST be written in English (Roman script) (e.g., technology, mobile, trending, startup).
- Do NOT write English words in Devanagari (e.g., write "mobile" instead of "मोबाइल").
- Do NOT write Hindi words in Roman script (e.g., write "आज" instead of "aaj").
- Strictly base the script on true, verified FACTS. Keep the facts accurate.
- Make it highly engaging, conversational, and energetic with strong hooks.
- Structure it with timestamps for a 2-minute video.

Return ONLY the script formatted with time markers:
⏱️ 0:00-0:15 | [HOOK] - Strong opening hook
⏱️ 0:15-0:45 | [THE NEWS] - The core facts/news details
⏱️ 0:45-1:15 | [DEEPER ANALYSIS] - Why this matters/interesting insights
⏱️ 1:15-1:45 | [IMPACT & FUTURE] - Future projection/impact of this trend
⏱️ 1:45-2:00 | [OUTRO + CTA] - Final question, like/subscribe/comment CTA`;
  }

  try {
    const data = await callGeminiWithSearch(prompt);

    if (loadingText) loadingText.textContent = 'Writing Hinglish script...';
    
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No candidate responses returned.');
    
    const fullText = (candidate.content?.parts || []).map(p => p.text || '').join('\n');
    if (!fullText) throw new Error('Empty script text returned.');

    const displayTopic = (style === 'dramatic' ? '🎭 [Dramatic] ' : '') + (topic || 'Auto-Detected Trend');
    const newScript = {
      id: 'content_' + Date.now(),
      date: new Date().toLocaleString('en-IN'),
      topic: displayTopic,
      script: fullText,
      read: false // Default to unread!
    };

    state.contentScripts = state.contentScripts || [];
    state.contentScripts.unshift(newScript);
    if (state.contentScripts.length > 20) {
      state.contentScripts = state.contentScripts.slice(0, 20); // Keep last 20
    }
    
    saveState();
    triggerDriveSync();

    // Render results
    openHistoryScript(newScript.id);
    renderContentHistory();
  } catch(e) {
    console.error(e);
    if (typeof showToast === 'function') {
      showToast('❌ Script Generation Failed: ' + e.message);
    }
  } finally {
    if (generateBtn) generateBtn.disabled = false;
    if (dramaticBtn) dramaticBtn.disabled = false;
    if (loadingDiv) loadingDiv.style.display = 'none';
  }
}

function addOwnScript() {
  const textarea = document.getElementById('c-topic');
  const text = textarea ? textarea.value.trim() : '';
  const channelEl = document.getElementById('c-channel-info');
  const channelInfo = channelEl ? channelEl.value.trim() : '';

  if (!text) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Please enter or paste your script first.');
    } else {
      alert('Please enter or paste your script first.');
    }
    return;
  }

  // Save channel name/motto to state so it persists
  if (channelEl) {
    state.channelInfo = channelInfo;
    saveState();
  }

  // Generate a snippet for the title/topic
  const firstLine = text.split('\n')[0].trim();
  const cleanFirstLine = firstLine.replace(/⏱️|\[[^\]]+\]|-/g, '').trim();
  const topicSnippet = cleanFirstLine.slice(0, 30) || 'Custom Script';
  const displayTopic = 'Custom: ' + topicSnippet + (text.length > 30 ? '...' : '');

  const newScript = {
    id: 'content_' + Date.now(),
    date: new Date().toLocaleString('en-IN'),
    topic: displayTopic,
    script: text,
    read: true // Mark as read since the user authored it
  };

  state.contentScripts = state.contentScripts || [];
  state.contentScripts.unshift(newScript);
  if (state.contentScripts.length > 20) {
    state.contentScripts = state.contentScripts.slice(0, 20); // Keep last 20
  }
  
  saveState();
  triggerDriveSync();

  // Clear the input area
  if (textarea) textarea.value = '';

  // Render results
  openHistoryScript(newScript.id);
  renderContentHistory();

  if (typeof showToast === 'function') {
    showToast('✍️ Custom script added!');
  }
}

function renderContentHistory() {
  const historyList = document.getElementById('c-history-list');
  if (!historyList) return;
  
  if (!state.contentScripts || state.contentScripts.length === 0) {
    historyList.innerHTML = '<div style="font-size:11px;color:var(--text3);text-align:center;padding:12px 0">No scripts generated yet.</div>';
    return;
  }

  historyList.innerHTML = state.contentScripts.map(item => {
    const unreadDot = !item.read ? `<span class="content-history-unread-dot" title="Unread"></span>` : '';
    const readStatusLabel = !item.read ? 'Unread' : 'Read';
    const statusClass = !item.read ? 'content-status-unread' : 'content-status-read';
    
    return `
      <div class="content-history-item" onclick="openHistoryScript('${item.id}')">
        <div class="content-history-title-row">
          <div style="display:flex;align-items:center;overflow:hidden;flex:1">
            ${unreadDot}
            <span class="content-history-title">${escapeContentHtml(item.topic)}</span>
          </div>
          <button class="content-history-delete" onclick="deleteHistoryScript('${item.id}', event)" title="Delete Script">✕</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
          <span class="content-history-date">${item.date}</span>
          <span class="${statusClass}" onclick="toggleHistoryRead('${item.id}', event)" style="cursor:pointer;padding:2px 6px;border-radius:10px;background:var(--surface2)">${readStatusLabel}</span>
        </div>
      </div>
    `;
  }).join('');
}

function openHistoryScript(id) {
  if (!state.contentScripts) return;
  const item = state.contentScripts.find(x => x.id === id);
  if (!item) return;

  // Stop active speech playback if user changes script
  stopContentAudio();

  // Mark as read automatically when opened
  if (!item.read) {
    item.read = true;
    saveState();
    triggerDriveSync();
    renderContentHistory();
  }

  window._viewingContentScriptId = id;
  window._lastGeneratedScript = item.script;
  window._viewingTopicName = item.topic;

  const resultDiv = document.getElementById('c-result-container');
  const scriptBox = document.getElementById('c-script-box');
  const topicTitle = document.getElementById('c-viewing-topic');
  const readToggleBtn = document.getElementById('c-read-toggle-btn');
  
  if (resultDiv && scriptBox) {
    resultDiv.style.display = 'block';
    scriptBox.textContent = item.script;
    if (topicTitle) topicTitle.textContent = item.topic;
    if (readToggleBtn) {
      readToggleBtn.textContent = 'Mark Unread';
      readToggleBtn.classList.toggle('active', true);
    }
    
    // Restore cached audio data for this script if it already exists
    const cached = window._audioCache ? window._audioCache[id] : null;
    if (cached) {
      window._currentAudioBlob = cached.blob;
      window._currentAudioBlobUrl = cached.url;
      window._currentAudioFilename = cached.filename;
      updateAudioControlsState('paused'); // Ready to resume
    } else {
      window._currentAudioBlob = null;
      window._currentAudioBlobUrl = null;
      window._currentAudioFilename = '';
      updateAudioControlsState('ended'); // Ready to listen
    }
    
    // Sync UI Counter
    updateTtsCounterUI();

    // Clear canvas visualizer to white
    const canvas = document.getElementById('c-audio-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function toggleViewedScriptRead() {
  const id = window._viewingContentScriptId;
  if (!id || !state.contentScripts) return;
  
  const item = state.contentScripts.find(x => x.id === id);
  if (item) {
    item.read = !item.read;
    saveState();
    triggerDriveSync();
    renderContentHistory();
    
    const readToggleBtn = document.getElementById('c-read-toggle-btn');
    if (readToggleBtn) {
      readToggleBtn.textContent = item.read ? 'Mark Unread' : 'Mark Read';
    }
  }
}

function toggleHistoryRead(id, event) {
  if (event) event.stopPropagation(); // Prevent opening/loading
  if (!state.contentScripts) return;
  
  const item = state.contentScripts.find(x => x.id === id);
  if (item) {
    item.read = !item.read;
    saveState();
    triggerDriveSync();
    renderContentHistory();
    
    // Update active script read status button if viewing this script
    if (window._viewingContentScriptId === id) {
      const readToggleBtn = document.getElementById('c-read-toggle-btn');
      if (readToggleBtn) {
        readToggleBtn.textContent = item.read ? 'Mark Unread' : 'Mark Read';
      }
    }
  }
}

function deleteHistoryScript(id, event) {
  if (event) event.stopPropagation(); // Prevent opening
  if (!state.contentScripts) return;

  const confirmDelete = confirm('Are you sure you want to delete this script?');
  if (!confirmDelete) return;

  // Stop active speech if deleting the viewed script
  if (window._viewingContentScriptId === id) {
    stopContentAudio();
  }

  // Clear cache for deleted item
  if (window._audioCache && window._audioCache[id]) {
    delete window._audioCache[id];
  }

  state.contentScripts = state.contentScripts.filter(x => x.id !== id);
  saveState();
  triggerDriveSync();
  renderContentHistory();

  // Hide viewer if deleting the currently viewed script
  if (window._viewingContentScriptId === id) {
    const resultDiv = document.getElementById('c-result-container');
    if (resultDiv) resultDiv.style.display = 'none';
    window._viewingContentScriptId = null;
    window._lastGeneratedScript = null;
    window._viewingTopicName = null;
  }
  
  if (typeof showToast === 'function') {
    showToast('🗑️ Script deleted');
  }
}

function copyContentScript() {
  const script = window._lastGeneratedScript;
  if (script) {
    navigator.clipboard.writeText(script).then(() => {
      if (typeof showToast === 'function') {
        showToast('Script copied!');
      }
    });
  }
}

function triggerDriveSync() {
  if (typeof state !== 'undefined' && state.driveConnected && typeof backupToDrive === 'function') {
    // Perform drive backup asynchronously without blocking UI
    backupToDrive().catch(err => console.error('Drive Content backup failed:', err));
  }
}

function escapeContentHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// AUDIO GENERATOR & MP3 EXPORT PIPELINE
// ============================================================

function selectContentVoiceGender(gender) {
  window._contentVoiceGender = gender;
  
  const btnFemale = document.getElementById('c-voice-female');
  const btnMale = document.getElementById('c-voice-male');
  
  if (btnFemale && btnMale) {
    btnFemale.classList.toggle('active', gender === 'female');
    btnMale.classList.toggle('active', gender === 'male');
  }
  
  // Clear audio cache for current script if gender is changed
  stopContentAudio();
  const id = window._viewingContentScriptId;
  if (id && window._audioCache) {
    delete window._audioCache[id];
  }
  window._currentAudioBlobUrl = null;
  window._currentAudioBlob = null;
  window._currentAudioFilename = '';
}

function cleanScriptForSpeech(scriptText) {
  if (!scriptText) return '';
  
  let lines = scriptText.split('\n');
  let cleanLines = [];
  
  for (let line of lines) {
    let trimmed = line.trim();
    // Skip the entire line if it contains the clock emoji, time layout, or segment braces
    if (
      trimmed.includes('⏱️') || 
      trimmed.match(/\d+:\d+-\d+:\d+/) || 
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      continue;
    }
    
    // Clean out other in-line bracket details (like stage actions)
    let cleaned = trimmed.replace(/\[[^\]]+\]/g, '').trim();
    if (cleaned.length > 0) {
      cleanLines.push(cleaned);
    }
  }
  
  return cleanLines.join('\n ');
}

function getOrCreateAudioPlayer() {
  if (!window._audioPlayerNode) {
    window._audioPlayerNode = new Audio();
    
    // Event listeners mapping to UI controls
    window._audioPlayerNode.onplay = () => {
      updateAudioControlsState('speaking');
      startVisualizer(window._audioPlayerNode);
    };
    window._audioPlayerNode.onpause = () => {
      updateAudioControlsState('paused');
    };
    window._audioPlayerNode.onended = () => {
      updateAudioControlsState('ended');
      stopVisualizer();
    };
    window._audioPlayerNode.onerror = (e) => {
      console.error('Audio node error:', e);
      updateAudioControlsState('ended');
      stopVisualizer();
      if (typeof showToast === 'function') showToast('❌ Audio playback failed.');
    };
  }
  return window._audioPlayerNode;
}

function playOrGenerateAudio() {
  const player = getOrCreateAudioPlayer();
  
  // If player is paused, just resume
  if (player.src && player.paused && player.currentTime > 0) {
    player.play();
    return;
  }
  
  // If we already have a generated MP3 Blob for the current script, reuse it!
  if (window._currentAudioBlobUrl) {
    player.src = window._currentAudioBlobUrl;
    player.play();
    return;
  }
  
  // Otherwise, make the API call to generate audio
  // Check the daily generations limit constraint first!
  const today = getTtsTodayStr();
  state.ttsCounter = state.ttsCounter || { date: today, count: 0 };
  if (state.ttsCounter.date !== today) {
    state.ttsCounter = { date: today, count: 0 };
    saveState();
  }

  if (state.ttsCounter.count >= 10) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Daily limit of 10 speech generations reached.');
    } else {
      alert('Daily limit of 10 speech generations reached.');
    }
    return;
  }

  generateVoiceNarratorAudio();
}

async function generateVoiceNarratorAudio() {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Please configure your Gemini API Key in Settings first.');
    }
    return;
  }

  const rawScript = window._lastGeneratedScript;
  if (!rawScript) {
    if (typeof showToast === 'function') showToast('⚠️ No script found to read.');
    return;
  }

  if (!window.lamejs) {
    if (typeof showToast === 'function') showToast('⏳ Loading MP3 Encoder... Try again in a second.');
    return;
  }

  const voiceName = (window._contentVoiceGender === 'male') ? 'Schedar' : 'Kore';
  const cleanNarrativeText = cleanScriptForSpeech(rawScript);

  // 1. Determine chunking based on remaining daily limit
  const today = getTtsTodayStr();
  state.ttsCounter = state.ttsCounter || { date: today, count: 0 };
  const remaining = 10 - state.ttsCounter.count;

  let chunks = [];
  if (remaining >= 2) {
    // Split into 2 chunks to bypass LLM TTS long-form voice drift/degradation (nasal drift)
    const paragraphs = cleanNarrativeText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    if (paragraphs.length >= 2) {
      const mid = Math.ceil(paragraphs.length / 2);
      chunks.push(paragraphs.slice(0, mid).join('\n '));
      chunks.push(paragraphs.slice(mid).join('\n '));
    } else {
      chunks.push(cleanNarrativeText);
    }
  } else {
    // Standard single-chunk mode
    chunks.push(cleanNarrativeText);
    if (remaining === 1 && typeof showToast === 'function') {
      showToast('⚠️ 1 generation left today. Reading script in 1 block (quality may vary).');
    }
  }

  // 2. Increment daily counter based on chunk count
  state.ttsCounter.count += chunks.length;
  saveState();
  triggerDriveSync();
  updateTtsCounterUI();

  const statusText = document.getElementById('c-audio-status');
  if (statusText) {
    statusText.textContent = chunks.length > 1 ? 'Generating Voice (2 Chunks)...' : 'Generating Voice...';
    statusText.className = 'content-audio-status-text playing';
  }

  try {
    // 3. Make parallel API requests for each chunk
    const promises = chunks.map(chunkText => callSingleTtsChunk(chunkText, voiceName, apiKey));
    const base64Results = await Promise.all(promises);

    if (statusText) statusText.textContent = 'Generating WAV...';

    // 4. Convert base64 segments to signed 16-bit mono PCM arrays
    const pcmArrays = base64Results.map(base64Data => {
      const binaryString = atob(base64Data);
      const alignedLen = binaryString.length - (binaryString.length % 2);
      const rawBytes = new Uint8Array(alignedLen);
      for (let i = 0; i < alignedLen; i++) {
        rawBytes[i] = binaryString.charCodeAt(i);
      }
      return new Int16Array(rawBytes.buffer, rawBytes.byteOffset, alignedLen / 2);
    });

    // 5. Concatenate PCM arrays
    const totalLength = pcmArrays.reduce((sum, arr) => sum + arr.length, 0);
    const combinedPcm = new Int16Array(totalLength);
    let offset = 0;
    for (const arr of pcmArrays) {
      combinedPcm.set(arr, offset);
      offset += arr.length;
    }

    // 6. Encode combined PCM to lossless WAV format
    const wavBlob = encodeWav(combinedPcm, 24000);
    const audioUrl = URL.createObjectURL(wavBlob);

    // Save cache settings
    window._currentAudioBlob = wavBlob;
    window._currentAudioBlobUrl = audioUrl;
    
    const topicText = window._viewingTopicName || 'voiceover';
    const safeTopic = topicText.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
    window._currentAudioFilename = `becreator_${safeTopic}_${Date.now()}.wav`;

    // Cache the audio file per script
    const scriptId = window._viewingContentScriptId;
    if (scriptId && window._audioCache) {
      window._audioCache[scriptId] = {
        blob: wavBlob,
        url: audioUrl,
        filename: window._currentAudioFilename
      };
    }

    // Play audio immediately
    const player = getOrCreateAudioPlayer();
    player.src = audioUrl;
    updateContentAudioSpeed(); // Apply selected speed multiplier
    player.play();

    // Trigger Automatic Local Download
    downloadCurrentAudioFile();

    // Trigger Automatic Background Google Drive Sync
    if (typeof state !== 'undefined' && state.driveConnected) {
      saveAudioToGoogleDrive(window._currentAudioFilename, wavBlob);
    }

  } catch (err) {
    console.error(err);
    if (statusText) {
      statusText.textContent = 'Failed';
      statusText.className = 'content-audio-status-text';
    }
    if (typeof showToast === 'function') {
      showToast('❌ Audio Generation Failed: ' + err.message);
    }
  }
}

async function callSingleTtsChunk(text, voiceName, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: `NARRATOR INSTRUCTIONS:
- You are a professional, high-fidelity voice-over artist.
- Read the script below with absolute clarity, crisp articulation, and a sharp voice.
- Maintain a highly consistent voice quality, volume level, and steady pacing from the first word to the very end of the narration.
- Do NOT let the voice drift, whisper, fade out, or accumulate metallic distortion over time. Keep the tone natural and uniform throughout.

SCRIPT TO READ:` },
          { text: text }
        ]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }
          }
        }
      }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API Error ${response.status}`);
  }

  const data = await response.json();
  const candidatePart = data.candidates?.[0]?.content?.parts?.[0];
  const base64Data = candidatePart?.inlineData?.data;

  if (!base64Data) {
    throw new Error('Gemini API did not return native audio data.');
  }

  return base64Data;
}usText) {
      statusText.textContent = 'Failed';
      statusText.className = 'content-audio-status-text';
    }
    if (typeof showToast === 'function') {
      showToast('❌ Audio Generation Failed: ' + err.message);
    }
  }
}

async function saveAudioToGoogleDrive(filename, audioBlob) {
  if (typeof driveAccessToken === 'undefined' || !driveAccessToken) return;
  
  try {
    // 1. Ensure primary folder "BeCreator" exists (sets state.driveFolderId)
    if (typeof ensureDriveFolder === 'function') {
      await ensureDriveFolder();
    }
    if (!state.driveFolderId) return;

    // 2. Check if subfolder "Audio" exists inside BeCreator folder
    const folderQuery = encodeURIComponent(`name='Audio' and '${state.driveFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${folderQuery}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${driveAccessToken}` }
    });
    const searchData = await searchRes.json();
    
    let audioFolderId;
    if (searchData.files?.length > 0) {
      audioFolderId = searchData.files[0].id;
    } else {
      // Create subfolder
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${driveAccessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Audio',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [state.driveFolderId]
        })
      });
      const newFolder = await createRes.json();
      audioFolderId = newFolder.id;
    }

    if (!audioFolderId) return;

    // 3. Upload WAV Blob as a multipart form upload
    const metadata = {
      name: filename,
      parents: [audioFolderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', audioBlob);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driveAccessToken}` },
      body: form
    });

    if (uploadRes.ok) {
      console.log(`Audio successfully backed up to Drive: ${filename}`);
      if (typeof showToast === 'function') {
        showToast('☁️ WAV backed up to Google Drive!');
      }
    } else {
      console.error('Drive audio upload failed:', uploadRes.status);
    }
  } catch (e) {
    console.error('Drive audio sync error:', e);
  }
}

function downloadCurrentAudioFile() {
  const blob = window._currentAudioBlob;
  const filename = window._currentAudioFilename;
  if (!blob || !filename) return;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function pauseContentAudio() {
  const player = getOrCreateAudioPlayer();
  if (player && !player.paused) {
    player.pause();
  }
}

function stopContentAudio() {
  const player = getOrCreateAudioPlayer();
  if (player) {
    player.pause();
    player.currentTime = 0;
  }
  stopVisualizer();
  updateAudioControlsState('ended');
}

function updateContentAudioSpeed() {
  const player = getOrCreateAudioPlayer();
  const speedEl = document.getElementById('c-audio-speed');
  if (player && speedEl) {
    player.defaultPlaybackRate = parseFloat(speedEl.value);
    player.playbackRate = parseFloat(speedEl.value);
  }
}

function updateAudioControlsState(state) {
  const btnPlay = document.getElementById('c-audio-play');
  const btnPause = document.getElementById('c-audio-pause');
  const btnStop = document.getElementById('c-audio-stop');
  const btnDownload = document.getElementById('c-audio-download');
  const statusText = document.getElementById('c-audio-status');
  
  if (!btnPlay || !btnPause || !btnStop || !statusText) return;
  
  if (state === 'speaking') {
    btnPlay.style.display = 'none';
    btnPause.style.display = 'inline-block';
    btnPause.textContent = '⏸ Pause';
    btnStop.style.display = 'inline-block';
    if (btnDownload) btnDownload.style.display = window._currentAudioBlob ? 'inline-block' : 'none';
    statusText.textContent = 'Speaking...';
    statusText.className = 'content-audio-status-text playing';
  } else if (state === 'paused') {
    btnPlay.style.display = 'inline-block';
    btnPlay.textContent = '▶ Resume';
    btnPause.style.display = 'none';
    btnStop.style.display = 'inline-block';
    if (btnDownload) btnDownload.style.display = window._currentAudioBlob ? 'inline-block' : 'none';
    statusText.textContent = 'Paused';
    statusText.className = 'content-audio-status-text';
  } else {
    // ended / stopped / ready
    btnPlay.style.display = 'inline-block';
    btnPlay.textContent = '▶ Listen';
    btnPause.style.display = 'none';
    btnStop.style.display = 'none';
    if (btnDownload) btnDownload.style.display = window._currentAudioBlob ? 'inline-block' : 'none';
    statusText.textContent = 'Ready';
    statusText.className = 'content-audio-status-text';
  }
}

// ============================================================
// AUDIO WAVE VISUALIZATION (HTML5 CANVAS)
// ============================================================

function startVisualizer(audioElement) {
  if (!audioElement) return;
  
  try {
    if (!window._audioCtx) {
      window._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      window._audioAnalyser = window._audioCtx.createAnalyser();
      window._audioAnalyser.fftSize = 64; // Small frequency count for block bars
    }
    
    if (!window._audioSource) {
      window._audioSource = window._audioCtx.createMediaElementSource(audioElement);
      window._audioSource.connect(window._audioAnalyser);
      window._audioAnalyser.connect(window._audioCtx.destination);
    }
    
    const canvas = document.getElementById('c-audio-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = window._audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
      window._audioVisualId = requestAnimationFrame(draw);
      window._audioAnalyser.getByteFrequencyData(dataArray);
      
      // White/light-themed canvas background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
        
        // Premium linear gradient columns
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#6200ee'); // Purple
        grad.addColorStop(1, '#03dac6'); // Teal
        ctx.fillStyle = grad;
        
        // Draw centered columns
        ctx.fillRect(x, canvas.height - barHeight - 2, barWidth - 3, barHeight);
        x += barWidth;
      }
    }
    
    if (window._audioCtx.state === 'suspended') {
      window._audioCtx.resume();
    }
    
    if (window._audioVisualId) cancelAnimationFrame(window._audioVisualId);
    draw();
    
  } catch (err) {
    console.error('Audio visualizer init failed:', err);
  }
}

function stopVisualizer() {
  if (window._audioVisualId) {
    cancelAnimationFrame(window._audioVisualId);
    window._audioVisualId = null;
  }
  
  // Clear visualizer canvas to white
  const canvas = document.getElementById('c-audio-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ============================================================
// LOSSLESS WAV ENCODER HELPER
// ============================================================

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  // RIFF identifier
  writeWavString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeWavString(view, 8, 'WAVE');
  // format chunk identifier
  writeWavString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count (1 = Mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample (16)
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeWavString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);
  
  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    view.setInt16(offset, samples[i], true);
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeWavString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
