// ============================================================
// SPLITEASY - DEBT SIMPLIFICATION GRAPH SOLVER ENGINE
// ============================================================

/**
 * Calculates net balance for every member in a group.
 * Positive balance = Member is owed money (Creditor)
 * Negative balance = Member owes money (Debtor)
 * 
 * @param {Array} members Array of member objects [{ id, name }]
 * @param {Array} expenses Array of expense objects
 * @param {Array} settlements Array of settlement objects
 * @returns {Object} Map of memberId -> netBalance (numeric)
 */
function calculateNetBalances(members, expenses = [], settlements = []) {
  const balances = {};
  members.forEach(m => {
    balances[m.id] = 0;
  });

  // 1. Process Expenses & Splits
  expenses.forEach(exp => {
    const paidById = exp.paid_by_member_id;
    const amount = Number(exp.amount) || 0;

    if (balances[paidById] !== undefined) {
      balances[paidById] += amount;
    }

    // Subtract split amounts from participating members
    if (Array.isArray(exp.splits)) {
      exp.splits.forEach(split => {
        const memId = split.member_id;
        const splitAmt = Number(split.split_amount) || 0;
        if (balances[memId] !== undefined) {
          balances[memId] -= splitAmt;
        }
      });
    }
  });

  // 2. Process Settlements (Payments already made between members)
  settlements.forEach(s => {
    const fromId = s.from_member_id; // Person who paid
    const toId = s.to_member_id;     // Person who received
    const amt = Number(s.amount) || 0;

    if (balances[fromId] !== undefined) {
      balances[fromId] += amt; // Payment increases sender's net balance towards 0
    }
    if (balances[toId] !== undefined) {
      balances[toId] -= amt;   // Receiving payment decreases recipient's net balance towards 0
    }
  });

  // Round to 2 decimal places to avoid floating point precision artifacts
  Object.keys(balances).forEach(id => {
    balances[id] = Math.round((balances[id] + Number.EPSILON) * 100) / 100;
  });

  return balances;
}

/**
 * Greedy Graph Simplification Algorithm to minimize total transaction count.
 * Matches the largest debtor with the largest creditor iteratively.
 * 
 * @param {Object} balances Map of memberId -> netBalance
 * @param {Array} members Array of member objects [{ id, name }]
 * @returns {Array} List of simplified transactions [{ fromId, fromName, toId, toName, amount }]
 */
function simplifyDebts(balances, members = []) {
  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m.name; });

  const debtors = [];  // People with negative balance (they owe)
  const creditors = []; // People with positive balance (they are owed)

  Object.entries(balances).forEach(([id, net]) => {
    const roundedNet = Math.round((net + Number.EPSILON) * 100) / 100;
    if (roundedNet < -0.01) {
      debtors.push({ id, name: memberMap[id] || 'Unknown', amount: Math.abs(roundedNet) });
    } else if (roundedNet > 0.01) {
      creditors.push({ id, name: memberMap[id] || 'Unknown', amount: roundedNet });
    }
  });

  const transactions = [];

  // Sort descending by amount for greedy matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let i = 0; // Debtor pointer
  let j = 0; // Creditor pointer

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settledAmount = Math.min(debtor.amount, creditor.amount);
    const roundedSettled = Math.round((settledAmount + Number.EPSILON) * 100) / 100;

    if (roundedSettled > 0) {
      transactions.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: roundedSettled
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }

  return transactions;
}

/**
 * Calculates exact per-person splits given total amount, split type, members, payer, and includePayer flag.
 * 
 * @param {number} totalAmount Total cost of expense
 * @param {Array} selectedMembers List of member objects or member IDs participating
 * @param {string} payerId Member ID of person who paid
 * @param {boolean} includePayer Whether the payer is included in the split
 * @param {string} splitType 'equal' | 'exact' | 'percent' | 'shares'
 * @param {Object} customValues Optional object mapping memberId -> exact/percent/share value
 * @returns {Array} Array of [{ member_id, split_amount, percentage_or_share }]
 */
function calculateSplitAmounts(totalAmount, selectedMembers, payerId, includePayer = true, splitType = 'equal', customValues = {}) {
  const splits = [];
  let participants = [...selectedMembers];

  // Filter out payer if includePayer is false
  if (!includePayer) {
    participants = participants.filter(id => id !== payerId);
  }

  if (participants.length === 0) return splits;

  if (splitType === 'equal') {
    const perPerson = Math.round((totalAmount / participants.length + Number.EPSILON) * 100) / 100;
    let sum = 0;
    
    participants.forEach((memId, idx) => {
      let amt = perPerson;
      // Adjust last person for rounding precision remainder
      if (idx === participants.length - 1) {
        amt = Math.round((totalAmount - sum + Number.EPSILON) * 100) / 100;
      } else {
        sum += amt;
      }
      splits.push({ member_id: memId, split_amount: amt, percentage_or_share: 1 });
    });
  } else if (splitType === 'exact') {
    participants.forEach(memId => {
      const amt = Number(customValues[memId]) || 0;
      splits.push({ member_id: memId, split_amount: amt, percentage_or_share: amt });
    });
  } else if (splitType === 'percent') {
    participants.forEach(memId => {
      const pct = Number(customValues[memId]) || 0;
      const amt = Math.round(((totalAmount * pct) / 100 + Number.EPSILON) * 100) / 100;
      splits.push({ member_id: memId, split_amount: amt, percentage_or_share: pct });
    });
  } else if (splitType === 'shares') {
    let totalShares = 0;
    participants.forEach(memId => {
      totalShares += Math.max(1, Number(customValues[memId]) || 1);
    });

    let sum = 0;
    participants.forEach((memId, idx) => {
      const shares = Math.max(1, Number(customValues[memId]) || 1);
      let amt = Math.round(((totalAmount * shares) / totalShares + Number.EPSILON) * 100) / 100;
      if (idx === participants.length - 1) {
        amt = Math.round((totalAmount - sum + Number.EPSILON) * 100) / 100;
      } else {
        sum += amt;
      }
      splits.push({ member_id: memId, split_amount: amt, percentage_or_share: shares });
    });
  }

  return splits;
}

// Export for ES Module or browser global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateNetBalances, simplifyDebts, calculateSplitAmounts };
}
