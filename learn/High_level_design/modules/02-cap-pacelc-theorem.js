window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "cap-theorem",
  num: "02",
  title: "Beyond CAP: PACELC Theorem & Tunable Consistency",
  category: "FOUNDATIONS",
  icon: "⚖️",
  tag: "PACELC / Quorums",
  content: `
    <p>While the CAP Theorem describes distributed system behavior <b>during network partitions</b>, the <b>PACELC Theorem</b> extends this framework by evaluating system behavior during <i>normal, non-partitioned operations</i>.</p>
    
    <div class="flow-container">
      <div class="flow-step">
        <span class="flow-step-num">1</span>
        <div class="flow-step-content"><b>If Partition (P) Occurs:</b> System must choose between <b>Availability (A)</b> (responding immediately with potentially stale data) OR <b>Consistency (C)</b> (failing or blocking until data syncs).</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">2</span>
        <div class="flow-step-content"><b>Else (E) Normal Operation:</b> System must choose between <b>Latency (L)</b> (returning local reads/writes fast) OR <b>Consistency (C)</b> (waiting for cross-replica sync).</div>
      </div>
    </div>

    <h3>PACELC Trade-Off Examples</h3>
    <ul>
      <li><b>PC/EC (e.g., MongoDB, Spanner):</b> Prioritizes Consistency both during partitions and normal operations. Higher latency.</li>
      <li><b>PA/EL (e.g., Apache Cassandra, DynamoDB):</b> Prioritizes Availability during partitions, and ultra-low Latency during normal operations (Eventual Consistency).</li>
    </ul>

    <h3>Tunable Consistency Math (Quorum Formula)</h3>
    <p>For strong consistency in distributed leaderless clusters (Dynamo/Cassandra), configure Read (R), Write (W), and Replication Factor (N) to satisfy:</p>
    
    <div class="flow-container">
      <div class="flow-step">
        <span class="flow-step-num">✓</span>
        <div class="flow-step-content"><b>Strong Consistency Formula:</b> <code>R + W > N</code><br>Example (Replication N = 3): Write Quorum W = 2, Read Quorum R = 2 (2 + 2 = 4 > 3). Guarantees read and write quorums overlap on at least 1 fresh node.</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">⚡</span>
        <div class="flow-step-content"><b>Eventual Consistency Formula:</b> <code>R + W ≤ N</code><br>Example (Replication N = 3): Write Quorum W = 1, Read Quorum R = 1 (1 + 1 = 2 ≤ 3). Fast sub-millisecond responses, but stale reads possible.</div>
      </div>
    </div>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>PACELC Completeness:</b> CAP only triggers during rare network partitions. PACELC dictates your 99.9% daily operation latency vs consistency trade-offs.</li>
      <li><b>Quorum Intersection Principle:</b> If $R + W > N$, at least one node in the read quorum is guaranteed to overlap with the write quorum, yielding the latest write value.</li>
      <li><b>Sloppy Quorum & Hinted Handoff:</b> During network partitions, Cassandra writes to neighboring nodes with a "hint" tag. When the target node recovers, hints are handed off.</li>
      <li><b>Read Repair:</b> During a read quorum check, if node values differ, the coordinator returns the latest timestamp value to the client and asynchronously writes the update to stale nodes.</li>
      <li><b>NTP Clock Drift Hazard:</b> Last-Write-Wins (LWW) conflict resolution using physical NTP wall clocks is dangerous because NTP clock drift can cause newer writes to be overwritten by older writes.</li>
      <li><b>Vector Clocks for Causal Consistency:</b> Vector clocks track logical causality between writes across distributed nodes without depending on physical wall clocks.</li>
      <li><b>Conflict-Free Replicated Data Types (CRDTs):</b> Data structures (like state-based grow-only counters or LWW-Element-Set) that automatically merge concurrent conflicting writes deterministically without locks.</li>
      <li><b>Google Spanner's TrueTime API:</b> Google Spanner uses atomic clocks and GPS receivers in every data center to bound clock uncertainty to $\le 1\text{ ms}$, enabling global external consistency (serializability).</li>
      <li><b>Read-Your-Own-Writes Consistency:</b> Guaranteed by routing a user's reads to the master DB or the same replica where their recent write was sent for a short time window.</li>
      <li><b>Monotonic Read Consistency:</b> Ensures that after a user sees a particular value, they will never see an older value on subsequent reads (preventing time-travel read bugs).</li>
    </ol>
  `,
  quizzes: [
    {
      q: "In a Cassandra cluster with Replication Factor N = 5, what minimum Write Quorum (W) and Read Quorum (R) configuration guarantees Strong Consistency?",
      opts: [
        "W = 1, R = 1",
        "W = 2, R = 2",
        "W = 3, R = 3",
        "W = 1, R = 4"
      ],
      correct: 2,
      explain: "Strong consistency requires R + W > N. For N = 5, setting W = 3 and R = 3 yields R + W = 6 > 5, ensuring read and write quorums overlap on at least 1 up-to-date node."
    },
    {
      q: "What is the primary danger of using Last-Write-Wins (LWW) with physical system wall clocks for database conflict resolution?",
      opts: [
        "NTP clock drift between servers can cause a newer write with a lagging clock to be overwritten by an older write with an advanced clock",
        "LWW increases database RAM usage by 400%",
        "LWW prevents SQL JOIN queries",
        "LWW forces all databases to shut down at midnight"
      ],
      correct: 0,
      explain: "Physical wall clocks drift via NTP. If Server A's clock is 50ms behind Server B's, a newer write on A will be discarded in favor of an older write on B."
    },
    {
      q: "According to PACELC, what trade-off does an Apache Cassandra cluster configured with PA/EL make during normal (non-partitioned) operations?",
      opts: [
        "It chooses Consistency over Latency",
        "It chooses ultra-low Latency over Consistency (Eventual Consistency)",
        "It chooses SQL over NoSQL",
        "It chooses synchronous disk flushes"
      ],
      correct: 1,
      explain: "PA/EL stands for Partition -> Availability; Else -> Latency. During normal operation, it prioritizes low latency over strong consistency."
    },
    {
      q: "[SCENARIO] You are designing Google Pay's user wallet balance ledger. A network split isolates the primary data center from the backup region. Under the PACELC/CAP framework, how should your ledger service behave?",
      opts: [
        "Operate as a CP/PC system: reject writes/transfers in the disconnected partition to prevent double-spending",
        "Operate as an AP system: accept all balance deductions on both sides and resolve discrepancies next month",
        "Format the database",
        "Ignore the network partition and assume no transactions occur"
      ],
      correct: 0,
      explain: "Financial wallet ledgers cannot risk double-spending or negative balances. A financial ledger MUST prioritize Consistency (CP/PC) and reject writes in isolated partitions."
    },
    {
      q: "[SCENARIO] You are designing the Likes counter on viral social media posts (10M likes/min). Latency must be < 5ms globally. How should you design the counter aggregation database under PACELC?",
      opts: [
        "Use CRDT (PN-Counter) data structures with PA/EL eventual consistency to allow local data center increments without global locks",
        "Use single-node MySQL with serializable isolation",
        "Use 2-Phase Commit across all global data centers for every single click",
        "Store likes in flat text files on NFS"
      ],
      correct: 0,
      explain: "Social media likes do not require strict linearizability per click. Using Conflict-Free Replicated Data Types (CRDTs) with PA/EL eventual consistency achieves ultra-low latency while auto-merging counter values."
    }
  ]
});
