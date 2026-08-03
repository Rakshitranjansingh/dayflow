// ============================================================
// SPLITEASY - DATABASE ADAPTER (SUPABASE + LOCALSTORAGE FALLBACK)
// ============================================================

// Default Supabase Cloud DB credentials for Option A (Pre-filled out-of-the-box access)
const DEFAULT_SUPABASE_URL = "https://bfrmezyvfyzetzxdepdk.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_68W9NaVNNUrM4U5Hwl9owQ_6PGlChG6";

const STORAGE_KEYS = {
  GROUPS: 'dayflow_splitease_groups',
  MEMBERS: 'dayflow_splitease_members',
  EXPENSES: 'dayflow_splitease_expenses',
  SETTLEMENTS: 'dayflow_splitease_settlements',
  CHECKLISTS: 'dayflow_splitease_checklists',
  POOLS: 'dayflow_splitease_pools',
  SUPABASE_CONFIG: 'dayflow_splitease_supabase_config'
};

class SplitEasyDBAdapter {
  constructor() {
    this.supabaseClient = null;
    this.initSupabaseFromStorage();
  }

  /**
   * Initializes Supabase Client using custom storage or Option A default credentials.
   */
  initSupabaseFromStorage() {
    try {
      let url = DEFAULT_SUPABASE_URL;
      let key = DEFAULT_SUPABASE_ANON_KEY;

      const configStr = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
      if (configStr) {
        const parsed = JSON.parse(configStr);
        if (parsed.url && parsed.key) {
          url = parsed.url;
          key = parsed.key;
        }
      }

      if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
        this.supabaseClient = window.supabase.createClient(url, key);
        console.log('[SplitEasy] Supabase Client Connected successfully');
      }
    } catch (e) {
      console.warn('[SplitEasy] Failed to initialize Supabase client:', e);
    }
  }

  /**
   * Configures Supabase cloud credentials dynamically.
   */
  setSupabaseConfig(url, key) {
    if (!url || !key) {
      localStorage.removeItem(STORAGE_KEYS.SUPABASE_CONFIG);
      this.supabaseClient = null;
      return false;
    }
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify({ url, key }));
    this.initSupabaseFromStorage();
    return !!this.supabaseClient;
  }

  getSupabaseConfig() {
    try {
      const str = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
      return str ? JSON.parse(str) : null;
    } catch (e) {
      return null;
    }
  }

  isSupabaseConnected() {
    return !!this.supabaseClient;
  }

  // --- LOCAL STORAGE HELPERS ---

  _get(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return defaultValue;
    }
  }

  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e);
    }
  }

  _generateId() {
    return 'se_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  _generateShareCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // --- GROUP OPERATIONS ---

  async getGroups(userEmail = '', userName = '') {
    this.purgeLegacySampleData();
    let allGroups = [];
    let allMembers = [];

    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const cleanName = (userName || '').trim().toLowerCase();

    if (this.supabaseClient) {
      try {
        const [grpRes, memRes] = await Promise.all([
          this.supabaseClient.from('splitease_groups').select('*').order('created_at', { ascending: false }),
          this.supabaseClient.from('splitease_members').select('*')
        ]);
        if (!grpRes.error && grpRes.data) {
          allGroups = grpRes.data;
          this._set(STORAGE_KEYS.GROUPS, grpRes.data);
        }
        if (!memRes.error && memRes.data) {
          allMembers = memRes.data;
          this._set(STORAGE_KEYS.MEMBERS, memRes.data);
        }
      } catch (err) {
        console.warn('Supabase fetch groups failed, using local cache:', err);
        allGroups = this._get(STORAGE_KEYS.GROUPS);
        allMembers = this._get(STORAGE_KEYS.MEMBERS);
      }
    } else {
      allGroups = this._get(STORAGE_KEYS.GROUPS);
      allMembers = this._get(STORAGE_KEYS.MEMBERS);
    }

    const userGroupIds = new Set();

    allMembers.forEach(m => {
      if (m.is_inactive) return; // Inactive / removed members lose access!

      const mEmail = (m.email || '').trim().toLowerCase();
      const mName = (m.name || '').trim().toLowerCase();

      const isEmailMatch = Boolean(cleanEmail && mEmail && mEmail === cleanEmail);
      const isNameMatch = Boolean(cleanName && mName && (mName === cleanName || mName.startsWith(cleanName)));

      // Auto-backfill email for legacy member rows if missing
      if (!mEmail && cleanEmail && isNameMatch) {
        m.email = cleanEmail;
        if (this.supabaseClient) {
          this.supabaseClient.from('splitease_members').update({ email: cleanEmail }).eq('id', m.id).then(() => {});
        }
      }

      if (isEmailMatch || isNameMatch || (!cleanEmail && !cleanName)) {
        userGroupIds.add(m.group_id);
      }
    });

    // Fallback for local cache groups created on this device
    const localGroups = this._get(STORAGE_KEYS.GROUPS);
    localGroups.forEach(g => {
      userGroupIds.add(g.id);
    });

    return allGroups.filter(g => userGroupIds.has(g.id));
  }

  async createGroup(name, templateType = 'custom', currency = '₹') {
    const newGroup = {
      id: this._generateId(),
      name,
      template_type: templateType,
      currency,
      share_code: this._generateShareCode(),
      created_at: new Date().toISOString()
    };

    // Save locally
    const groups = this._get(STORAGE_KEYS.GROUPS);
    groups.unshift(newGroup);
    this._set(STORAGE_KEYS.GROUPS, groups);

    // Sync to Supabase if connected
    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('splitease_groups').insert([newGroup]);
      } catch (err) {
        console.warn('Failed to insert group into Supabase:', err);
      }
    }

    return newGroup;
  }

  async joinGroupByShareCode(shareCode, userEmail = '', userName = '') {
    const cleanCode = (shareCode || '').trim().toUpperCase();
    if (!cleanCode) return null;

    let targetGroup = null;

    if (this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('splitease_groups')
          .select('*')
          .eq('share_code', cleanCode)
          .single();
        if (!error && data) {
          targetGroup = data;
        }
      } catch (e) {
        console.warn('Supabase share code search failed:', e);
      }
    }

    if (!targetGroup) {
      const allGroups = this._get(STORAGE_KEYS.GROUPS);
      targetGroup = allGroups.find(g => g.share_code === cleanCode);
    }

    if (!targetGroup) return null;

    const members = await this.getMembers(targetGroup.id);
    const cleanUserEmail = (userEmail || '').trim().toLowerCase();
    const cleanUserName = (userName || '').trim().toLowerCase();

    const existing = members.find(m => {
      const mEmail = (m.email || '').trim().toLowerCase();
      const mName = (m.name || '').trim().toLowerCase();
      return (cleanUserEmail && mEmail && mEmail === cleanUserEmail) || (cleanUserName && mName && mName === cleanUserName);
    });

    // BLOCK RE-JOIN IF MEMBER WAS REMOVED / MARKED INACTIVE
    if (existing) {
      if (existing.is_inactive) {
        return {
          error: 'INACTIVE_MEMBER',
          message: 'Your membership in this group is inactive. Please ask an existing group member or admin to add you back using your Email ID.'
        };
      }
      return targetGroup;
    }

    const localGroups = this._get(STORAGE_KEYS.GROUPS);
    if (!localGroups.find(g => g.id === targetGroup.id)) {
      localGroups.unshift(targetGroup);
      this._set(STORAGE_KEYS.GROUPS, localGroups);
    }

    const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Member');
    const colors = ['#2D6BE4', '#22C55E', '#8B5CF6', '#F97316', '#EF4444'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    await this.addMember(targetGroup.id, userEmail, displayName, avatarColor);

    return targetGroup;
  }

  // --- MEMBER OPERATIONS ---

  async getMembers(groupId) {
    if (this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('splitease_members')
          .select('*')
          .eq('group_id', groupId);
        if (!error && data) {
          const allMembers = this._get(STORAGE_KEYS.MEMBERS).filter(m => m.group_id !== groupId);
          this._set(STORAGE_KEYS.MEMBERS, [...allMembers, ...data]);
          return data;
        }
      } catch (err) {
        console.warn('Supabase fetch members failed:', err);
      }
    }

    const allMembers = this._get(STORAGE_KEYS.MEMBERS);
    return allMembers.filter(m => m.group_id === groupId);
  }

  async addMember(groupId, param2 = '', param3 = '', avatarColor = '#2D6BE4') {
    let email = '';
    let name = '';

    if (param2 && param2.includes('@')) {
      email = param2.trim();
      name = param3 ? param3.trim() : email.split('@')[0];
    } else {
      name = param2 ? param2.trim() : (param3 && param3.includes('@') ? param3.split('@')[0] : 'Member');
      email = param3 && param3.includes('@') ? param3.trim() : '';
    }

    // Sanitize name if hex color was passed by mistake
    if (name.startsWith('#') && name.length === 7) {
      name = 'Member';
    }

    // Check if member already exists (even if inactive) and reactivate
    const allMembers = this._get(STORAGE_KEYS.MEMBERS);
    const cleanEmail = (email || '').trim().toLowerCase();
    const existingIdx = allMembers.findIndex(m => m.group_id === groupId && cleanEmail && m.email && m.email.trim().toLowerCase() === cleanEmail);

    if (existingIdx !== -1) {
      allMembers[existingIdx].is_inactive = false;
      if (email) allMembers[existingIdx].email = email;
      if (name && name !== 'Member') allMembers[existingIdx].name = name;
      this._set(STORAGE_KEYS.MEMBERS, allMembers);

      if (this.supabaseClient) {
        try {
          await this.supabaseClient.from('splitease_members').update({
            is_inactive: false,
            email: allMembers[existingIdx].email,
            name: allMembers[existingIdx].name
          }).eq('id', allMembers[existingIdx].id);
        } catch (err) {
          console.warn('Failed to reactivate member in Supabase:', err);
        }
      }
      return allMembers[existingIdx];
    }

    const newMember = {
      id: this._generateId(),
      group_id: groupId,
      email: email || '',
      name: name || 'Member',
      avatar_color: (avatarColor && avatarColor.startsWith('#')) ? avatarColor : '#2D6BE4',
      is_inactive: false,
      created_at: new Date().toISOString()
    };

    allMembers.push(newMember);
    this._set(STORAGE_KEYS.MEMBERS, allMembers);

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('splitease_members').insert([newMember]);
      } catch (err) {
        console.warn('Failed to insert member into Supabase:', err);
      }
    }

    return newMember;
  }

  async deleteMember(memberId) {
    let allMembers = this._get(STORAGE_KEYS.MEMBERS);
    const mIdx = allMembers.findIndex(m => m.id === memberId);
    if (mIdx !== -1) {
      allMembers[mIdx].is_inactive = true;
      this._set(STORAGE_KEYS.MEMBERS, allMembers);
    }

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('splitease_members').update({ is_inactive: true }).eq('id', memberId);
      } catch (err) {
        console.warn('Failed to mark member as inactive in Supabase:', err);
      }
    }
  }

  purgeLegacySampleData() {
    const dummyNames = ['Rahul', 'Priya', 'Member'];
    let allMembers = this._get(STORAGE_KEYS.MEMBERS);
    const cleanMembers = allMembers.filter(m => m.name && !dummyNames.includes(m.name.trim()) && !m.name.startsWith('#'));
    if (cleanMembers.length !== allMembers.length) {
      this._set(STORAGE_KEYS.MEMBERS, cleanMembers);
    }

    let allGroups = this._get(STORAGE_KEYS.GROUPS);
    const cleanGroups = allGroups.filter(g => g.name !== 'Goa Trip 🌴');
    if (cleanGroups.length !== allGroups.length) {
      this._set(STORAGE_KEYS.GROUPS, cleanGroups);
    }
  }

  async getRecentFriends() {
    this.purgeLegacySampleData();
    const dummyNames = ['Rahul', 'Priya', 'Member'];
    const allMembers = this._get(STORAGE_KEYS.MEMBERS);
    const friendsMap = {};
    allMembers.forEach(m => {
      if (m.name && !m.name.startsWith('#') && !dummyNames.includes(m.name.trim()) && !m.name.includes('(Payer)') && m.name !== 'You') {
        friendsMap[m.name.trim()] = m.avatar_color || '#2D6BE4';
      }
    });

    return Object.entries(friendsMap).map(([name, color]) => ({ name, color }));
  }

  // --- EXPENSE OPERATIONS ---

  async getExpenses(groupId) {
    if (this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('splitease_expenses')
          .select(`*, splits:splitease_expense_splits(*)`)
          .eq('group_id', groupId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          const allExp = this._get(STORAGE_KEYS.EXPENSES).filter(e => e.group_id !== groupId);
          this._set(STORAGE_KEYS.EXPENSES, [...allExp, ...data]);
          return data;
        }
      } catch (err) {
        console.warn('Supabase fetch expenses failed:', err);
      }
    }

    const allExp = this._get(STORAGE_KEYS.EXPENSES);
    return allExp.filter(e => e.group_id === groupId);
  }

  async addExpense(expenseData, splitsData = []) {
    const expenseId = this._generateId();
    const newExpense = {
      id: expenseId,
      group_id: expenseData.group_id,
      title: expenseData.title,
      amount: Number(expenseData.amount),
      paid_by_member_id: expenseData.paid_by_member_id,
      include_payer: expenseData.include_payer !== undefined ? expenseData.include_payer : true,
      category: expenseData.category || 'General',
      split_type: expenseData.split_type || 'equal',
      date: expenseData.date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      splits: splitsData.map(s => ({
        id: this._generateId(),
        expense_id: expenseId,
        member_id: s.member_id,
        split_amount: Number(s.split_amount),
        percentage_or_share: Number(s.percentage_or_share || 0)
      }))
    };

    const allExp = this._get(STORAGE_KEYS.EXPENSES);
    allExp.unshift(newExpense);
    this._set(STORAGE_KEYS.EXPENSES, allExp);

    if (this.supabaseClient) {
      try {
        // Insert main expense
        await this.supabaseClient.from('splitease_expenses').insert([{
          id: newExpense.id,
          group_id: newExpense.group_id,
          title: newExpense.title,
          amount: newExpense.amount,
          paid_by_member_id: newExpense.paid_by_member_id,
          include_payer: newExpense.include_payer,
          category: newExpense.category,
          split_type: newExpense.split_type,
          date: newExpense.date
        }]);

        // Insert splits
        if (newExpense.splits.length > 0) {
          await this.supabaseClient.from('splitease_expense_splits').insert(newExpense.splits);
        }
      } catch (err) {
        console.warn('Failed to insert expense into Supabase:', err);
      }
    }

    return newExpense;
  }

  async updateExpense(expenseId, expenseData, splitsData = []) {
    let allExp = this._get(STORAGE_KEYS.EXPENSES);
    const idx = allExp.findIndex(e => e.id === expenseId);
    if (idx === -1) return null;

    const updatedExpense = {
      ...allExp[idx],
      title: expenseData.title,
      amount: Number(expenseData.amount),
      paid_by_member_id: expenseData.paid_by_member_id,
      include_payer: expenseData.include_payer !== undefined ? expenseData.include_payer : true,
      category: expenseData.category || 'General',
      split_type: expenseData.split_type || 'equal',
      splits: splitsData.map(s => ({
        id: s.id || this._generateId(),
        expense_id: expenseId,
        member_id: s.member_id,
        split_amount: Number(s.split_amount),
        percentage_or_share: Number(s.percentage_or_share || 0)
      }))
    };

    allExp[idx] = updatedExpense;
    this._set(STORAGE_KEYS.EXPENSES, allExp);

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('splitease_expenses').update({
          title: updatedExpense.title,
          amount: updatedExpense.amount,
          paid_by_member_id: updatedExpense.paid_by_member_id,
          include_payer: updatedExpense.include_payer,
          category: updatedExpense.category,
          split_type: updatedExpense.split_type
        }).eq('id', expenseId);

        await this.supabaseClient.from('splitease_expense_splits').delete().eq('expense_id', expenseId);
        if (updatedExpense.splits.length > 0) {
          await this.supabaseClient.from('splitease_expense_splits').insert(updatedExpense.splits.map(s => ({
            id: s.id,
            expense_id: expenseId,
            member_id: s.member_id,
            split_amount: s.split_amount,
            percentage_or_share: s.percentage_or_share
          })));
        }
      } catch (err) {
        console.warn('Failed to update expense in Supabase:', err);
      }
    }

    return updatedExpense;
  }

  async deleteExpense(expenseId) {
    let allExp = this._get(STORAGE_KEYS.EXPENSES);
    allExp = allExp.filter(e => e.id !== expenseId);
    this._set(STORAGE_KEYS.EXPENSES, allExp);

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('splitease_expenses').delete().eq('id', expenseId);
      } catch (err) {
        console.warn('Failed to delete expense from Supabase:', err);
      }
    }
  }

  // --- SETTLEMENT OPERATIONS ---

  async getSettlements(groupId) {
    if (this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('splitease_settlements')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          const allSettlements = this._get(STORAGE_KEYS.SETTLEMENTS).filter(s => s.group_id !== groupId);
          this._set(STORAGE_KEYS.SETTLEMENTS, [...allSettlements, ...data]);
          return data;
        }
      } catch (err) {
        console.warn('Supabase fetch settlements failed:', err);
      }
    }

    const allSettlements = this._get(STORAGE_KEYS.SETTLEMENTS);
    return allSettlements.filter(s => s.group_id === groupId);
  }

  async addSettlement(groupId, fromMemberId, toMemberId, amount) {
    const newSettlement = {
      id: this._generateId(),
      group_id: groupId,
      from_member_id: fromMemberId,
      to_member_id: toMemberId,
      amount: Number(amount),
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    const allSettlements = this._get(STORAGE_KEYS.SETTLEMENTS);
    allSettlements.unshift(newSettlement);
    this._set(STORAGE_KEYS.SETTLEMENTS, allSettlements);

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('splitease_settlements').insert([newSettlement]);
      } catch (err) {
        console.warn('Failed to insert settlement into Supabase:', err);
      }
    }

    return newSettlement;
  }

  // --- CHECKLIST OPERATIONS ---

  async getChecklists(groupId) {
    if (this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('splitease_checklists')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true });
        if (!error && data) {
          const allChecklists = this._get(STORAGE_KEYS.CHECKLISTS).filter(c => c.group_id !== groupId);
          this._set(STORAGE_KEYS.CHECKLISTS, [...allChecklists, ...data]);
          return data;
        }
      } catch (err) {
        console.warn('Supabase fetch checklists failed:', err);
      }
    }

    const allChecklists = this._get(STORAGE_KEYS.CHECKLISTS);
    return allChecklists.filter(c => c.group_id === groupId);
  }

  async addChecklistItem(itemData) {
    const newItem = {
      id: this._generateId(),
      group_id: itemData.group_id,
      title: itemData.title,
      note: itemData.note || '',
      assigned_to_member_id: itemData.assigned_to_member_id || null,
      is_completed: Boolean(itemData.is_completed),
      created_at: new Date().toISOString()
    };

    const allChecklists = this._get(STORAGE_KEYS.CHECKLISTS);
    allChecklists.push(newItem);
    this._set(STORAGE_KEYS.CHECKLISTS, allChecklists);

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('splitease_checklists').insert([newItem]);
      } catch (err) {
        console.warn('Failed to insert checklist item into Supabase:', err);
      }
    }

    return newItem;
  }

  async updateChecklistNote(itemId, note) {
    let allChecklists = this._get(STORAGE_KEYS.CHECKLISTS);
    const idx = allChecklists.findIndex(c => c.id === itemId);
    if (idx !== -1) {
      allChecklists[idx].note = note;
      this._set(STORAGE_KEYS.CHECKLISTS, allChecklists);
    }

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('splitease_checklists').update({ note }).eq('id', itemId);
      } catch (err) {
        console.warn('Failed to update checklist note in Supabase:', err);
      }
    }
  }

  async toggleChecklistItem(itemId, isCompleted) {
    let allChecklists = this._get(STORAGE_KEYS.CHECKLISTS);
    const idx = allChecklists.findIndex(c => c.id === itemId);
    if (idx !== -1) {
      allChecklists[idx].is_completed = Boolean(isCompleted);
      this._set(STORAGE_KEYS.CHECKLISTS, allChecklists);
    }

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('splitease_checklists').update({ is_completed: Boolean(isCompleted) }).eq('id', itemId);
      } catch (err) {
        console.warn('Failed to toggle checklist item in Supabase:', err);
      }
    }
  }

  async deleteChecklistItem(itemId) {
    let allChecklists = this._get(STORAGE_KEYS.CHECKLISTS);
    allChecklists = allChecklists.filter(c => c.id !== itemId);
    this._set(STORAGE_KEYS.CHECKLISTS, allChecklists);

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('splitease_checklists').delete().eq('id', itemId);
      } catch (err) {
        console.warn('Failed to delete checklist item from Supabase:', err);
      }
    }
  }

  // --- POOL OPERATIONS ---

  async getPools(groupId) {
    if (this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient
          .from('splitease_pools')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true });
        if (!error && data) {
          const allPools = this._get(STORAGE_KEYS.POOLS).filter(p => p.group_id !== groupId);
          this._set(STORAGE_KEYS.POOLS, [...allPools, ...data]);
          return data;
        }
      } catch (err) {
        console.warn('Supabase fetch pools failed:', err);
      }
    }

    const allPools = this._get(STORAGE_KEYS.POOLS);
    return allPools.filter(p => p.group_id === groupId);
  }

  async addPoolContribution(poolData) {
    const newPool = {
      id: this._generateId(),
      group_id: poolData.group_id,
      title: poolData.title || 'Group Pool',
      contribution_type: poolData.contribution_type || 'lumpsum',
      amount_per_unit: Number(poolData.amount_per_unit || 0),
      total_collected: Number(poolData.total_collected || 0),
      created_at: new Date().toISOString()
    };

    const allPools = this._get(STORAGE_KEYS.POOLS);
    allPools.push(newPool);
    this._set(STORAGE_KEYS.POOLS, allPools);

    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('splitease_pools').insert([newPool]);
      } catch (err) {
        console.warn('Failed to insert pool contribution into Supabase:', err);
      }
    }

    return newPool;
  }
}

// Global singleton instance
const splitEasyDB = new SplitEasyDBAdapter();
