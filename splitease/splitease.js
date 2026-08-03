// ============================================================
// SPLITEASY - MAIN APPLICATION CONTROLLER & UI BINDER
// ============================================================

let currentGroupId = null;
let currentTab = 'expenses'; // 'expenses', 'debts', 'members', 'checklist'
let activeGroup = null;
let groupMembers = [];
let groupExpenses = [];
let groupSettlements = [];
let groupPools = [];

const TEMPLATES = {
  tour: { name: 'Tour', icon: '🌴', colorClass: 'se-template-tour', categories: ['Travel', 'Hotel', 'Food', 'Sightseeing', 'Fuel', 'Misc'] },
  flat: { name: 'Flat', icon: '🏠', colorClass: 'se-template-flat', categories: ['Rent', 'Electricity', 'WiFi', 'Groceries', 'Maid', 'Misc'] },
  outing: { name: 'Outing', icon: '🎉', colorClass: 'se-template-outing', categories: ['Drinks', 'Food', 'Tickets', 'Cabs', 'Misc'] },
  custom: { name: 'Custom', icon: '⚙️', colorClass: 'se-template-custom', categories: ['General', 'Food', 'Transport', 'Shopping', 'Other'] }
};

/**
 * Opens full-screen SplitEasy application view.
 */
async function openSplitEasyApp() {
  const mainApp = document.getElementById('app');
  if (mainApp) mainApp.style.display = 'none';

  const seApp = document.getElementById('splitease-app');
  if (seApp) seApp.style.display = 'flex';

  await initSplitEasyData();
  initPullToRefresh();
}

/**
 * Closes full-screen SplitEasy application view and returns to DayFlow dashboard.
 */
