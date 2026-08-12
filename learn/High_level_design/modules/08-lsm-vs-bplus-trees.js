window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "sql-vs-nosql",
  num: "08",
  title: "Storage Engine Internals: LSM Trees vs B+ Trees",
  category: "DATA MANAGEMENT",
  icon: "🗄️",
  tag: "LSM Trees / RocksDB",
  content: `
    <p>Database performance and selection depend heavily on the underlying <b>Storage Engine Architecture</b>: B+ Trees vs Log-Structured Merge-Trees (LSM Trees).</p>

    <h3>LSM Trees (e.g. RocksDB, Cassandra, LevelDB)</h3>
    <div class="flow-container">
      <div class="flow-step">
        <span class="flow-step-num">1</span>
        <div class="flow-step-content"><b>Write-Ahead Log (WAL) & MemTable:</b> Writes are appended to an on-disk WAL for crash recovery and simultaneously added to an in-RAM SkipList (MemTable).</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">2</span>
        <div class="flow-step-content"><b>MemTable Flush to SSTable:</b> When MemTable fills up, it is flushed to disk sequentially as an immutable <b>Sorted String Table (SSTable)</b>.</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">3</span>
        <div class="flow-step-content"><b>Read Path:</b> Checks MemTable first → In-Memory Bloom Filter → SSTable Index → Disk Read.</div>
      </div>
    </div>

    <ul>
      <li><b>LSM Trees:</b> Converts random writes into fast <b>sequential disk writes</b>. High write throughput, but higher Read Amplification & Compaction CPU cost.</li>
      <li><b>B+ Trees (e.g. InnoDB, Postgres):</b> Updates pages in-place. Fast point reads, but high <b>Write Amplification</b> due to random disk I/O page updates.</li>
    </ul>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Write Amplification Factor (WAF):</b> The ratio of bytes written to underlying storage versus bytes written to the database. LSM trees reduce write amplification for write-heavy workloads compared to B+ trees.</li>
      <li><b>Bloom Filter Optimization:</b> LSM trees use probabilistic **Bloom Filters** in RAM to instantly check if an SSTable file contains a key, eliminating 90%+ of unnecessary disk reads on cache misses.</li>
      <li><b>Compaction Strategies (Leveled vs Size-Tiered):</b> LSM SSTables are immutable. Periodic background **Compaction** merges SSTables to remove deleted/overwritten keys. Leveled compaction optimizes reads; Size-Tiered compaction optimizes writes.</li>
      <li><b>Compaction Stalls (Write Pauses):</b> If write rate exceeds background compaction speed, LSM tree SSTables accumulate, triggering a severe write stall (database freezes until compaction catches up).</li>
      <li><b>MemTable Write-Ahead Log (WAL):</b> Writes buffer in RAM (MemTable) for speed, but are simultaneously appended to a WAL on disk to ensure durability across power loss.</li>
      <li><b>B+ Tree In-Place Modifications:</b> B+ Trees modify 8KB/16KB data pages in-place. Updating a single 10-byte column forces writing the entire 16KB page to disk, causing high Write Amplification.</li>
      <li><b>Page Churn & Doublewrite Buffers:</b> MySQL InnoDB uses a Doublewrite Buffer to prevent partial page writes (tearing) during OS crashes, doubling write I/O operations for B+ Trees.</li>
      <li><b>Point Reads vs Range Queries:</b> B+ Trees excel at point lookups and range scans because leaf nodes form a doubly linked list. LSM trees require checking multiple SSTables for range queries.</li>
      <li><b>Space Amplification:</b> LSM trees temporarily use extra disk space during compaction (up to 50% extra disk overhead). Monitor free disk headroom carefully.</li>
      <li><b>Storage Choice Rule of Thumb:</b> Use B+ Trees (Postgres/MySQL) for ACID transactional read-heavy workloads. Use LSM Trees (RocksDB/Cassandra) for high-frequency write/append workloads (logs, IoT, messaging).</li>
    </ol>
  `,
  quizzes: [
    {
      q: "Why do LSM Tree storage engines (RocksDB/Cassandra) deliver significantly higher write throughput than B+ Trees?",
      opts: [
        "LSM Trees store data without disk backups",
        "LSM Trees convert random writes into sequential disk append operations via MemTable and SSTables",
        "LSM Trees disable CPU encryption",
        "LSM Trees run only in RAM"
      ],
      correct: 1,
      explain: "LSM Trees buffer writes in memory (MemTable) and periodically flush them to disk sequentially as SSTables, avoiding expensive random disk updates required by B+ Trees."
    },
    {
      q: "What role does a Bloom Filter play in LSM Tree database reads?",
      opts: [
        "It compresses database passwords",
        "It probabilistically tests if an SSTable contains a requested key in RAM before reading disk, preventing 90%+ unnecessary disk reads",
        "It formats JSON responses",
        "It acts as a primary key index"
      ],
      correct: 1,
      explain: "Bloom Filters are fast in-memory probabilistic structures. If a Bloom Filter says a key is NOT in an SSTable, the engine skips reading that SSTable file on disk entirely."
    },
    {
      q: "What is 'Write Amplification' in database storage engines?",
      opts: [
        "Increasing network volume",
        "The ratio of actual bytes written to physical storage media divided by the logical payload size written by the user application",
        "Converting SQL to NoSQL",
        "Increasing RAM speed"
      ],
      correct: 1,
      explain: "Write Amplification measures storage engine write efficiency. A high Write Amplification factor (e.g. 50x) means writing 1KB of data causes 50KB of physical disk writes."
    },
    {
      q: "[SCENARIO] You are building Uber's real-time vehicle GPS tracking system processing 2 Million location updates per second. Writes must complete in < 2ms. Reads occur primarily on current vehicle status. Which storage engine architecture should you select?",
      opts: [
        "LSM Tree Storage Engine (RocksDB/Cassandra) to turn 2M writes/sec into sequential append-only disk operations",
        "Single-node MySQL with B+ Tree page updates",
        "Flat CSV files on a floppy disk",
        "Microsoft Access"
      ],
      correct: 0,
      explain: "High-frequency write workloads like GPS telemetry crush B+ Tree random page updates. LSM Trees buffer writes in RAM (MemTable) and flush sequentially, easily handling millions of writes/sec."
    },
    {
      q: "[SCENARIO] A Cassandra cluster experiences periodic write latency spikes from 2ms up to 15,000ms. Database metrics show SSTable file counts exploding on disk. What root cause are you diagnosing?",
      opts: [
        "LSM Tree Compaction Stalls caused by write ingestion speed exceeding background compaction capacity",
        "SQL Syntax errors",
        "Network cable disconnect",
        "RAM hardware failure"
      ],
      correct: 0,
      explain: "When incoming writes outpace background compaction threads, SSTable counts grow out of control. The LSM engine triggers a Write Stall (throttling or pausing writes) until compaction catches up."
    }
  ]
});
