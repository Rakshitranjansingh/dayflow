// challenge.js

let selectedHistoryDay = null;
let questTimerInterval = null;

function initChallengePanel() {
  if (!state.challenges || typeof state.challenges !== 'object' || Array.isArray(state.challenges)) {
    state.challenges = {};
  }
  
  renderActiveQuest();
  renderChallengeHistory();
  updateChallengeStats();
  updateHomepageChallengeCard();
}

function checkChallengeLock() {
  if (!state.challenges || typeof state.challenges !== 'object' || Array.isArray(state.challenges)) {
    state.challenges = {};
  }
  
  const today = todayStr();
  for (const day in state.challenges) {
    if (state.challenges[day] && state.challenges[day].completed && state.challenges[day].date === today) {
      return true;
    }
  }
  return false;
}

function getMsUntilMidnight() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0); // next midnight (12:00 AM)
  return midnight - now;
}

function formatMs(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function startQuestTimerLoop(activeItem) {
  if (questTimerInterval) clearInterval(questTimerInterval);
  
  const timerEl = document.getElementById('quest-lock-timer');
  const btn = document.getElementById('quest-action-btn');
  if (!timerEl && !btn) return;
  
  const update = () => {
    const ms = getMsUntilMidnight();
    if (ms <= 0) {
      clearInterval(questTimerInterval);
      renderActiveQuest();
      return;
    }
    const timeStr = formatMs(ms);
    if (timerEl) {
      timerEl.innerHTML = `⏳ <strong>Daily Limit Reached:</strong> Day ${activeItem.day} is unlocked, but you can only mark one quest completed per calendar day. Next unlock in: <strong style="color:var(--accent)">${timeStr}</strong>`;
    }
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `⏳ Locked until Midnight (${timeStr})`;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }
  };
  
  update();
  questTimerInterval = setInterval(update, 1000);
}

function saveActiveQuestNote(dayNum, val) {
  if (!state.challenges || typeof state.challenges !== 'object' || Array.isArray(state.challenges)) {
    state.challenges = {};
  }
  
  if (!state.challenges[dayNum]) {
    state.challenges[dayNum] = { completed: false, note: '', date: null };
  }
  
  state.challenges[dayNum].note = val;
  saveState();
  
  if (typeof updateHomepageChallengeCard === 'function') {
    updateHomepageChallengeCard();
  }
}

function renderActiveQuest() {
  const container = document.getElementById('active-quest-area');
  if (!container) return;
  
  if (questTimerInterval) {
    clearInterval(questTimerInterval);
    questTimerInterval = null;
  }
  
  // Robust self-healing safeguard against script loading race conditions
  if (typeof CHALLENGE_ITEMS === 'undefined' || typeof CHALLENGE_PHASES === 'undefined') {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text3)">Loading challenge data...</div>`;
    setTimeout(renderActiveQuest, 100);
    return;
  }

  if (!state.challenges || typeof state.challenges !== 'object' || Array.isArray(state.challenges)) {
    state.challenges = {};
  }

  // Find the first uncompleted challenge
  let activeDay = null;
  let activeItem = null;
  
  for (let i = 1; i <= 365; i++) {
    const data = state.challenges[i] || { completed: false };
    if (!data.completed) {
      activeDay = i;
      activeItem = CHALLENGE_ITEMS.find(item => item.day === i);
      break;
    }
  }

  // Celebration state if all 365 days are completed
  if (!activeItem) {
    container.innerHTML = `
      <div class="quest-celebration-card">
        <div style="font-size: 44px; margin-bottom: 16px;">🏆</div>
        <h2>365/365 Days Completed!</h2>
        <p style="color: rgba(255,255,255,0.7); margin-top: 10px; font-size: 13px; line-height: 1.6">
          Amazing achievement! You have completed the entire 365-day self-improvement track. 
          Your final compound growth multiplier reached a staggering <strong style="color:#2ecc71" id="final-gain-lbl">6.2×</strong>! 
          Protect these habits and keep leveling up.
        </p>
      </div>
    `;
    updateChallengeStats();
    return;
  }

  const phaseColor = CHALLENGE_PHASES[activeItem.phaseId]?.color || 'var(--accent)';
  const dayStr = String(activeItem.day).padStart(3, '0');
  
  // Check lock status
  const isLocked = checkChallengeLock();
  
  // Load existing note draft if any
  const existingNote = state.challenges[activeItem.day]?.note || '';

  container.innerHTML = `
    <div class="active-quest-card" style="border-left: 4px solid ${phaseColor}">
      <div class="quest-card-header">
        <span class="quest-phase-badge" style="background: ${phaseColor}">${activeItem.phaseName}</span>
        <span class="quest-day-lbl">Day ${dayStr}</span>
      </div>
      <div class="quest-text">${activeItem.text}</div>
      
      <div class="quest-note-section">
        <label>📝 Logs / Notes for Today</label>
        <textarea id="active-quest-note" class="input transparent-input" rows="2" placeholder="Write logs, weights, reps, or personal takeaways here..." oninput="saveActiveQuestNote(${activeItem.day}, this.value)">${existingNote}</textarea>
      </div>
      
      <div id="quest-lock-timer" style="font-size: 11px; color: #ffbe76; line-height: 1.4; display: ${isLocked ? 'block' : 'none'}; padding: 4px 0"></div>
      
      <button class="btn btn-primary btn-full quest-action-btn" id="quest-action-btn" onclick="completeActiveQuest(${activeItem.day})">
        ✅ Mark Completed & Unlock Next Day
      </button>
    </div>
  `;

  if (isLocked) {
    startQuestTimerLoop(activeItem);
  }
}