function closeSplitEasyApp() {
  const seApp = document.getElementById('splitease-app');
  if (seApp) seApp.style.display = 'none';

  const mainApp = document.getElementById('app');
  if (mainApp) mainApp.style.display = 'block';

  // Update address bar query if needed
  if (window.location.search.includes('page=splitease')) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

/**
 * Updates navbar sync status dot (Green = Supabase Cloud Synced, Red = Local Storage Only).
 */
function updateSyncIndicator() {
  const dot = document.getElementById('se-sync-dot');
  if (!dot) return;

  const isCloudSynced = (typeof splitEasyDB !== 'undefined' && splitEasyDB.isSupabaseConnected && splitEasyDB.isSupabaseConnected());
  if (isCloudSynced) {
    dot.className = 'se-sync-dot synced';
    dot.title = '🟢 Synced with Supabase Cloud Database';
  } else {
    dot.className = 'se-sync-dot local';
    dot.title = '🔴 Operating in Local Mode (Local Storage only)';
  }
}

/**
 * Initializes SplitEasy group list, loads active group data or creates default group.
 */
async function initSplitEasyData() {
  updateSyncIndicator();
  const selectEl = document.getElementById('se-group-select');
  if (!selectEl) return;

  // FAST PATH 1: Instant render from Local Cache (0ms latency!)
  const localGroups = splitEasyDB.getGroupsLocal();
  populateGroupDropdown(localGroups);

  if (localGroups.length > 0) {
    if (!currentGroupId || !localGroups.find(g => g.id === currentGroupId)) {
      currentGroupId = localGroups[0].id;
    }
    selectEl.value = currentGroupId;
    await loadActiveGroupData(currentGroupId);
  } else {
    updateUIElementsVisibility();
    renderGroupHeader();
    renderGroupStats();
    renderTabContent();
  }

  // BACKGROUND PATH 2: Sync with Cloud asynchronously
  if (splitEasyDB.supabaseClient) {
    try {
      const userEmail = (typeof state !== 'undefined' && state.userEmail) ? state.userEmail : '';
      const userName = (typeof getUserIdentityName === 'function') ? getUserIdentityName() : '';
      const cloudGroups = await splitEasyDB.getGroups(userEmail, userName);
      
      populateGroupDropdown(cloudGroups);
      if (cloudGroups.length > 0) {
        if (!currentGroupId || !cloudGroups.find(g => g.id === currentGroupId)) {
          currentGroupId = cloudGroups[0].id;
        }
        selectEl.value = currentGroupId;
        await loadActiveGroupData(currentGroupId);
      }
    } catch (e) {
      console.warn('Background group sync error:', e);
    }
  }
}

function populateGroupDropdown(groups = []) {
  const selectEl = document.getElementById('se-group-select');
  if (!selectEl) return;
  selectEl.innerHTML = '';
  groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${TEMPLATES[g.template_type]?.icon || '🤝'} ${g.name}`;
    selectEl.appendChild(opt);
  });
}

/**
 * Loads group members, expenses, settlements and renders view.
 * Uses Instant Local Cache Load + Parallel Background Supabase Fetch.
 */
async function loadActiveGroupData(groupId) {
  updateSyncIndicator();
  currentGroupId = groupId;

  // FAST PATH 1: Instant Local Cache Read (0ms UI latency!)
  const localGroups = splitEasyDB.getGroupsLocal();
  activeGroup = localGroups.find(g => g.id === groupId) || activeGroup;

  if (activeGroup) {
    groupMembers = splitEasyDB.getMembersLocal(groupId);
    groupExpenses = splitEasyDB.getExpensesLocal(groupId);
    groupSettlements = splitEasyDB.getSettlementsLocal(groupId);
    groupPools = splitEasyDB.getPoolsLocal(groupId);
  } else {
    groupMembers = [];
    groupExpenses = [];
    groupSettlements = [];
    groupPools = [];
  }

  // Render UI IMMEDIATELY with local cache (Zero lag!)
  updateUIElementsVisibility();
  renderGroupHeader();
  renderGroupStats();
  renderTabContent();

  // BACKGROUND PATH 2: Fetch from Supabase concurrently in background
  if (splitEasyDB.supabaseClient && groupId) {
    try {
      const userEmail = (typeof state !== 'undefined' && state.userEmail) ? state.userEmail : '';
      const userName = (typeof getUserIdentityName === 'function') ? getUserIdentityName() : '';

      const [cloudGroups, mems, exps, setts, pools] = await Promise.all([
        splitEasyDB.getGroups(userEmail, userName),
        splitEasyDB.getMembers(groupId),
        splitEasyDB.getExpenses(groupId),
        splitEasyDB.getSettlements(groupId),
        splitEasyDB.getPools(groupId)
      ]);

      if (currentGroupId === groupId) {
        activeGroup = cloudGroups.find(g => g.id === groupId) || activeGroup;
        groupMembers = mems;
        groupExpenses = exps;
        groupSettlements = setts;
        groupPools = pools;

        // Re-render updated cloud data smoothly
        updateUIElementsVisibility();
        renderGroupHeader();
        renderGroupStats();
        renderTabContent();
      }
    } catch (err) {
      console.warn('Background cloud fetch warning:', err);
    }
  }
}

/**
 * Renders Template Badge and Share Code.
 */
function renderGroupHeader() {
  const tplBadge = document.getElementById('se-template-badge');
  if (tplBadge) {
    if (activeGroup) {
      const tpl = TEMPLATES[activeGroup.template_type] || TEMPLATES.custom;
      tplBadge.style.display = 'inline-flex';
      tplBadge.className = `se-template-badge ${tpl.colorClass}`;
      tplBadge.innerHTML = `${tpl.icon} ${tpl.name}`;
    } else {
      tplBadge.style.display = 'none';
    }
  }

  const shareCodeEl = document.getElementById('se-share-code');
  if (shareCodeEl) {
    let code = '';
    if (activeGroup) {
      if (!activeGroup.share_code && activeGroup.id) {
        activeGroup.share_code = activeGroup.id.substring(0, 6).toUpperCase();
      }
      code = activeGroup.share_code || '';
    }
    shareCodeEl.innerHTML = code ? `🔑 ${code} <span style="opacity: 0.7; font-size: 10px;">📋</span>` : '';
    shareCodeEl.style.display = code ? 'inline-flex' : 'none';
  }
}

/**
 * Renders 4 parallel balance cards (Total Group Spent, You Spent, Pool Fund, Your Balance).
 */
function renderGroupStats() {
  const curr = activeGroup ? activeGroup.currency : '₹';
  const balances = calculateNetBalances(groupMembers, groupExpenses, groupSettlements);
  const userMember = getLoggedInUserMember();

  // 1. Budget (Available Pool Fund = Total Collected - Pool Expenses)
  const totalPoolCollected = groupPools.reduce((sum, p) => sum + (Number(p.total_collected) || 0), 0);
  const poolSpent = groupExpenses.filter(e => e.paid_by_member_id === '__POOL__').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const availableBudget = totalPoolCollected - poolSpent;

  const poolFundEl = document.getElementById('se-stat-pool-fund');
  if (poolFundEl) poolFundEl.textContent = `${curr}${availableBudget.toFixed(2)}`;

  // 2. Total Group Expense
  const totalExp = groupExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalExpEl = document.getElementById('se-stat-total-exp');
  if (totalExpEl) totalExpEl.textContent = `${curr}${totalExp.toFixed(2)}`;

  // 3. You Spent (Amount paid by logged-in user)
  const userPaid = userMember ? groupExpenses.filter(e => e.paid_by_member_id === userMember.id).reduce((sum, e) => sum + (Number(e.amount) || 0), 0) : 0;
  const youSpentEl = document.getElementById('se-stat-you-spent');
  if (youSpentEl) youSpentEl.textContent = `${curr}${userPaid.toFixed(2)}`;

  // 4. Your Balance (Net balance of logged-in user)
  const userNet = userMember ? (balances[userMember.id] || 0) : 0;
  const myBalEl = document.getElementById('se-stat-my-balance');
  if (myBalEl) {
    if (userNet > 0) {
      myBalEl.className = 'se-stat-value se-val-green';
      myBalEl.textContent = `+${curr}${userNet.toFixed(2)}`;
    } else if (userNet < 0) {
      myBalEl.className = 'se-stat-value se-val-red';
      myBalEl.textContent = `-${curr}${Math.abs(userNet).toFixed(2)}`;
    } else {
      myBalEl.className = 'se-stat-value se-val-neutral';
      myBalEl.textContent = `${curr}0.00`;
    }
  }
}

/**
 * Switch active view tab ('expenses', 'debts', 'members')
 */
function switchSplitEasyTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('.se-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  renderTabContent();
}

function updateUIElementsVisibility() {
  const grpHeader = document.querySelector('.se-group-header');
  const statsGrid = document.querySelector('.se-stats-grid');
  const tabs = document.querySelector('.se-tabs');
  const fab = document.querySelector('.se-fab');

  const hasGroup = !!activeGroup;

  if (grpHeader) grpHeader.style.display = hasGroup ? 'flex' : 'none';
  if (statsGrid) statsGrid.style.display = hasGroup ? 'grid' : 'none';
  if (tabs) tabs.style.display = hasGroup ? 'flex' : 'none';
  if (fab) fab.style.display = hasGroup ? 'flex' : 'none';
}

/**
 * Renders tab content body or 2-option Landing Screen if no groups exist.
 */
function renderTabContent() {
  updateUIElementsVisibility();
  const container = document.getElementById('se-tab-container');
  if (!container) return;

  container.innerHTML = '';

  if (!activeGroup) {
    container.innerHTML = `
      <div style="max-width: 440px; margin: 20px auto; text-align: center; background: var(--surface); padding: 24px 20px; border-radius: var(--radius-sm); border: 1px solid var(--border); box-shadow: var(--shadow);">
        <div style="font-size: 38px; margin-bottom: 8px;">🤝</div>
        <div style="font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 4px;">Welcome to SplitEase</div>
        <div style="font-size: 12px; color: var(--text2); margin-bottom: 20px; line-height: 1.4;">Split bills, track group expenses, and calculate simplified settlements easily.</div>

        <!-- OPTION 1: JOIN GROUP -->
        <div style="background: var(--surface2); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 12px; text-align: left;">
          <div style="font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 2px;">1. Join an Existing Group</div>
          <div style="font-size: 11px; color: var(--text2); margin-bottom: 8px;">Enter the Group Code provided by your friend:</div>
          <form onsubmit="submitJoinGroupForm(event)" style="display: flex; gap: 6px;">
            <input type="text" id="se-join-code-input" class="input" placeholder="e.g. GOA202" style="text-transform: uppercase; font-weight: 700; letter-spacing: 1px; font-size: 12px;" required>
            <button type="submit" class="btn btn-secondary btn-sm" style="white-space: nowrap; font-size: 12px;">Join Group ➔</button>
          </form>
        </div>

        <div style="font-size: 11px; color: var(--text3); margin: 8px 0; font-weight: 700;">OR</div>

        <!-- OPTION 2: CREATE GROUP -->
        <div style="background: var(--surface2); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border); text-align: left;">
          <div style="font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 2px;">2. Create a New Group</div>
          <div style="font-size: 11px; color: var(--text2); margin-bottom: 10px;">Start a fresh trip, flat, or outing tab:</div>
          <button class="btn btn-primary btn-full btn-sm" onclick="openCreateGroupModal()">➕ Create New Group</button>
        </div>
      </div>
    `;
    return;
  }

  if (currentTab === 'expenses') {
    renderExpensesList(container);
  } else if (currentTab === 'debts') {
    renderSimplifiedDebts(container);
  } else if (currentTab === 'members') {
    renderMembersList(container);
  } else if (currentTab === 'checklist') {
    renderChecklist(container);
  }
}

/**
 * Join group by share code form handler (Landing View).
 */
async function submitJoinGroupForm(e) {
  e.preventDefault();
  const input = document.getElementById('se-join-code-input');
  if (!input || !input.value.trim()) return;

  const code = input.value.trim();
  const userEmail = (typeof state !== 'undefined' && state.userEmail) ? state.userEmail : '';
  const userName = (typeof getUserIdentityName === 'function') ? getUserIdentityName() : 'You';

  const res = await splitEasyDB.joinGroupByShareCode(code, userEmail, userName);
  if (res && res.error === 'INACTIVE_MEMBER') {
    alert(res.message);
    return;
  }
  if (res && res.id) {
    currentGroupId = res.id;
    await initSplitEasyData();
  } else {
    alert(`Group code "${code.toUpperCase()}" not found. Please verify the code with your friend.`);
  }
}

/**
 * Join group by share code (Top Navbar Modal Handler).
 */
async function submitModalJoinGroup() {
  const input = document.getElementById('se-modal-join-code');
  if (!input || !input.value.trim()) {
    alert('Please enter a valid group code');
    return;
  }

  const code = input.value.trim();
  const userEmail = (typeof state !== 'undefined' && state.userEmail) ? state.userEmail : '';
  const userName = (typeof getUserIdentityName === 'function') ? getUserIdentityName() : 'You';

  const res = await splitEasyDB.joinGroupByShareCode(code, userEmail, userName);
  if (res && res.error === 'INACTIVE_MEMBER') {
    alert(res.message);
    return;
  }
  if (res && res.id) {
    closeCreateGroupModal();
    currentGroupId = res.id;
    await initSplitEasyData();
  } else {
    alert(`Group code "${code.toUpperCase()}" not found. Please verify the code with your friend.`);
  }
}

/**
 * Renders list of expenses and settlements.
 */
function renderExpensesList(container) {
  if (groupExpenses.length === 0 && groupSettlements.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text2);">
        <div style="font-size: 40px; margin-bottom: 8px;">💸</div>
        <div style="font-size: 16px; font-weight: 700;">No expenses yet</div>
        <div style="font-size: 13px;">Tap "+ Add Expense" below to split a bill.</div>
      </div>
    `;
    return;
  }

  const ledger = document.createElement('div');
  ledger.className = 'se-ledger';

  groupExpenses.forEach(exp => {
    const isPoolPayer = exp.paid_by_member_id === '__POOL__';
    const payerName = isPoolPayer ? '🏦 Group Pool Fund' : (groupMembers.find(m => m.id === exp.paid_by_member_id)?.name || 'Unknown');
    const item = document.createElement('div');
    item.className = 'se-expense-item';
    item.onclick = () => openEditExpenseModal(exp.id);
    item.style.cursor = 'pointer';
    item.title = 'Tap to Edit Expense';
    item.innerHTML = `
      <div class="se-exp-left">
        <div class="se-exp-icon">${getCategoryIcon(exp.category)}</div>
        <div class="se-exp-details">
          <div class="se-exp-title">${escapeHtml(exp.title)}</div>
          <div class="se-exp-sub">Paid by <strong style="${isPoolPayer ? 'color: var(--purple, #8B5CF6); font-weight: 700;' : ''}">${escapeHtml(payerName)}</strong> • ${exp.date}</div>
        </div>
      </div>
      <div class="se-exp-right">
        <div class="se-exp-amount">${activeGroup.currency}${Number(exp.amount).toFixed(2)}</div>
        <div class="se-exp-badge" style="display:inline-flex; align-items:center; gap:3px;">${exp.category} ✏️</div>
      </div>
    `;
    ledger.appendChild(item);
  });

  container.appendChild(ledger);
}

/**
 * Renders simplified debt settlement cards.
 */
