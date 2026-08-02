// ============================================================
// SPLITEASY - MAIN APPLICATION CONTROLLER & UI BINDER
// ============================================================

let currentGroupId = null;
let currentTab = 'expenses'; // 'expenses', 'debts', 'members'
let activeGroup = null;
let groupMembers = [];
let groupExpenses = [];
let groupSettlements = [];

const TEMPLATES = {
  tour: { name: 'Tour / Trip', icon: '🌴', colorClass: 'se-template-tour', categories: ['Travel', 'Hotel', 'Food', 'Sightseeing', 'Fuel', 'Misc'] },
  flat: { name: 'Flat / Apartment', icon: '🏠', colorClass: 'se-template-flat', categories: ['Rent', 'Electricity', 'WiFi', 'Groceries', 'Maid', 'Misc'] },
  outing: { name: 'Outing / Party', icon: '🎉', colorClass: 'se-template-outing', categories: ['Drinks', 'Food', 'Tickets', 'Cabs', 'Misc'] },
  custom: { name: 'Custom Group', icon: '⚙️', colorClass: 'se-template-custom', categories: ['General', 'Food', 'Transport', 'Shopping', 'Other'] }
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
  const groups = await splitEasyDB.getGroups();
  const selectEl = document.getElementById('se-group-select');

  if (!selectEl) return;

  selectEl.innerHTML = '';
  
  if (groups.length === 0) {
    currentGroupId = null;
    activeGroup = null;
    groupMembers = [];
    groupExpenses = [];
    groupSettlements = [];
    updateUIElementsVisibility();
    renderGroupHeader();
    renderGroupStats();
    renderTabContent();
    return;
  }

  groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${TEMPLATES[g.template_type]?.icon || '🤝'} ${g.name}`;
    selectEl.appendChild(opt);
  });

  if (!currentGroupId || !groups.find(g => g.id === currentGroupId)) {
    currentGroupId = groups[0].id;
  }

  selectEl.value = currentGroupId;
  await loadActiveGroupData(currentGroupId);
}

/**
 * Loads group members, expenses, settlements and renders view.
 */
async function loadActiveGroupData(groupId) {
  updateSyncIndicator();
  currentGroupId = groupId;
  const groups = await splitEasyDB.getGroups();
  activeGroup = groups.find(g => g.id === groupId);

  if (!activeGroup) {
    currentGroupId = null;
    groupMembers = [];
    groupExpenses = [];
    groupSettlements = [];
  } else {
    groupMembers = await splitEasyDB.getMembers(groupId);
    groupExpenses = await splitEasyDB.getExpenses(groupId);
    groupSettlements = await splitEasyDB.getSettlements(groupId);
  }

  renderGroupHeader();
  renderGroupStats();
  renderTabContent();
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
    shareCodeEl.textContent = activeGroup ? `Code: ${activeGroup.share_code}` : '';
  }
}

/**
 * Renders 3 parallel balance cards (Total Group Spent, You Spent, Your Balance).
 */
function renderGroupStats() {
  const curr = activeGroup ? activeGroup.currency : '₹';
  const balances = calculateNetBalances(groupMembers, groupExpenses, groupSettlements);
  
  // 1. Total Group Spent
  const totalExp = groupExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalExpEl = document.getElementById('se-stat-total-exp');
  if (totalExpEl) totalExpEl.textContent = `${curr}${totalExp.toFixed(2)}`;

  // 2. You Spent (Amount paid by current user)
  const userMember = groupMembers[0];
  const userPaid = userMember ? groupExpenses.filter(e => e.paid_by_member_id === userMember.id).reduce((sum, e) => sum + (Number(e.amount) || 0), 0) : 0;
  const youSpentEl = document.getElementById('se-stat-you-spent');
  if (youSpentEl) youSpentEl.textContent = `${curr}${userPaid.toFixed(2)}`;

  // 3. Your Balance
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
        <div style="font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 4px;">Welcome to SplitEasy</div>
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

  const joinedGrp = await splitEasyDB.joinGroupByShareCode(code, userEmail, userName);
  if (joinedGrp) {
    currentGroupId = joinedGrp.id;
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

  const joinedGrp = await splitEasyDB.joinGroupByShareCode(code, userEmail, userName);
  if (joinedGrp) {
    closeCreateGroupModal();
    currentGroupId = joinedGrp.id;
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
    const payer = groupMembers.find(m => m.id === exp.paid_by_member_id);
    const item = document.createElement('div');
    item.className = 'se-expense-item';
    item.innerHTML = `
      <div class="se-exp-left">
        <div class="se-exp-icon">${getCategoryIcon(exp.category)}</div>
        <div class="se-exp-details">
          <div class="se-exp-title">${escapeHtml(exp.title)}</div>
          <div class="se-exp-sub">Paid by <strong>${escapeHtml(payer ? payer.name : 'Unknown')}</strong> • ${exp.date} ${exp.include_payer ? '(Inc. Payer)' : '(Excl. Payer)'}</div>
        </div>
      </div>
      <div class="se-exp-right">
        <div class="se-exp-amount">${activeGroup.currency}${Number(exp.amount).toFixed(2)}</div>
        <div class="se-exp-badge">${exp.category}</div>
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

  if (transactions.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--green);">
        <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
        <div style="font-size: 18px; font-weight: 800;">Everyone is settled up!</div>
        <div style="font-size: 13px; color: var(--text2);">No outstanding payments required.</div>
      </div>
    `;
    return;
  }

  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '12px';

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

  container.appendChild(wrap);
}

/**
 * Renders member roster.
 */
function renderMembersList(container) {
  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '10px';

  groupMembers.forEach((m, idx) => {
    const item = document.createElement('div');
    item.className = 'se-expense-item';
    const canDelete = idx > 0; // Admin (first member) cannot delete themselves
    item.innerHTML = `
      <div class="se-exp-left">
        <div class="se-avatar" style="background: ${m.avatar_color || '#2D6BE4'};">${m.name.charAt(0).toUpperCase()}</div>
        <div style="display:flex; flex-direction:column;">
          <div class="se-exp-title">${escapeHtml(m.name)} ${idx === 0 ? '<span style="font-size:11px; opacity:0.7;">(Admin)</span>' : ''}</div>
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
 * Remove member from group.
 */
async function removeMember(memberId, memberName) {
  if (confirm(`Are you sure you want to remove ${memberName} from this group?`)) {
    await splitEasyDB.deleteMember(memberId);
    await loadActiveGroupData(currentGroupId);
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
  const newGrp = await splitEasyDB.createGroup(nameInput.value.trim(), tplSelect.value, currSelect.value);
  await splitEasyDB.addMember(newGrp.id, `${userName} (Payer)`, '#2D6BE4');

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
function openAddExpenseModal() {
  if (groupMembers.length === 0) {
    alert('Please add members to the group first!');
    return;
  }

  const modal = document.getElementById('se-add-expense-modal');
  const categorySelect = document.getElementById('se-expense-category');
  const payerSelect = document.getElementById('se-expense-payer');

  if (categorySelect && activeGroup) {
    const tpl = TEMPLATES[activeGroup.template_type] || TEMPLATES.custom;
    categorySelect.innerHTML = tpl.categories.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  if (payerSelect) {
    payerSelect.innerHTML = groupMembers.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
  }

  if (modal) modal.style.display = 'flex';
}

function closeAddExpenseModal() {
  const modal = document.getElementById('se-add-expense-modal');
  if (modal) modal.style.display = 'none';
}

/**
 * Submit New Expense with "Include Me" toggle handling.
 */
async function submitAddExpense(e) {
  e.preventDefault();
  const title = document.getElementById('se-exp-title-input').value;
  const amount = Number(document.getElementById('se-exp-amount-input').value);
  const payerId = document.getElementById('se-expense-payer').value;
  const category = document.getElementById('se-expense-category').value;
  const includePayer = document.getElementById('se-include-payer-toggle').checked;

  if (!title || !amount || amount <= 0) return;

  const memberIds = groupMembers.map(m => m.id);
  const splits = calculateSplitAmounts(amount, memberIds, payerId, includePayer, 'equal');

  const newExp = await splitEasyDB.addExpense({
    group_id: currentGroupId,
    title,
    amount,
    paid_by_member_id: payerId,
    include_payer: includePayer,
    category,
    split_type: 'equal'
  }, splits);

  // --- DAYFLOW MAIN EXPENSE TRACKER INTEGRATION ---
  try {
    // If payer is 'You' (first member), calculate user's share and log to DayFlow
    const userMember = groupMembers[0];
    if (userMember && window.logPersonalExpenseFromSplitEasy) {
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
