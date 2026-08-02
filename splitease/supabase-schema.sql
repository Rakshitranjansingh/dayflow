-- ============================================================
-- SPLITEASY - SUPABASE POSTGRESQL DATABASE SCHEMA
-- Clean Migration Script (Re-run Safe)
-- ============================================================

-- 1. DROP EXISTING TABLES IF MIGRATING FROM PREVIOUS DRAFT
DROP TABLE IF EXISTS splitease_settlements CASCADE;
DROP TABLE IF EXISTS splitease_expense_splits CASCADE;
DROP TABLE IF EXISTS splitease_expenses CASCADE;
DROP TABLE IF EXISTS splitease_members CASCADE;
DROP TABLE IF EXISTS splitease_groups CASCADE;

-- 2. GROUPS TABLE
CREATE TABLE splitease_groups (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) DEFAULT 'custom',
    currency VARCHAR(10) DEFAULT '₹',
    share_code VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. MEMBERS TABLE
CREATE TABLE splitease_members (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100) REFERENCES splitease_groups(id) ON DELETE CASCADE,
    email VARCHAR(255) DEFAULT '',
    name VARCHAR(255) NOT NULL,
    avatar_color VARCHAR(30) DEFAULT '#2D6BE4',
    is_inactive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. EXPENSES TABLE
CREATE TABLE splitease_expenses (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100) REFERENCES splitease_groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    paid_by_member_id VARCHAR(100) REFERENCES splitease_members(id) ON DELETE CASCADE,
    include_payer BOOLEAN DEFAULT TRUE,
    category VARCHAR(100) DEFAULT 'General',
    split_type VARCHAR(50) DEFAULT 'equal',
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. EXPENSE SPLITS TABLE
CREATE TABLE splitease_expense_splits (
    id VARCHAR(100) PRIMARY KEY,
    expense_id VARCHAR(100) REFERENCES splitease_expenses(id) ON DELETE CASCADE,
    member_id VARCHAR(100) REFERENCES splitease_members(id) ON DELETE CASCADE,
    split_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    percentage_or_share NUMERIC(8, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SETTLEMENTS TABLE
CREATE TABLE splitease_settlements (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100) REFERENCES splitease_groups(id) ON DELETE CASCADE,
    from_member_id VARCHAR(100) REFERENCES splitease_members(id) ON DELETE CASCADE,
    to_member_id VARCHAR(100) REFERENCES splitease_members(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR FAST QUERYING
CREATE INDEX idx_members_group ON splitease_members(group_id);
CREATE INDEX idx_expenses_group ON splitease_expenses(group_id);
CREATE INDEX idx_splits_expense ON splitease_expense_splits(expense_id);
CREATE INDEX idx_settlements_group ON splitease_settlements(group_id);
CREATE INDEX idx_groups_code ON splitease_groups(share_code);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE splitease_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE splitease_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE splitease_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE splitease_expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE splitease_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access Groups" ON splitease_groups FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Groups" ON splitease_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Groups" ON splitease_groups FOR UPDATE USING (true);
CREATE POLICY "Public Access Members" ON splitease_members FOR ALL USING (true);
CREATE POLICY "Public Access Expenses" ON splitease_expenses FOR ALL USING (true);
CREATE POLICY "Public Access Splits" ON splitease_expense_splits FOR ALL USING (true);
CREATE POLICY "Public Access Settlements" ON splitease_settlements FOR ALL USING (true);