function renderSimplifiedDebts(container) {
  const balances = calculateNetBalances(groupMembers, groupExpenses, groupSettlements);
  const transactions = simplifyDebts(balances, groupMembers);

  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '12px';

  if (transactions.length === 0) {
    const emptyBox = document.createElement('div');
    emptyBox.style.textAlign = 'center';
    emptyBox.style.padding = '30px 20px';
    emptyBox.style.color = 'var(--green)';
    emptyBox.innerHTML = `
      <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
      <div style="font-size: 18px; font-weight: 800;">Everyone is settled up!</div>
      <div style="font-size: 13px; color: var(--text2);">No outstanding payments required.</div>
    `;
    wrap.appendChild(emptyBox);
  } else {
    transactions.forEach(t => {
      const card = document.createElement('div');
      card.className = 'se-debt-card';
      card.innerHTML = `
        <div class="se-debt-flow">
          <div class="se-avatar" style="background: var(--red);">${t.fromName.charAt(0)}</div>
          <span>${escapeHtml(t.fromName)}</span>
          <span class="se-arrow">➔</span>
          <div class="se-avatar" style="background: var(--green);">${t.toName.charAt(0)}</div>
          <span>${escapeHtml(t.toName)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px; font-weight: 800; color: var(--text);">${activeGroup.currency}${t.amount.toFixed(2)}</span>
          <button class="btn btn-sm btn-success" onclick="openSettleUpModal('${t.fromId}', '${t.toId}', ${t.amount})">Settle</button>
        </div>
      `;
      wrap.appendChild(card);
    });
  }

  // SETTLEMENT HISTORY LOG SECTION
  if (groupSettlements.length > 0) {
    const historyBox = document.createElement('div');
    historyBox.style.marginTop = '16px';
    historyBox.style.borderTop = '1px dashed var(--border)';
    historyBox.style.paddingTop = '14px';

    historyBox.innerHTML = `
      <div style="font-size: 12px; font-weight: 800; color: var(--text); margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
        <span>🤝 Settlement History Log</span>
        <span style="font-size: 11px; color: var(--text2); font-weight: 600;">${groupSettlements.length} Recorded</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${groupSettlements.map(s => {
          const fromMem = groupMembers.find(m => m.id === s.from_member_id);
          const toMem = groupMembers.find(m => m.id === s.to_member_id);
          return `
            <div class="se-expense-item" style="padding: 10px 12px; background: var(--surface2);">
              <div class="se-exp-left">
                <div class="se-avatar" style="background: var(--green); font-size: 12px; width: 32px; height: 32px;">🤝</div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <div style="font-size: 12px; font-weight: 700; color: var(--text);">
                    ${escapeHtml(fromMem ? fromMem.name : 'Member')} paid ${activeGroup.currency}${Number(s.amount).toFixed(2)} to ${escapeHtml(toMem ? toMem.name : 'Member')}
                  </div>
                  <div style="font-size: 10px; color: var(--text2);">Settled on ${s.date || 'Recent'}</div>
                </div>
              </div>
              <div class="se-exp-badge" style="background: #22C55E20; color: #22C55E; font-weight: 700; font-size: 10px;">✅ Settled</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    wrap.appendChild(historyBox);
  }

  container.appendChild(wrap);
}

/**
 * Renders member roster (Active members & Strikethrough Removed members).
 */
