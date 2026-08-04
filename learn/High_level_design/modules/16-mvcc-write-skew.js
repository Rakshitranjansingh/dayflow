window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "concurrency-locking",
  num: "16",
  title: "MVCC, Write Skew Anomaly & Snapshot Isolation",
  category: "DATA MANAGEMENT",
  icon: "🔒",
  tag: "MVCC / Write Skew",
  content: `
    <p>Modern RDBMS databases (Postgres, InnoDB) use <b>Multi-Version Concurrency Control (MVCC)</b> so readers never block writers and writers never block readers.</p>

    <h3>The Write Skew Anomaly in Snapshot Isolation</h3>
    <p>Occurs when two parallel transactions read overlapping data, make disjoint writes, and violate a global domain constraint.</p>
    <div class="code-block">
Example Constraint: "At least 1 doctor must be on call."
- Doctor A & B are currently on call.
- Transaction 1 (Doctor A) -> Reads: 2 doctors on call. Takes leave (Sets Doctor A = off).
- Transaction 2 (Doctor B) -> Reads: 2 doctors on call. Takes leave (Sets Doctor B = off).
- RESULT: Both commit under Snapshot Isolation! Zero doctors left on call (Write Skew!).
    </div>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>MVCC Tuple Versions:</b> Postgres stores hidden <code>xmin</code> and <code>xmax</code> transaction IDs on every row tuple to maintain multi-version historical snapshots without read locks.</li>
      <li><b>Postgres Vacuum / Auto-vacuum:</b> MVCC generates dead row tuples on <code>UPDATE</code> and <code>DELETE</code>. Periodic <b>Autovacuum</b> is required to reclaim disk space and prevent transaction ID wraparound.</li>
      <li><b>Dirty Reads vs Non-Repeatable Reads vs Phantom Reads:</b> Read Uncommitted allows Dirty Reads. Read Committed prevents Dirty Reads. Repeatable Read prevents Non-Repeatable Reads. Serializable prevents all anomalies.</li>
      <li><b>Snapshot Isolation Limits:</b> Snapshot Isolation prevents Phantom Reads in Postgres/InnoDB, but is STILL vulnerable to **Write Skew** anomalies.</li>
      <li><b>Pessimistic Locking (SELECT ... FOR UPDATE):</b> Acquires exclusive row locks during read time to prevent concurrent transactions from modifying the read dataset.</li>
      <li><b>Optimistic Concurrency Control (OCC):</b> Uses a <code>version</code> column: <code>UPDATE accounts SET balance = 100, version = 6 WHERE id = 1 AND version = 5</code>. If affected row count = 0, abort and retry.</li>
      <li><b>Serializable Snapshot Isolation (SSI):</b> Uses SIREAD lock tracking to detect dependency cycles in real-time, aborting transactions that would cause write skew without full table locks.</li>
      <li><b>Deadlock Detection (Wait-For Graph):</b> Database engine detects cycles in transaction dependency graphs and automatically aborts the youngest transaction with error <code>40P01</code>.</li>
      <li><b>Lock Escalation:</b> SQL Server escalates row locks to table locks if too many row locks are acquired. Postgres never escalates row locks to table locks.</li>
      <li><b>Distributed Locks vs DB Locks:</b> DB locks (<code>FOR UPDATE</code>) hold physical connections open. Keep DB transactions short to avoid exhausting connection pools.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "How can you prevent the Write Skew anomaly under Snapshot Isolation in SQL databases?",
      opts: [
        "Use SELECT ... FOR UPDATE or Serializable Isolation",
        "Add more RAM to the database server",
        "Use NoSQL key-value caching",
        "Disable database indexes"
      ],
      correct: 0,
      explain: "Write Skew occurs when disjoint writes commit under Snapshot Isolation. Using SELECT ... FOR UPDATE or Serializable isolation forces explicit locks to prevent concurrent constraint violations."
    },
    {
      q: "What maintenance process MUST run regularly in PostgreSQL to clean up dead row tuples created by MVCC updates and deletes?",
      opts: [
        "Autovacuum",
        "Format C:",
        "Reboot server",
        "Drop database"
      ],
      correct: 0,
      explain: "MVCC appends new row versions on updates/deletes. Autovacuum reclaims disk space occupied by obsolete dead tuples and prevents transaction ID wraparound."
    },
    {
      q: "How does Optimistic Concurrency Control (OCC) verify that no concurrent transaction modified a record prior to committing?",
      opts: [
        "By checking an incrementing version number or timestamp column in the UPDATE WHERE clause",
        "By locking the entire table for 1 hour",
        "By calling external REST APIs",
        "By restarting the server"
      ],
      correct: 0,
      explain: "OCC includes `WHERE version = expected_version` in the write SQL. If another transaction modified the row first, version changes and 0 rows are updated, triggering a retry."
    },
    {
      q: "[SCENARIO] Two hospital doctors (Alice and Bob) are on call. System constraint requires 'at least 1 doctor on call at all times'. Simultaneously, Alice requests off in Tx 1, and Bob requests off in Tx 2. Both read '2 doctors on call' and commit under Repeatable Read isolation. Now zero doctors are on call. What anomaly occurred?",
      opts: [
        "Write Skew Anomaly",
        "Dirty Read",
        "Buffer Overflow",
        "Hardware Crash"
      ],
      correct: 0,
      explain: "Write Skew occurs when concurrent transactions read overlapping data, write to disjoint records, and breach a cross-row business constraint."
    },
    {
      q: "[SCENARIO] An inventory system handles 10,000 flash sale purchases per second for a single iPhone item (stock = 100). Using 'SELECT FOR UPDATE' causes 9,999 connection timeouts. How do you re-architect flash sale stock deduction?",
      opts: [
        "Use Optimistic Locking or Redis atomic DECRBY with local memory buffering instead of holding SQL pessimistic locks open across thousands of threads",
        "Disable database security",
        "Allow negative stock levels",
        "Delete the inventory table"
      ],
      correct: 0,
      explain: "High-concurrency flash sales cause thread pool lock contention under SELECT FOR UPDATE. Atomic in-memory Redis DECRBY or optimistic locking scales orders without blocking SQL connections."
    }
  ]
});
