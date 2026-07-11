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

      <div>
        <label class="builder-label" style="display:block;margin-bottom:6px">Topic / Trend Keyword (Optional)</label>
        <input class="input" id="c-topic" placeholder="e.g. Apple Vision Pro launch, Union Budget 2026..." style="width:100%">
        <div style="font-size:10px;color:var(--text3);margin-top:4px">Leave blank to auto-detect today's top trending news using Google Search.</div>
      </div>
      
      <button class="btn btn-primary" id="c-generate-btn" onclick="generateContentScript()" style="width:100%;height:40px;font-weight:600">
        🎬 Generate 2-Min Hinglish Script
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
        <div class="content-script-box" id="c-script-box"></div>
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
  renderContentHistory();
}

async function generateContentScript() {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Please configure your Gemini API Key in Settings first.');
    }
    return;
  }

  const topicInput = document.getElementById('c-topic');
  const topic = topicInput ? topicInput.value.trim() : '';
  const generateBtn = document.getElementById('c-generate-btn');
  const loadingDiv = document.getElementById('c-loading');
  const loadingText = document.getElementById('c-loading-text');
  const resultDiv = document.getElementById('c-result-container');
  
  if (generateBtn) generateBtn.disabled = true;
  if (loadingDiv) loadingDiv.style.display = 'block';
  if (resultDiv) resultDiv.style.display = 'none';
  if (loadingText) loadingText.textContent = 'Searching for trending news on the web...';

  const prompt = `Generate a highly engaging 2-minute video script for a trending news topic.
Topic/Keyword requested: ${topic || 'Find the latest major hot trending news of today using Google Search grounding.'}

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

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
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

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error ${response.status}`);
    }

    if (loadingText) loadingText.textContent = 'Writing Hinglish script...';
    
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No candidate responses returned.');
    
    const fullText = (candidate.content?.parts || []).map(p => p.text || '').join('\n');
    if (!fullText) throw new Error('Empty script text returned.');

    const newScript = {
      id: 'content_' + Date.now(),
      date: new Date().toLocaleString('en-IN'),
      topic: topic || 'Auto-Detected Trend',
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
    if (loadingDiv) loadingDiv.style.display = 'none';
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

  // Mark as read automatically when opened
  if (!item.read) {
    item.read = true;
    saveState();
    triggerDriveSync();
    renderContentHistory();
  }

  window._viewingContentScriptId = id;
  window._lastGeneratedScript = item.script;

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