function renderMembersList(container) {
  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '10px';

  groupMembers.forEach((m, idx) => {
    const item = document.createElement('div');
    item.className = 'se-expense-item';
    const isInactive = Boolean(m.is_inactive);
    const canDelete = idx > 0 && !isInactive;

    item.innerHTML = `
      <div class="se-exp-left">
        <div class="se-avatar" style="background: ${m.avatar_color || '#2D6BE4'}; opacity: ${isInactive ? 0.5 : 1};">${m.name.charAt(0).toUpperCase()}</div>
        <div style="display:flex; flex-direction:column;">
          <div class="se-exp-title" style="${isInactive ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
            ${escapeHtml(m.name)} 
            ${idx === 0 ? '<span style="font-size:11px; opacity:0.7;">(Admin)</span>' : ''}
            ${isInactive ? '<span style="font-size:10px; color:var(--red); text-decoration:none; font-weight:700;"> (Removed Member)</span>' : ''}
          </div>
          <div class="se-exp-sub" style="font-size:11px; opacity:0.7;">${escapeHtml(m.email || 'No email attached')}</div>
        </div>
      </div>
      ${canDelete ? `<button class="se-icon-btn" style="width:32px; height:32px; font-size:13px; color:var(--red);" onclick="removeMember('${m.id}', '${escapeHtml(m.name)}')">🗑️</button>` : ''}
    `;
    list.appendChild(item);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-secondary btn-full';
  addBtn.style.marginTop = '12px';
  addBtn.innerHTML = '👤 Add Member by Email ID';
  addBtn.onclick = promptAddMember;
  list.appendChild(addBtn);

  container.appendChild(list);
}

/**
 * Prompt to create new member by Email ID.
 */
async function promptAddMember() {
  if (!currentGroupId) {
    alert('Please select or create a group first!');
    return;
  }

  const emailInput = prompt('Enter Member Email ID (e.g. friend@gmail.com):');
  if (!emailInput || !emailInput.trim()) return;

  const email = emailInput.trim();
  let name = email.split('@')[0];
  const customName = prompt(`Display name for ${email}:`, name);
  if (customName && customName.trim()) name = customName.trim();

  const colors = ['#2D6BE4', '#22C55E', '#8B5CF6', '#F97316', '#EF4444', '#EAB308'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  await splitEasyDB.addMember(currentGroupId, email, name, randomColor);
  await loadActiveGroupData(currentGroupId);
}

/**
 * Remove member from group (Strikethrough & revoke group access).
 */
async function removeMember(memberId, memberName) {
  if (confirm(`Are you sure you want to remove ${memberName}? They will be struck through, excluded from future expenses, and lose access to this group.`)) {
    await splitEasyDB.deleteMember(memberId);
    await loadActiveGroupData(currentGroupId);
  }
}

/* ============================================================
   GROUP CHECKLIST & BE CREATOR TO-DO LIST INTEGRATION
   ============================================================ */

function getLoggedInUserMember() {
  const userEmail = (typeof state !== 'undefined' && state.userEmail) ? state.userEmail.trim().toLowerCase() : '';
  const userName = (typeof getUserIdentityName === 'function') ? getUserIdentityName().trim().toLowerCase() : '';

  return groupMembers.find(m => {
    const mEmail = (m.email || '').trim().toLowerCase();
    const mName = (m.name || '').trim().toLowerCase();
    return (userEmail && mEmail && mEmail === userEmail) || (userName && mName && mName === userName);
  }) || groupMembers[0];
}

function syncChecklistToMainTodo(item, groupName) {
  if (typeof state === 'undefined' || !state.todos) return;

  const userMember = getLoggedInUserMember();
  if (!userMember) return;

  const isAssignedToUser = item.assigned_to_member_id && String(item.assigned_to_member_id) === String(userMember.id);
  const todoId = 'se-todo-' + item.id;
  const todoText = `[SplitEase: ${groupName}] ${item.title}`;
  const existingIdx = state.todos.findIndex(t => t.id === todoId);

  if (isAssignedToUser) {
    if (existingIdx !== -1) {
      state.todos[existingIdx].done = Boolean(item.is_completed);
      state.todos[existingIdx].text = todoText;
      state.todos[existingIdx].note = item.note || '';
    } else {
      state.todos.push({
        id: todoId,
        text: todoText,
        note: item.note || '',
        done: Boolean(item.is_completed),
        createdDate: state.selectedDate || new Date().toISOString().split('T')[0],
        source: 'splitease'
      });
    }
  } else if (existingIdx !== -1) {
    state.todos.splice(existingIdx, 1);
  }

  if (typeof saveState === 'function') saveState();
  if (typeof updateTodoBadge === 'function') updateTodoBadge();
  if (typeof updateAlertBar === 'function') updateAlertBar();
}

async function renderChecklist(container) {
  if (!activeGroup) return;

  const checklists = await splitEasyDB.getChecklists(currentGroupId);
  const activeMembers = groupMembers.filter(m => !m.is_inactive);

  // Sync assigned items to main BeCreator To-Do list
  checklists.forEach(item => syncChecklistToMainTodo(item, activeGroup.name));

  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '12px';

  // Add Task Form
  const formBox = document.createElement('form');
  formBox.onsubmit = (e) => submitAddChecklistItem(e);
  formBox.style.background = 'var(--surface2)';
  formBox.style.padding = '12px';
  formBox.style.borderRadius = 'var(--radius-sm)';
  formBox.style.border = '1px solid var(--border)';
  formBox.style.display = 'flex';
  formBox.style.flexDirection = 'column';
  formBox.style.gap = '8px';

  formBox.innerHTML = `
    <div style="font-size:12px; font-weight:700; color:var(--text);">☑️ Add Group Checklist Item</div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
      <input type="text" id="se-cl-title-input" class="input" placeholder="Task description..." required style="font-size:12px; padding:6px 10px; grid-column: 1 / -1;">
      <div>
        <label style="font-size:10px; font-weight:600; color:var(--text2); display:block; margin-bottom:2px;">Assign To (Optional)</label>
        <select id="se-cl-assign-select" class="input" style="font-size:11px; padding:4px 8px;">
          <option value="">🌐 Unassigned (Everyone)</option>
          ${activeMembers.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex; align-items:flex-end;">
        <button type="submit" class="btn btn-primary btn-full btn-sm" style="font-size:11px; padding:6px 10px;">➕ Add Task</button>
      </div>
    </div>
  `;
  wrap.appendChild(formBox);

  // Task Items List
  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '8px';

  if (checklists.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; padding: 30px 16px; color: var(--text2);">
        <div style="font-size: 32px; margin-bottom: 6px;">☑️</div>
        <div style="font-size: 14px; font-weight: 700;">Group Checklist Empty</div>
        <div style="font-size: 12px;">Add shared tasks above (e.g. Pack tents, Buy groceries, Book hotel).</div>
      </div>
    `;
  } else {
    checklists.forEach(item => {
      const isDone = Boolean(item.is_completed);
      const assignee = groupMembers.find(m => m.id === item.assigned_to_member_id);

      const el = document.createElement('div');
      el.className = 'se-expense-item';
      el.style.padding = '10px 12px';
      el.style.opacity = isDone ? '0.7' : '1';

      el.innerHTML = `
        <div class="se-exp-left" style="gap:10px; flex:1;">
          <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleChecklistItemState('${item.id}', this.checked)" style="width:16px; height:16px; cursor:pointer;">
          <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
            <div style="font-size:12px; font-weight:600; color:var(--text); ${isDone ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${escapeHtml(item.title)}</div>
            ${item.note ? `<div style="font-size:11px; color:var(--text2); display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; max-width:250px; cursor:pointer;" onclick="openTodoNoteModal('${item.id}', '${escapeHtml(item.title).replace(/'/g, "\\'")}', '${escapeHtml(item.note).replace(/'/g, "\\'")}')">📝 ${escapeHtml(item.note)}</div>` : ''}
            <div style="font-size:10px; color:var(--text2); display:flex; align-items:center; gap:4px; margin-top:2px;">
              ${assignee ? `<span class="se-exp-badge" style="background:${assignee.avatar_color || '#2D6BE4'}20; color:${assignee.avatar_color || '#2D6BE4'}; font-size:10px;">👤 ${escapeHtml(assignee.name)}</span>` : '<span style="opacity:0.6;">🌐 Unassigned</span>'}
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          <button class="se-icon-btn" onclick="openTodoNoteModal('${item.id}', '${escapeHtml(item.title).replace(/'/g, "\\'")}', '${escapeHtml(item.note || '').replace(/'/g, "\\'")}')" style="width:28px; height:28px; font-size:12px;" title="Add / View Full Note">📝</button>
          <button class="se-icon-btn" onclick="removeChecklistItem('${item.id}')" style="width:28px; height:28px; font-size:12px; color:var(--red);">🗑️</button>
        </div>
      `;
      list.appendChild(el);
    });
  }

  wrap.appendChild(list);
  container.appendChild(wrap);
}

function promptChecklistNote(itemId, titleText, currentNote = '') {
  openTodoNoteModal(itemId, titleText, currentNote);
}

/* ============================================================
   MULTILINE TODO NOTE MODAL HANDLERS
   ============================================================ */

function openTodoNoteModal(targetId, titleText, currentNote = '') {
  const modal = document.getElementById('se-todo-note-modal');
  const targetInput = document.getElementById('se-note-target-id');
  const titleEl = document.getElementById('se-note-task-title');
  const textarea = document.getElementById('se-note-textarea');

  if (targetInput) targetInput.value = targetId;
  if (titleEl) titleEl.textContent = titleText;
  if (textarea) textarea.value = currentNote;

  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
}

function closeTodoNoteModal() {
  const modal = document.getElementById('se-todo-note-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
}

async function saveTodoNoteFromModal() {
  const targetId = document.getElementById('se-note-target-id')?.value;
  const textarea = document.getElementById('se-note-textarea');
  if (!targetId || !textarea) return;

  const noteText = textarea.value.trim();

  // If BeCreator Main To-Do Task
  if (typeof state !== 'undefined' && state.todos) {
    const t = state.todos.find(item => item.id === targetId);
    if (t) {
      t.note = noteText;
      if (typeof saveState === 'function') saveState();
      if (typeof updateTodoBadge === 'function') updateTodoBadge();
      if (typeof updateAlertBar === 'function') updateAlertBar();
      if (typeof openPanel === 'function' && document.getElementById('panel-todo')?.classList.contains('active')) {
        openPanel('todo');
      }
    }
  }

  // If SplitEasy Checklist Item
  if (targetId.startsWith('se-todo-') || splitEasyDB) {
    const itemId = targetId.startsWith('se-todo-') ? targetId.replace('se-todo-', '') : targetId;
    await splitEasyDB.updateChecklistNote(itemId, noteText);
    if (currentGroupId) await loadActiveGroupData(currentGroupId);
  }

  closeTodoNoteModal();
}

/* ============================================================
   GROUP POOL FUND MODAL HANDLERS
   ============================================================ */

function openPoolBreakdownModal() {
  if (!activeGroup) return;
  const modal = document.getElementById('se-pool-breakdown-modal');
  const totalCollectedEl = document.getElementById('se-pool-total-collected');
  const totalContribsEl = document.getElementById('se-pool-total-contributions');
  const historyList = document.getElementById('se-pool-history-list');

  const curr = activeGroup.currency || '₹';
  const totalCollected = groupPools.reduce((sum, p) => sum + (Number(p.total_collected) || 0), 0);
  const poolExpenses = groupExpenses.filter(e => e.paid_by_member_id === '__POOL__');
  const poolSpent = poolExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const availablePool = totalCollected - poolSpent;

  if (totalCollectedEl) totalCollectedEl.textContent = `${curr}${availablePool.toFixed(2)}`;
  if (totalContribsEl) totalContribsEl.textContent = `Spent: ${curr}${poolSpent.toFixed(2)}`;

  if (historyList) {
    let html = '';
    if (groupPools.length === 0 && poolExpenses.length === 0) {
      html = `
        <div style="text-align: center; padding: 20px 10px; color: var(--text2); font-size: 12px;">
          No pool contributions added yet. Tap <b>➕ Add Pool Fund</b> to collect money!
        </div>
      `;
    } else {
      if (groupPools.length > 0) {
        html += `<div style="font-size: 11px; font-weight: 700; color: var(--green); margin-bottom: 4px;">💰 Pool Collections (+${curr}${totalCollected.toFixed(2)})</div>`;
        html += groupPools.map(p => `
          <div class="se-expense-item" style="padding: 8px 10px; background: var(--surface2);">
            <div class="se-exp-left">
              <div class="se-avatar" style="background: var(--purple, #8B5CF6); font-size: 11px; width: 28px; height: 28px;">🏦</div>
              <div style="display: flex; flex-direction: column; gap: 1px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--text);">${escapeHtml(p.title)}</div>
                <div style="font-size: 9px; color: var(--text2);">
                  ${p.contribution_type === 'perhead' ? `👤 ${curr}${Number(p.amount_per_unit).toFixed(2)} / head (${groupMembers.length} members)` : `💰 Lump Sum`}
                </div>
              </div>
            </div>
            <div style="font-size: 12px; font-weight: 800; color: var(--green);">+${curr}${Number(p.total_collected).toFixed(2)}</div>
          </div>
        `).join('');
      }

      if (poolExpenses.length > 0) {
        html += `<div style="font-size: 11px; font-weight: 700; color: var(--red); margin: 8px 0 4px 0;">💸 Expenses Paid Out of Pool (-${curr}${poolSpent.toFixed(2)})</div>`;
        html += poolExpenses.map(e => `
          <div class="se-expense-item" style="padding: 8px 10px; background: var(--surface2);">
            <div class="se-exp-left">
              <div style="font-size: 14px;">${getCategoryIcon(e.category)}</div>
              <div style="display: flex; flex-direction: column; gap: 1px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--text);">${escapeHtml(e.title)}</div>
                <div style="font-size: 9px; color: var(--text2);">${e.date}</div>
              </div>
            </div>
            <div style="font-size: 12px; font-weight: 800; color: var(--red);">-${curr}${Number(e.amount).toFixed(2)}</div>
          </div>
        `).join('');
      }
    }
    historyList.innerHTML = html;
  }

  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
}

function closePoolBreakdownModal() {
  const modal = document.getElementById('se-pool-breakdown-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
}

/**
 * Copies formatted invitation text with Group Code to clipboard.
 */
function copyGroupInviteText() {
  if (!activeGroup) return;

  const code = activeGroup.share_code;
  const name = activeGroup.name;
  const link = `${window.location.origin}${window.location.pathname}?page=splitease&code=${code}`;

  const inviteMsg = `Hey! You're invited to join our "${name}" group on SplitEase!\n\n🔑 Group Code: ${code}\n🔗 Join Link: ${link}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(inviteMsg).then(() => {
      if (typeof showToast === 'function') {
        showToast('📋 Invitation copied to clipboard!');
      } else {
        alert('📋 Invitation copied to clipboard!');
      }
    }).catch(err => {
      console.warn('Clipboard write failed:', err);
      prompt('Copy this invitation text:', inviteMsg);
    });
  } else {
    prompt('Copy this invitation text:', inviteMsg);
  }
}

/* ============================================================
   CHRONOLOGICAL ACTIVITY & BALANCE LOGS MODAL
   ============================================================ */