function completeActiveQuest(dayNum) {
  if (checkChallengeLock()) {
    showToast('⚠️ Daily limit reached! Please wait until midnight.');
    return;
  }

  const noteVal = document.getElementById('active-quest-note').value;
  
  if (!state.challenges || typeof state.challenges !== 'object' || Array.isArray(state.challenges)) {
    state.challenges = {};
  }
  
  state.challenges[dayNum] = {
    completed: true,
    note: noteVal,
    date: todayStr()
  };
  
  saveState();
  
  renderActiveQuest();
  renderChallengeHistory();
  updateChallengeStats();
  updateHomepageChallengeCard();
  
  showToast(`🎯 Day ${dayNum} Completed! Keep going.`);
}

function renderChallengeHistory() {
  const container = document.getElementById('challenge-history-list');
  if (!container) return;
  container.innerHTML = '';

  if (!state.challenges || typeof state.challenges !== 'object' || Array.isArray(state.challenges)) {
    state.challenges = {};
  }

  let completedDays = [];
  for (let i = 1; i <= 365; i++) {
    const data = state.challenges[i] || { completed: false };
    if (data.completed) {
      completedDays.push({ day: i, note: data.note });
    }
  }

  if (completedDays.length === 0) {
    container.innerHTML = `
      <div style="font-size: 11px; color: var(--text3); text-align: center; padding: 24px 0;">
        No completed challenges yet. Lock in Day 001 above!
      </div>
    `;
    return;
  }

  // Sort newest first
  completedDays.sort((a, b) => b.day - a.day);

  completedDays.forEach(c => {
    const item = CHALLENGE_ITEMS.find(i => i.day === c.day);
    if (!item) return;
    
    const div = document.createElement('div');
    div.className = 'history-item-row';
    div.onclick = () => openHistoryModal(c.day);
    
    const dayStr = String(c.day).padStart(3, '0');
    const phaseColor = CHALLENGE_PHASES[item.phaseId]?.color || 'var(--accent)';
    
    const noteSnippet = c.note && c.note.trim().length > 0 
      ? `<span class="history-note-snippet">📝 ${c.note.trim().substring(0, 15)}${c.note.trim().length > 15 ? '...' : ''}</span>`
      : '<span class="history-note-empty">No notes logged</span>';

    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="history-dot" style="background: ${phaseColor}"></span>
        <span class="history-day-tag">Day ${dayStr}</span>
      </div>
      <span class="history-challenge-preview">${item.text}</span>
      ${noteSnippet}
    `;
    
    container.appendChild(div);
  });
}

function updateChallengeStats() {
  if (!state.challenges || typeof state.challenges !== 'object' || Array.isArray(state.challenges)) {
    state.challenges = {};
  }
  
  let totalCompleted = 0;
  for (const day in state.challenges) {
    if (state.challenges[day] && state.challenges[day].completed) {
      totalCompleted++;
    }
  }

  const compoundFactor = Math.pow(1.005, totalCompleted);
  const compoundStr = compoundFactor.toFixed(1) + '×';
  const pct = Math.round((totalCompleted / 365) * 100);

  const completedEl = document.getElementById('c-stat-completed');
  const compoundEl = document.getElementById('c-stat-compound');
  const pctEl = document.getElementById('c-stat-pct');

  if (completedEl) completedEl.textContent = `${totalCompleted}/365`;
  if (compoundEl) compoundEl.textContent = compoundStr;
  if (pctEl) pctEl.textContent = `${pct}%`;
  
  const finalGainEl = document.getElementById('final-gain-lbl');
  if (finalGainEl) finalGainEl.textContent = compoundStr;
}

/* History Edit Modal Helpers */
function openHistoryModal(dayNum) {
  const item = CHALLENGE_ITEMS.find(i => i.day === dayNum);
  if (!item) return;

  selectedHistoryDay = dayNum;
  const data = state.challenges[dayNum] || { completed: false, note: '', date: null };

  document.getElementById('ch-modal-day-num').textContent = `Day ${String(dayNum).padStart(3, '0')}`;
  
  const badge = document.getElementById('ch-modal-phase-badge');
  if (badge) {
    badge.textContent = item.phaseName;
    badge.style.background = CHALLENGE_PHASES[item.phaseId]?.color || 'var(--accent)';
  }

  document.getElementById('ch-modal-text').textContent = item.text;
  document.getElementById('ch-modal-completed-toggle').checked = data.completed;
  document.getElementById('ch-modal-notes-input').value = data.note || '';

  const modal = document.getElementById('challenge-history-modal');
  if (modal) modal.style.display = 'flex';
}

function closeHistoryModal() {
  const modal = document.getElementById('challenge-history-modal');
  if (modal) modal.style.display = 'none';
  selectedHistoryDay = null;
}

function saveHistoryModalData() {
  if (selectedHistoryDay === null) return;

  const completed = document.getElementById('ch-modal-completed-toggle').checked;
  const note = document.getElementById('ch-modal-notes-input').value;

  if (!state.challenges || typeof state.challenges !== 'object' || Array.isArray(state.challenges)) state.challenges = {};

  const oldData = state.challenges[selectedHistoryDay] || {};

  state.challenges[selectedHistoryDay] = {
    completed: completed,
    note: note,
    date: completed ? (oldData.date || todayStr()) : null
  };

  saveState();
  closeHistoryModal();
  
  renderActiveQuest();
  renderChallengeHistory();
  updateChallengeStats();
  updateHomepageChallengeCard();
  
  showToast(`💾 History updated for Day ${selectedHistoryDay}!`);
}

function resetChallengeProgress() {
  if (confirm("⚠️ Are you sure you want to reset all daily challenge progress and notes back to Day 1? This cannot be undone!")) {
    state.challenges = {};
    saveState();
    
    renderActiveQuest();
    renderChallengeHistory();
    updateChallengeStats();
    updateHomepageChallengeCard();
    
    showToast('🔄 Challenge progress reset to Day 001!');
  }
}

let homepageQuestTimerInterval = null;

function updateHomepageChallengeCard() {
  const badgeEl = document.getElementById('home-challenge-badge');
  const textEl = document.getElementById('home-challenge-text');
  if (!badgeEl && !textEl) {
    if (homepageQuestTimerInterval) {
      clearInterval(homepageQuestTimerInterval);
      homepageQuestTimerInterval = null;
    }
    return;
  }
  
  if (typeof CHALLENGE_ITEMS === 'undefined' || typeof CHALLENGE_PHASES === 'undefined') {
    setTimeout(updateHomepageChallengeCard, 100);
    return;
  }

  if (homepageQuestTimerInterval) {
    clearInterval(homepageQuestTimerInterval);
    homepageQuestTimerInterval = null;
  }

  const tick = () => {
    const badgeElCurr = document.getElementById('home-challenge-badge');
    const textElCurr = document.getElementById('home-challenge-text');
    if (!badgeElCurr || !textElCurr) {
      clearInterval(homepageQuestTimerInterval);
      homepageQuestTimerInterval = null;
      return;
    }

    if (!state.challenges || typeof state.challenges !== 'object' || Array.isArray(state.challenges)) {
      state.challenges = {};
    }
    
    let activeItem = null;
    for (let i = 1; i <= 365; i++) {
      const data = state.challenges[i] || { completed: false };
      if (!data.completed) {
        activeItem = CHALLENGE_ITEMS.find(item => item.day === i);
        break;
      }
    }

    if (!activeItem) {
      badgeElCurr.textContent = "🏆 Complete";
      badgeElCurr.style.color = "var(--green)";
      textElCurr.innerHTML = "You completed all 365 days of 0.5% daily self-improvement! Compound gain: 6.2x.";
      clearInterval(homepageQuestTimerInterval);
      homepageQuestTimerInterval = null;
      return;
    }

    const isLocked = checkChallengeLock();
    const ms = getMsUntilMidnight();
    const timeStr = formatMs(ms);

    if (isLocked) {
      const dayStr = String(activeItem.day).padStart(3, '0');
      badgeElCurr.textContent = `🎯 Next Quest — Day ${dayStr}`;
      badgeElCurr.style.color = "var(--text3)";
      textElCurr.innerHTML = `
        <div style="font-size: 14.5px; font-weight: 700; color: var(--text2); margin-bottom: 8px">
          Starting in <strong style="color: var(--accent); font-family: monospace;">${timeStr}</strong>
        </div>
        <div style="font-size: 13px; color: var(--text3); font-style: italic; line-height: 1.5">
          ${activeItem.text}
        </div>
      `;
    } else {
      const dayStr = String(activeItem.day).padStart(3, '0');
      badgeElCurr.textContent = `🎯 Daily Quest — Day ${dayStr} · ${activeItem.phaseName}`;
      
      const phaseColor = CHALLENGE_PHASES[activeItem.phaseId]?.color || 'var(--accent)';
      badgeElCurr.style.color = phaseColor;
      
      textElCurr.innerHTML = `
        <div>${activeItem.text}</div>
        <div class="home-challenge-timer" style="font-size: 11px; margin-top: 10px; color: #7f8c8d; font-weight: 600;">
          ⏳ Time remaining to complete: <strong style="font-family: monospace; color: var(--accent); font-size: 12px">${timeStr}</strong>
        </div>
      `;
    }
  };

  tick();
  homepageQuestTimerInterval = setInterval(tick, 1000);
}

function renderChallengePanelUI() {
  return `
    <div class="challenge-container">
      <!-- Top Stats Row -->
      <div class="challenge-header">
        <div class="challenge-title-block">
          <h2>365 Days of 0.5%</h2>
          <p>One small action daily, compounded</p>
        </div>
        <div class="challenge-stats">
          <div class="challenge-stat-card">
            <div class="num" id="c-stat-completed">0/365</div>
            <div class="lbl">Completed</div>
          </div>
          <div class="challenge-stat-card">
            <div class="num" id="c-stat-compound">1.0×</div>
            <div class="lbl">Compound Gain</div>
          </div>
          <div class="challenge-stat-card">
            <div class="num" id="c-stat-pct">0%</div>
            <div class="lbl">Progress</div>
          </div>
        </div>
      </div>

      <!-- Scrollable Main Area -->
      <div class="challenge-body">
        <!-- Active quest block -->
        <div class="active-quest-area" id="active-quest-area"></div>

        <!-- History scroll timeline -->
        <div class="challenge-history-section">
          <h3>📜 Streak History</h3>
          <div class="challenge-history-list" id="challenge-history-list"></div>
        </div>
      </div>

      <!-- Edit History Modal -->
      <div class="challenge-modal" id="challenge-history-modal">
        <div class="challenge-modal-content">
          <div class="challenge-modal-header">
            <span id="ch-modal-day-num">Day 000</span>
            <button class="challenge-modal-close" onclick="closeHistoryModal()">×</button>
          </div>
          <div class="challenge-modal-body">
            <div class="challenge-modal-phase-badge" id="ch-modal-phase-badge">Phase</div>
            <p class="challenge-modal-text" id="ch-modal-text">Challenge description...</p>
            
            <div class="challenge-modal-row" style="margin-top: 18px; margin-bottom: 20px;">
              <label class="toggle-switch">
                <input type="checkbox" id="ch-modal-completed-toggle">
                <span class="toggle-slider"></span>
              </label>
              <span style="font-size: 12px; font-weight: 600; color: #fff">Mark Completed</span>
            </div>

            <div style="width: 100%">
              <label style="font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 6px">Action Notes / Logs</label>
              <textarea id="ch-modal-notes-input" class="input transparent-input" rows="3" placeholder="Enter logs..."></textarea>
            </div>

            <button class="btn btn-primary btn-full" onclick="saveHistoryModalData()" style="margin-top: 24px; font-size: 12px; width: 100%">💾 Save Changes</button>
          </div>
        </div>
      </div>

    </div>
  `;
}

// Trigger initial card populate on startup
updateHomepageChallengeCard();