function openBalanceLogsModal() {
  if (!activeGroup) return;

  const modal = document.getElementById('se-balance-logs-modal');
  const summaryEl = document.getElementById('se-balance-logs-summary');
  const listEl = document.getElementById('se-balance-logs-list');

  const curr = activeGroup.currency || '₹';
  const balances = calculateNetBalances(groupMembers, groupExpenses, groupSettlements);
  const userMember = getLoggedInUserMember();
  const userNet = userMember ? (balances[userMember.id] || 0) : 0;

  if (summaryEl) {
    const netClass = userNet > 0 ? 'color: var(--green);' : userNet < 0 ? 'color: var(--red);' : 'color: var(--text);';
    const netStatus = userNet > 0 ? `You are owed ${curr}${userNet.toFixed(2)}` : userNet < 0 ? `You owe ${curr}${Math.abs(userNet).toFixed(2)}` : `You are all settled up!`;
    summaryEl.innerHTML = `
      <span>👤 Member: <b>${escapeHtml(userMember ? userMember.name : 'You')}</b></span>
      <span style="font-weight: 800; ${netClass}">${netStatus}</span>
    `;
  }

  // Combine All Activities (Expenses, Settlements, Pool Contributions) into a Chronological List
  const activities = [];

  // Expenses
  groupExpenses.forEach(e => {
    const isPool = e.paid_by_member_id === '__POOL__';
    const payerName = isPool ? '🏦 Group Pool Fund' : (groupMembers.find(m => m.id === e.paid_by_member_id)?.name || 'Member');
    const mySplit = e.splits ? e.splits.find(s => s.member_id === userMember?.id) : null;
    const myShare = mySplit ? Number(mySplit.split_amount) || 0 : 0;

    activities.push({
      type: 'expense',
      timestamp: new Date(e.created_at || e.date || 0).getTime(),
      dateStr: e.date || 'Recent',
      title: e.title,
      category: e.category,
      payerName,
      amount: Number(e.amount) || 0,
      myShare
    });
  });

  // Settlements
  groupSettlements.forEach(s => {
    const fromMem = groupMembers.find(m => m.id === s.from_member_id);
    const toMem = groupMembers.find(m => m.id === s.to_member_id);

    activities.push({
      type: 'settlement',
      timestamp: new Date(s.created_at || s.date || 0).getTime(),
      dateStr: s.date || 'Recent',
      title: `${fromMem ? fromMem.name : 'Member'} settled with ${toMem ? toMem.name : 'Member'}`,
      amount: Number(s.amount) || 0
    });
  });

  // Pool Contributions
  groupPools.forEach(p => {
    activities.push({
      type: 'pool',
      timestamp: new Date(p.created_at || 0).getTime(),
      dateStr: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent',
      title: p.title,
      amount: Number(p.total_collected) || 0,
      contributionType: p.contribution_type
    });
  });

  // Sort Chronologically Descending (Newest First)
  activities.sort((a, b) => b.timestamp - a.timestamp);

  if (listEl) {
    if (activities.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 20px 10px; color: var(--text2); font-size: 12px;">
          No activity logs recorded yet for this group.
        </div>
      `;
    } else {
      listEl.innerHTML = activities.map(act => {
        if (act.type === 'expense') {
          return `
            <div class="se-expense-item" style="padding: 10px 12px; background: var(--surface2);">
              <div class="se-exp-left">
                <div style="font-size: 16px;">${getCategoryIcon(act.category)}</div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <div style="font-size: 12px; font-weight: 700; color: var(--text);">${escapeHtml(act.title)}</div>
                  <div style="font-size: 10px; color: var(--text2);">
                    Paid by <b>${escapeHtml(act.payerName)}</b> • ${act.dateStr}
                    ${act.myShare > 0 ? ` • <span style="color:var(--text);">Your share: ${curr}${act.myShare.toFixed(2)}</span>` : ''}
                  </div>
                </div>
              </div>
              <div style="font-size: 13px; font-weight: 800; color: var(--text);">${curr}${act.amount.toFixed(2)}</div>
            </div>
          `;
        } else if (act.type === 'settlement') {
          return `
            <div class="se-expense-item" style="padding: 10px 12px; background: var(--surface2);">
              <div class="se-exp-left">
                <div class="se-avatar" style="background: var(--green); font-size: 11px; width: 28px; height: 28px;">🤝</div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <div style="font-size: 12px; font-weight: 700; color: var(--text);">${escapeHtml(act.title)}</div>
                  <div style="font-size: 10px; color: var(--text2);">Settlement payment on ${act.dateStr}</div>
                </div>
              </div>
              <div class="se-exp-badge" style="background: #22C55E20; color: #22C55E; font-weight: 700; font-size: 11px;">${curr}${act.amount.toFixed(2)}</div>
            </div>
          `;
        } else if (act.type === 'pool') {
          return `
            <div class="se-expense-item" style="padding: 10px 12px; background: var(--surface2);">
              <div class="se-exp-left">
                <div class="se-avatar" style="background: var(--purple, #8B5CF6); font-size: 11px; width: 28px; height: 28px;">🏦</div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <div style="font-size: 12px; font-weight: 700; color: var(--text);">${escapeHtml(act.title)} (Budget Pool)</div>
                  <div style="font-size: 10px; color: var(--text2);">Collected ${act.contributionType === 'perhead' ? 'per member' : 'lump sum'} • ${act.dateStr}</div>
                </div>
              </div>
              <div style="font-size: 13px; font-weight: 800; color: var(--green);">+${curr}${act.amount.toFixed(2)}</div>
            </div>
          `;
        }
      }).join('');
    }
  }

  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
}

function closeBalanceLogsModal() {
  const modal = document.getElementById('se-balance-logs-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
}

function openAddPoolModal() {
  closePoolBreakdownModal();
  const modal = document.getElementById('se-add-pool-modal');
  const titleInput = document.getElementById('se-pool-title-input');
  const amountInput = document.getElementById('se-pool-amount-input');
  const typeSelect = document.getElementById('se-pool-type-select');

  if (titleInput) titleInput.value = '';
  if (amountInput) amountInput.value = '';
  if (typeSelect) typeSelect.value = 'lumpsum';
  updatePoolCalculationDisplay();

  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
}

function closeAddPoolModal() {
  const modal = document.getElementById('se-add-pool-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
}

function updatePoolCalculationDisplay() {
  const typeSelect = document.getElementById('se-pool-type-select');
  const amountInput = document.getElementById('se-pool-amount-input');
  const labelEl = document.getElementById('se-pool-amount-label');
  const infoEl = document.getElementById('se-pool-calc-info');

  if (!typeSelect || !amountInput || !labelEl || !infoEl) return;

  const isPerHead = typeSelect.value === 'perhead';
  const val = Number(amountInput.value) || 0;
  const curr = activeGroup ? activeGroup.currency : '₹';
  const memberCount = groupMembers.length || 1;

  if (isPerHead) {
    labelEl.textContent = 'Amount Per Head (Per Member)';
    infoEl.style.display = 'block';
    const calculatedTotal = val * memberCount;
    infoEl.innerHTML = `👤 <b>${curr}${val.toFixed(2)}</b> per head × <b>${memberCount} members</b> = Total Pool: <b style="color:var(--green);">${curr}${calculatedTotal.toFixed(2)}</b>`;
  } else {
    labelEl.textContent = 'Lump Sum Amount';
    infoEl.style.display = 'none';
  }
}

async function submitAddPoolContribution(e) {
  e.preventDefault();
  if (!currentGroupId) return;

  const titleInput = document.getElementById('se-pool-title-input');
  const typeSelect = document.getElementById('se-pool-type-select');
  const amountInput = document.getElementById('se-pool-amount-input');

  if (!titleInput || !typeSelect || !amountInput) return;

  const title = titleInput.value.trim();
  const contribution_type = typeSelect.value;
  const unitAmount = Number(amountInput.value) || 0;
  if (unitAmount <= 0) return;

  const memberCount = groupMembers.length || 1;
  const total_collected = contribution_type === 'perhead' ? (unitAmount * memberCount) : unitAmount;

  await splitEasyDB.addPoolContribution({
    group_id: currentGroupId,
    title,
    contribution_type,
    amount_per_unit: unitAmount,
    total_collected
  });

  closeAddPoolModal();
  closePoolBreakdownModal();
  await loadActiveGroupData(currentGroupId);

  if (typeof showToast === 'function') {
    showToast('💰 Pool fund contribution added!');
  }
}

async function submitAddChecklistItem(e) {
  e.preventDefault();
  const input = document.getElementById('se-cl-title-input');
  const assignSelect = document.getElementById('se-cl-assign-select');

  if (!input || !input.value.trim() || !currentGroupId) return;

  const title = input.value.trim();
  const assignedTo = assignSelect ? assignSelect.value : null;

  await splitEasyDB.addChecklistItem({
    group_id: currentGroupId,
    title,
    assigned_to_member_id: assignedTo,
    is_completed: false
  });

  await loadActiveGroupData(currentGroupId);
}

async function toggleChecklistItemState(itemId, isCompleted) {
  await splitEasyDB.toggleChecklistItem(itemId, isCompleted);
  await loadActiveGroupData(currentGroupId);
}

async function removeChecklistItem(itemId) {
  if (confirm('Delete this checklist item?')) {
    if (typeof state !== 'undefined' && state.todos) {
      const todoId = 'se-todo-' + itemId;
      state.todos = state.todos.filter(t => t.id !== todoId);
      if (typeof saveState === 'function') saveState();
      if (typeof updateTodoBadge === 'function') updateTodoBadge();
    }
    await splitEasyDB.deleteChecklistItem(itemId);
    await loadActiveGroupData(currentGroupId);
  }
}

/* ============================================================
   GROUP SPENDING & YOUR SPENDING STATS BREAKDOWN MODALS
   ============================================================ */

function openGroupSpendingModal() {
  if (!activeGroup) return;

  const modal = document.getElementById('se-group-spending-modal');
  const membersWrap = document.getElementById('se-group-spending-members');
  const catWrap = document.getElementById('se-group-spending-categories');

  if (!modal || !membersWrap || !catWrap) return;

  const curr = activeGroup.currency || '₹';
  let totalGroupSpent = 0;

  // Calculate member contributions (Who Spent)
  const memberSpentMap = {};
  groupMembers.forEach(m => memberSpentMap[m.id] = 0);

  // Calculate category totals (Where Spent)
  const catSpentMap = {};

  groupExpenses.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    totalGroupSpent += amt;
    if (memberSpentMap[exp.paid_by_member_id] !== undefined) {
      memberSpentMap[exp.paid_by_member_id] += amt;
    }
    const cat = exp.category || 'General';
    catSpentMap[cat] = (catSpentMap[cat] || 0) + amt;
  });

  if (groupMembers.length === 0) {
    membersWrap.innerHTML = `<div style="text-align:center; padding:10px; font-size:12px; color:var(--text2);">No members in group yet.</div>`;
  } else {
    // Render Who Spent
    membersWrap.innerHTML = groupMembers.map(m => {
      const spent = memberSpentMap[m.id] || 0;
      const pct = totalGroupSpent > 0 ? Math.round((spent / totalGroupSpent) * 100) : 0;
      return `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; margin-bottom:2px;">
            <span>${escapeHtml(m.name)} ${m.is_inactive ? '(Removed)' : ''}</span>
            <span>${curr}${spent.toFixed(2)} (${pct}%)</span>
          </div>
          <div style="height:6px; background:var(--surface2); border-radius:3px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:${m.avatar_color || 'var(--accent)'}; border-radius:3px;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  if (Object.keys(catSpentMap).length === 0) {
    catWrap.innerHTML = `<div style="text-align:center; padding:10px; font-size:12px; color:var(--text2);">No category expenses logged yet.</div>`;
  } else {
    // Render Where Spent
    catWrap.innerHTML = Object.entries(catSpentMap).map(([cat, amt]) => {
      const pct = totalGroupSpent > 0 ? Math.round((amt / totalGroupSpent) * 100) : 0;
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--surface2); border-radius:var(--radius-sm);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">${getCategoryIcon(cat)}</span>
            <span style="font-size:12px; font-weight:600;">${cat}</span>
          </div>
          <div style="font-size:12px; font-weight:700;">${curr}${amt.toFixed(2)} <span style="font-size:10px; opacity:0.7;">(${pct}%)</span></div>
        </div>
      `;
    }).join('');
  }

  modal.classList.add('show');
  modal.style.display = 'flex';
}

function closeGroupSpendingModal() {
  const modal = document.getElementById('se-group-spending-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
}

function openUserSpendingModal() {
  if (!activeGroup) return;

  const modal = document.getElementById('se-user-spending-modal');
  const header = document.getElementById('se-user-spending-header');
  const catWrap = document.getElementById('se-user-spending-categories');

  if (!modal || !header || !catWrap) return;

  const curr = activeGroup.currency || '₹';
  const userMember = getLoggedInUserMember();

  let totalPaidByYou = 0;
  const userCatMap = {};

  if (userMember) {
    groupExpenses.forEach(exp => {
      if (exp.paid_by_member_id === userMember.id) {
        const amt = Number(exp.amount) || 0;
        totalPaidByYou += amt;
        const cat = exp.category || 'General';
        userCatMap[cat] = (userCatMap[cat] || 0) + amt;
      }
    });
  }

  header.innerHTML = `
    <div style="font-size: 11px; text-transform: uppercase; color: var(--text2); font-weight: 700;">Total Paid by ${userMember ? escapeHtml(userMember.name) : 'You'}</div>
    <div style="font-size: 22px; font-weight: 800; color: var(--accent); margin-top: 2px;">${curr}${totalPaidByYou.toFixed(2)}</div>
  `;

  if (Object.keys(userCatMap).length === 0) {
    catWrap.innerHTML = `
      <div style="text-align: center; padding: 20px; font-size: 12px; color: var(--text2);">
        You haven't paid for any expenses in this group yet.
      </div>
    `;
  } else {
    catWrap.innerHTML = Object.entries(userCatMap).map(([cat, amt]) => {
      const pct = totalPaidByYou > 0 ? Math.round((amt / totalPaidByYou) * 100) : 0;
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--surface2); border-radius:var(--radius-sm);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">${getCategoryIcon(cat)}</span>
            <span style="font-size:12px; font-weight:600;">${cat}</span>
          </div>
          <div style="font-size:12px; font-weight:700;">${curr}${amt.toFixed(2)} <span style="font-size:10px; opacity:0.7;">(${pct}%)</span></div>
        </div>
      `;
    }).join('');
  }

  modal.classList.add('show');
  modal.style.display = 'flex';
}

function closeUserSpendingModal() {
  const modal = document.getElementById('se-user-spending-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
}

let selectedFriendSuggestions = new Set();

/**
 * Opens Create Group Modal with Template Selection & Friend Suggestions.
 */
async function openCreateGroupModal() {
  selectedFriendSuggestions.clear();
  const modal = document.getElementById('se-create-group-modal');
  const suggestionsWrap = document.getElementById('se-group-friend-suggestions');

  if (suggestionsWrap) {
    suggestionsWrap.innerHTML = '';
    const recentFriends = await splitEasyDB.getRecentFriends();
    if (recentFriends.length > 0) {
      const title = document.createElement('div');
      title.style.fontSize = '12px';
      title.style.fontWeight = '700';
      title.style.color = 'var(--text2)';
      title.style.marginBottom = '6px';
      title.textContent = '⚡ Quick Add Frequent Friends:';
      suggestionsWrap.appendChild(title);

      const chipsWrap = document.createElement('div');
      chipsWrap.style.display = 'flex';
      chipsWrap.style.flexWrap = 'wrap';
      chipsWrap.style.gap = '6px';

      recentFriends.forEach(f => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'btn btn-sm btn-secondary';
        chip.style.borderRadius = '16px';
        chip.innerHTML = `➕ ${escapeHtml(f.name)}`;
        chip.onclick = () => {
          if (selectedFriendSuggestions.has(f.name)) {
            selectedFriendSuggestions.delete(f.name);
            chip.style.background = 'var(--surface2)';
            chip.style.color = 'var(--text)';
            chip.innerHTML = `➕ ${escapeHtml(f.name)}`;
          } else {
            selectedFriendSuggestions.add(f.name);
            chip.style.background = 'var(--green)';
            chip.style.color = '#fff';
            chip.innerHTML = `✓ ${escapeHtml(f.name)}`;
          }
        };
        chipsWrap.appendChild(chip);
      });
      suggestionsWrap.appendChild(chipsWrap);
    }
  }

  if (modal) modal.style.display = 'flex';
}

function closeCreateGroupModal() {
  const modal = document.getElementById('se-create-group-modal');
  if (modal) modal.style.display = 'none';
}

function getUserIdentityName() {
  if (typeof state !== 'undefined') {
    if (state.name && state.name.trim()) return state.name.trim();
    if (state.userEmail && state.userEmail.trim()) return state.userEmail.split('@')[0];
  }
  return 'You';
}

async function submitCreateGroup(e) {
  e.preventDefault();
  const nameInput = document.getElementById('se-new-group-name');
  const tplSelect = document.getElementById('se-new-group-template');
  const currSelect = document.getElementById('se-new-group-currency');

  if (!nameInput || !nameInput.value.trim()) return;

  const userName = getUserIdentityName();
  const userEmail = (typeof state !== 'undefined' && state.userEmail) ? state.userEmail : '';
  const newGrp = await splitEasyDB.createGroup(nameInput.value.trim(), tplSelect.value, currSelect.value);
  await splitEasyDB.addMember(newGrp.id, userEmail, userName, '#2D6BE4');

  // Add all selected friend suggestions
  const colors = ['#22C55E', '#8B5CF6', '#F97316', '#EF4444', '#EAB308'];
  let cIdx = 0;
  for (const fName of selectedFriendSuggestions) {
    await splitEasyDB.addMember(newGrp.id, fName, colors[cIdx % colors.length]);
    cIdx++;
  }

  closeCreateGroupModal();
  currentGroupId = newGrp.id;
  await initSplitEasyData();
}

/**
 * Opens Add Expense Modal.
 */
function handleSplitModeChange(mode, target = 'add') {
  const boxId = target === 'edit' ? 'se-edit-custom-split-box' : 'se-custom-split-box';
  const box = document.getElementById(boxId);
  if (box) {
    box.style.display = mode === 'custom' ? 'block' : 'none';
  }
}

function toggleSelectAllSplitMembers(target = 'add') {
  const selector = target === 'edit' ? '.se-edit-split-member-cb' : '.se-split-member-cb';
  const checkboxes = document.querySelectorAll(selector);
  if (checkboxes.length === 0) return;
  const anyUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
  checkboxes.forEach(cb => cb.checked = anyUnchecked);
}

let customGroupCategories = new Set();

function populateCategorySelect(selectEl, selectedCat = '') {
  if (!selectEl || !activeGroup) return;

  const tpl = TEMPLATES[activeGroup.template_type] || TEMPLATES.custom;
  const categories = new Set(tpl.categories);

  // Add custom categories from expenses & user additions
  groupExpenses.forEach(exp => {
    if (exp.category) categories.add(exp.category);
  });
  customGroupCategories.forEach(c => categories.add(c));

  if (selectedCat) categories.add(selectedCat);

  let html = Array.from(categories).map(c => `<option value="${c}" ${c === selectedCat ? 'selected' : ''}>${getCategoryIcon(c)} ${c}</option>`).join('');
  html += `<option value="__ADD_NEW__">➕ Add Custom Category...</option>`;

  selectEl.innerHTML = html;
  if (selectedCat && categories.has(selectedCat)) {
    selectEl.value = selectedCat;
  }
}

function handleCategorySelectChange(selectEl) {
  if (!selectEl) return;
  if (selectEl.value === '__ADD_NEW__') {
    const customName = prompt('Enter custom category name (e.g., Shopping, Gaming, Drinks):');
    if (customName && customName.trim()) {
      const cleanName = customName.trim();
      customGroupCategories.add(cleanName);
      populateCategorySelect(selectEl, cleanName);
    } else {
      selectEl.selectedIndex = 0;
    }
  }
}

function handlePayerSelectChange(payerSelectEl) {
  if (!payerSelectEl) return;
  const isPool = (payerSelectEl.value === '__POOL__');
  
  const modal = payerSelectEl.closest('.se-modal');
  if (!modal) return;

  const toggle = modal.querySelector('#se-include-payer-toggle, #se-edit-include-payer');
  const toggleWrap = toggle ? toggle.closest('.se-toggle-wrapper') : null;

  if (isPool) {
    if (toggle) toggle.checked = false;
    if (toggleWrap) {
      toggleWrap.style.opacity = '0.6';
      toggleWrap.style.pointerEvents = 'none';
      const titleSpan = toggleWrap.querySelector('.se-toggle-title');
      if (titleSpan) titleSpan.textContent = 'Paid from Group Pool (Payer Excluded)';
    }
  } else {
    if (toggle) toggle.checked = true;
    if (toggleWrap) {
      toggleWrap.style.opacity = '1';
      toggleWrap.style.pointerEvents = 'auto';
      const titleSpan = toggleWrap.querySelector('.se-toggle-title');
      if (titleSpan) titleSpan.textContent = 'Include Payer in Split';
    }
  }
}

function openAddExpenseModal() {
  const activeMembers = groupMembers.filter(m => !m.is_inactive);
  if (activeMembers.length === 0) {
    alert('Please add active members to the group first!');
    return;
  }

  const modal = document.getElementById('se-add-expense-modal');
  const categorySelect = document.getElementById('se-expense-category');
  const payerSelect = document.getElementById('se-expense-payer');
  const splitModeSelect = document.getElementById('se-expense-split-mode');
  const customCbWrap = document.getElementById('se-custom-split-checkboxes');
  const customBox = document.getElementById('se-custom-split-box');

  if (categorySelect && activeGroup) {
    populateCategorySelect(categorySelect);
  }

  if (payerSelect) {
    const curr = activeGroup ? activeGroup.currency : '₹';
    const totalPoolCollected = groupPools.reduce((sum, p) => sum + (Number(p.total_collected) || 0), 0);
    const poolSpent = groupExpenses.filter(e => e.paid_by_member_id === '__POOL__').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const poolAvail = totalPoolCollected - poolSpent;

    let opts = groupMembers.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
    opts += `<option value="__POOL__">🏦 Group Pool Fund (${curr}${poolAvail.toFixed(2)} available)</option>`;
    payerSelect.innerHTML = opts;
    handlePayerSelectChange(payerSelect);
  }

  if (splitModeSelect) {
    splitModeSelect.value = 'all';
  }
  if (customBox) {
    customBox.style.display = 'none';
  }

  if (customCbWrap) {
    customCbWrap.innerHTML = groupMembers.map(m => `
      <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;">
        <input type="checkbox" class="se-split-member-cb" value="${m.id}" checked>
        <span>${escapeHtml(m.name)}</span>
      </label>
    `).join('');
  }

  if (modal) modal.style.display = 'flex';
}

function closeAddExpenseModal() {
  const modal = document.getElementById('se-add-expense-modal');
  if (modal) modal.style.display = 'none';
}

/**
 * Submit New Expense with Custom Member Selection & "Include Me" toggle handling.
 */
async function submitAddExpense(e) {
  e.preventDefault();
  const title = document.getElementById('se-exp-title-input').value;
  const amount = Number(document.getElementById('se-exp-amount-input').value);
  const payerId = document.getElementById('se-expense-payer').value;
  const category = document.getElementById('se-expense-category').value;
  const includePayer = document.getElementById('se-include-payer-toggle').checked;
  const splitMode = document.getElementById('se-expense-split-mode').value;

  if (!title || !amount || amount <= 0) return;

  let selectedMemberIds = [];
  if (splitMode === 'custom') {
    const checkedCbs = document.querySelectorAll('.se-split-member-cb:checked');
    selectedMemberIds = Array.from(checkedCbs).map(cb => cb.value);
    if (selectedMemberIds.length === 0) {
      alert('Please select at least one member to include in the split!');
      return;
    }
  } else {
    const activeMembers = groupMembers.filter(m => !m.is_inactive);
    selectedMemberIds = activeMembers.map(m => m.id);
  }

  const splits = (payerId === '__POOL__') ? [] : calculateSplitAmounts(amount, selectedMemberIds, payerId, includePayer, 'equal');

  const newExp = await splitEasyDB.addExpense({
    group_id: currentGroupId,
    title,
    amount,
    paid_by_member_id: payerId,
    include_payer: includePayer,
    category,
    split_type: splitMode === 'custom' ? 'custom' : 'equal'
  }, splits);

  // --- DAYFLOW MAIN EXPENSE TRACKER INTEGRATION ---
  try {
    const userMember = groupMembers[0];
    if (userMember && window.logPersonalExpenseFromSplitEasy && payerId !== '__POOL__') {
      const userSplit = splits.find(s => s.member_id === userMember.id);
      const personalAmt = userSplit ? userSplit.split_amount : (payerId === userMember.id ? amount : 0);
      if (personalAmt > 0) {
        window.logPersonalExpenseFromSplitEasy(title, personalAmt, category);
      }
    }
  } catch (err) {
    console.warn('DayFlow personal expense sync failed:', err);
  }

  closeAddExpenseModal();
  await loadActiveGroupData(currentGroupId);
}

function openEditExpenseModal(expId) {
  const exp = groupExpenses.find(e => e.id === expId);
  if (!exp) return;

  const modal = document.getElementById('se-edit-expense-modal');
  const idInput = document.getElementById('se-edit-exp-id');
  const titleInput = document.getElementById('se-edit-exp-title');
  const amountInput = document.getElementById('se-edit-exp-amount');
  const payerSelect = document.getElementById('se-edit-exp-payer');
  const categorySelect = document.getElementById('se-edit-exp-category');
  const splitModeSelect = document.getElementById('se-edit-exp-split-mode');
  const includePayerCb = document.getElementById('se-edit-include-payer');
  const customCbWrap = document.getElementById('se-edit-custom-split-checkboxes');
  const customBox = document.getElementById('se-edit-custom-split-box');

  if (idInput) idInput.value = exp.id;
  if (titleInput) titleInput.value = exp.title;
  if (amountInput) amountInput.value = exp.amount;

  if (categorySelect && activeGroup) {
    populateCategorySelect(categorySelect, exp.category);
  }

  if (payerSelect) {
    const curr = activeGroup ? activeGroup.currency : '₹';
    const totalPoolCollected = groupPools.reduce((sum, p) => sum + (Number(p.total_collected) || 0), 0);
    const poolSpent = groupExpenses.filter(e => e.paid_by_member_id === '__POOL__').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const poolAvail = totalPoolCollected - poolSpent;

    let opts = groupMembers.map(m => `<option value="${m.id}" ${m.id === exp.paid_by_member_id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('');
    opts += `<option value="__POOL__" ${exp.paid_by_member_id === '__POOL__' ? 'selected' : ''}>🏦 Group Pool Fund (${curr}${poolAvail.toFixed(2)} available)</option>`;
    payerSelect.innerHTML = opts;
    handlePayerSelectChange(payerSelect);
  }

  if (includePayerCb) {
    includePayerCb.checked = exp.include_payer !== undefined ? exp.include_payer : true;
  }

  const isCustom = exp.split_type === 'custom' || (exp.splits && exp.splits.length < groupMembers.length);
  if (splitModeSelect) {
    splitModeSelect.value = isCustom ? 'custom' : 'all';
  }
  if (customBox) {
    customBox.style.display = isCustom ? 'block' : 'none';
  }

  const activeSplitMemberIds = new Set(exp.splits ? exp.splits.map(s => s.member_id) : groupMembers.map(m => m.id));
  if (customCbWrap) {
    customCbWrap.innerHTML = groupMembers.map(m => `
      <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;">
        <input type="checkbox" class="se-edit-split-member-cb" value="${m.id}" ${activeSplitMemberIds.has(m.id) ? 'checked' : ''}>
        <span>${escapeHtml(m.name)}</span>
      </label>
    `).join('');
  }

  if (modal) modal.style.display = 'flex';
}

function closeEditExpenseModal() {
  const modal = document.getElementById('se-edit-expense-modal');
  if (modal) modal.style.display = 'none';
}

async function submitEditExpense(e) {
  e.preventDefault();
  const expId = document.getElementById('se-edit-exp-id').value;
  const title = document.getElementById('se-edit-exp-title').value;
  const amount = Number(document.getElementById('se-edit-exp-amount').value);
  const payerId = document.getElementById('se-edit-exp-payer').value;
  const category = document.getElementById('se-edit-exp-category').value;
  const includePayer = document.getElementById('se-edit-include-payer').checked;
  const splitMode = document.getElementById('se-edit-exp-split-mode').value;

  if (!expId || !title || !amount || amount <= 0) return;

  let selectedMemberIds = [];
  if (splitMode === 'custom') {
    const checkedCbs = document.querySelectorAll('.se-edit-split-member-cb:checked');
    selectedMemberIds = Array.from(checkedCbs).map(cb => cb.value);
    if (selectedMemberIds.length === 0) {
      alert('Please select at least one member to include in the split!');
      return;
    }
  } else {
    selectedMemberIds = groupMembers.map(m => m.id);
  }

  const splits = (payerId === '__POOL__') ? [] : calculateSplitAmounts(amount, selectedMemberIds, payerId, includePayer, 'equal');

  await splitEasyDB.updateExpense(expId, {
    title,
    amount,
    paid_by_member_id: payerId,
    include_payer: includePayer,
    category,
    split_type: splitMode === 'custom' ? 'custom' : 'equal'
  }, splits);

  closeEditExpenseModal();
  await loadActiveGroupData(currentGroupId);
}

async function submitDeleteExpense() {
  const expId = document.getElementById('se-edit-exp-id').value;
  if (!expId) return;

  if (confirm('Are you sure you want to delete this expense?')) {
    await splitEasyDB.deleteExpense(expId);
    closeEditExpenseModal();
    await loadActiveGroupData(currentGroupId);
  }
}

/**
 * Open Settle Up Modal.
 */

let pendingSettle = null;
function openSettleUpModal(fromId, toId, amount) {
  pendingSettle = { fromId, toId, amount };
  const fromMem = groupMembers.find(m => m.id === fromId);
  const toMem = groupMembers.find(m => m.id === toId);

  if (confirm(`Confirm settlement payment: ${fromMem?.name} pays ${activeGroup.currency}${amount.toFixed(2)} to ${toMem?.name}?`)) {
    confirmSettlement();
  }
}

async function confirmSettlement() {
  if (!pendingSettle) return;
  await splitEasyDB.addSettlement(currentGroupId, pendingSettle.fromId, pendingSettle.toId, pendingSettle.amount);
  pendingSettle = null;
  await loadActiveGroupData(currentGroupId);
}

/**
 * Category icon helper.
 */
/**
 * Opens Supabase DB Config Modal.
 */
function openSupabaseSettingsModal() {
  const modal = document.getElementById('se-supabase-modal');
  const config = splitEasyDB.getSupabaseConfig();
  const urlInput = document.getElementById('se-supabase-url');
  const keyInput = document.getElementById('se-supabase-key');
  const statusEl = document.getElementById('se-supabase-status');

  if (config) {
    if (urlInput) urlInput.value = config.url || '';
    if (keyInput) keyInput.value = config.key || '';
    if (statusEl) {
      statusEl.textContent = '🟢 Connected to Supabase Cloud DB';
      statusEl.style.color = 'var(--green)';
    }
  } else {
    if (statusEl) {
      statusEl.textContent = '🟡 Operating in Local-First Mode (IndexedDB / LocalStorage)';
      statusEl.style.color = 'var(--orange)';
    }
  }

  if (modal) modal.style.display = 'flex';
}

function closeSupabaseSettingsModal() {
  const modal = document.getElementById('se-supabase-modal');
  if (modal) modal.style.display = 'none';
}

function submitSupabaseSettings(e) {
  e.preventDefault();
  const url = document.getElementById('se-supabase-url').value.trim();
  const key = document.getElementById('se-supabase-key').value.trim();
  const statusEl = document.getElementById('se-supabase-status');

  if (!url || !key) {
    alert('Please enter both Supabase URL and Anon Key');
    return;
  }

  const success = splitEasyDB.setSupabaseConfig(url, key);
  if (success) {
    if (statusEl) {
      statusEl.textContent = '🟢 Successfully connected to Supabase!';
      statusEl.style.color = 'var(--green)';
    }
    setTimeout(() => {
      closeSupabaseSettingsModal();
      initSplitEasyData();
    }, 800);
  } else {
    if (statusEl) {
      statusEl.textContent = '🔴 Failed to connect. Check your URL & Key.';
      statusEl.style.color = 'var(--red)';
    }
  }
}

function disconnectSupabase() {
  splitEasyDB.setSupabaseConfig(null, null);
  document.getElementById('se-supabase-url').value = '';
  document.getElementById('se-supabase-key').value = '';
  const statusEl = document.getElementById('se-supabase-status');
  if (statusEl) {
    statusEl.textContent = '🟡 Disconnected. Operating in Local-First Mode.';
    statusEl.style.color = 'var(--orange)';
  }
}

function getCategoryIcon(cat = '') {
  const icons = {
    'Travel': '🚗', 'Hotel': '🏨', 'Food': '🍲', 'Sightseeing': '📸', 'Fuel': '⛽',
    'Rent': '🏠', 'Electricity': '⚡', 'WiFi': '📶', 'Groceries': '🛒', 'Maid': '🧹',
    'Drinks': '🍹', 'Tickets': '🎟️', 'Cabs': '🚕', 'General': '💸', 'Other': '📦'
  };
  return icons[cat] || '💸';
}

function escapeHtml(str = '') {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Initializes Touch-based Pull-To-Refresh for SplitEasy mobile & desktop views.
 */
function initPullToRefresh() {
  const body = document.querySelector('#splitease-app .se-body');
  const ptr = document.getElementById('se-ptr-indicator');
  if (!body || !ptr || ptr.dataset.initialized === 'true') return;

  ptr.dataset.initialized = 'true';
  const text = ptr.querySelector('.se-ptr-text');
  const spinner = ptr.querySelector('.se-ptr-spinner');

  let startY = 0;
  let currentY = 0;
  let isPulling = false;
  let isRefreshing = false;
  const THRESHOLD = 60;

  body.addEventListener('touchstart', (e) => {
    // Ignore touchstart on buttons, inputs, selects, cards, modals and tabs
    if (e.target.closest('button, input, select, textarea, label, .btn, .se-icon-btn, .se-tab-btn, .se-modal, .se-expense-item, .se-stat-card, .se-debt-card')) {
      isPulling = false;
      return;
    }

    if (body.scrollTop <= 2 && !isRefreshing) {
      startY = e.touches[0].clientY;
      currentY = startY;
      isPulling = true;
    }
  }, { passive: true });

  body.addEventListener('touchmove', (e) => {
    if (!isPulling || isRefreshing) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0 && body.scrollTop <= 2) {
      const pullDistance = Math.min(diff * 0.45, 75);
      ptr.style.height = `${pullDistance}px`;
      ptr.classList.add('visible');

      if (pullDistance >= THRESHOLD) {
        if (text) text.textContent = 'Release to refresh';
        if (spinner) spinner.style.transform = 'rotate(180deg)';
      } else {
        if (text) text.textContent = 'Pull down to refresh';
        if (spinner) spinner.style.transform = 'rotate(0deg)';
      }
    }
  }, { passive: true });

  body.addEventListener('touchend', async () => {
    if (!isPulling || isRefreshing) return;
    isPulling = false;
    const diff = currentY - startY;
    const pullDistance = Math.min(diff * 0.45, 75);

    if (pullDistance >= THRESHOLD && body.scrollTop <= 2) {
      isRefreshing = true;
      ptr.style.height = '42px';
      if (text) text.textContent = 'Refreshing data...';
      if (spinner) {
        spinner.classList.add('spinning');
        spinner.style.transform = 'rotate(0deg)';
      }

      try {
        await initSplitEasyData();
      } catch (err) {
        console.warn('Pull-to-refresh failed:', err);
      }

      setTimeout(() => {
        ptr.style.height = '0px';
        ptr.classList.remove('visible');
        if (spinner) spinner.classList.remove('spinning');
        if (text) text.textContent = 'Pull down to refresh';
        isRefreshing = false;
      }, 500);
    } else {
      ptr.style.height = '0px';
      ptr.classList.remove('visible');
    }
  });
}
