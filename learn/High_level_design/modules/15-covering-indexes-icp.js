window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "db-indexing",
  num: "15",
  title: "Covering Indexes & Index Condition Pushdown (ICP)",
  category: "DATA MANAGEMENT",
  icon: "📑",
  tag: "Covering Index / ICP",
  content: `
    <p>Advanced database query optimization focuses on eliminating unnecessary disk I/O using <b>Covering Indexes</b> and <b>Index Condition Pushdown (ICP)</b>.</p>

    <h3>Covering Index (Zero Disk Table Lookup)</h3>
    <p>If a composite index contains ALL columns requested in a query (e.g. <code>SELECT id, email FROM users WHERE status = 'active'</code> indexed on <code>(status, email, id)</code>), the database returns data directly from the index B+ Tree without reading physical table pages!</p>

    <h3>Index Condition Pushdown (ICP)</h3>
    <p>Evaluates <code>WHERE</code> clauses at the storage engine index layer rather than passing unnecessary rows up to the server layer, drastically reducing I/O.</p>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Leftmost Prefix Rule:</b> Composite indexes on <code>(A, B, C)</code> satisfy queries filtering on <code>(A)</code>, <code>(A, B)</code>, and <code>(A, B, C)</code>, but CANNOT use the index for queries filtering on <code>(B)</code> or <code>(C)</code> alone.</li>
      <li><b>Covering Index (Index-Only Scan):</b> Eliminates table page fetches. Look for <code>Using index</code> in MySQL <code>EXPLAIN</code> plans.</li>
      <li><b>High Index Cardinality Rule:</b> Place high-cardinality columns (most unique values, like <code>user_id</code>) first in composite index definitions, followed by low-cardinality columns (like <code>status</code>).</li>
      <li><b>Write Amplification of Secondary Indexes:</b> Every secondary index on a table requires writing to another B+ Tree on every <code>INSERT</code>, <code>UPDATE</code>, or <code>DELETE</code>, degrading write performance.</li>
      <li><b>Index Fragmentation & Rebuilds:</b> Random UUID primary keys cause severe page splits and B+ Tree index fragmentation. Use sequential time-ordered keys (UUIDv7 or TSID).</li>
      <li><b>Partial / Filtered Indexes:</b> Postgres supports indexing subset rows e.g. <code>CREATE INDEX idx_unpaid ON orders(created_at) WHERE status = 'UNPAID'</code>, saving 95% index memory.</li>
      <li><b>Index Condition Pushdown (ICP):</b> Moves WHERE clause evaluation down into the storage engine level, skipping disk page fetches for mismatched index rows.</li>
      <li><b>Unused Index Auditing:</b> Periodically query <code>pg_stat_user_indexes</code> or MySQL <code>sys.schema_unused_indexes</code> to drop dead indexes consuming RAM and slowing writes.</li>
      <li><b>B+ Tree Depth Limits:</b> A 3-level B+ Tree with 16KB page size and fan-out of 1000 can hold 1 Billion rows while requiring at most 3 disk page lookups per read!</li>
      <li><b>LIKE '%keyword' Wildcard Limitation:</b> B+ Tree indexes CANNOT be used for leading wildcard searches (<code>LIKE '%abc'</code>) because string prefixes are unknown. Use Full-Text Search (Elasticsearch / Postgres GIN index).</li>
    </ol>
  `,
  quizzes: [
    {
      q: "What is a 'Covering Index' in SQL database optimization?",
      opts: [
        "An index that encrypts database files",
        "An index that includes all SELECT columns required by a query, allowing the DBMS to satisfy the query entirely from the index without reading data pages",
        "An index created on foreign keys only",
        "An index that backs up data to S3"
      ],
      correct: 1,
      explain: "A Covering Index contains all columns specified in SELECT and WHERE clauses, enabling an 'Index-Only Scan' that completely bypasses disk table lookups."
    },
    {
      q: "Why do random UUIDv4 primary keys cause severe B+ Tree index performance degradation in high-volume SQL databases?",
      opts: [
        "UUIDv4 strings are encrypted",
        "Random UUIDs insert rows at arbitrary points across B+ Tree leaf nodes, causing frequent 16KB page splits and severe disk fragmentation",
        "UUIDs require 64TB RAM",
        "UUIDs delete existing indexes"
      ],
      correct: 1,
      explain: "Random UUIDs land in random B+ Tree pages. When a page fills up, it splits, creating high I/O churn. Time-ordered keys (UUIDv7) append sequentially at the right-most node."
    },
    {
      q: "According to the Leftmost Prefix Rule, a composite index on (country, city, status) CANNOT be used for which of the following WHERE queries?",
      opts: [
        "WHERE country = 'US' AND city = 'NYC'",
        "WHERE country = 'US'",
        "WHERE city = 'NYC' AND status = 'ACTIVE'",
        "WHERE country = 'US' AND city = 'NYC' AND status = 'ACTIVE'"
      ],
      correct: 2,
      explain: "The Leftmost Prefix Rule requires the first column of the composite index (country) to be present. Filtering on (city, status) misses the leftmost column."
    },
    {
      q: "[SCENARIO] A query 'SELECT name, email FROM users WHERE status = 'ACTIVE'' runs 10,000 times/sec, causing 100% SSD I/O utilization. The existing index is on (status). How do you eliminate disk I/O completely for this query without modifying SQL code?",
      opts: [
        "Change the index to a Composite Covering Index on (status, name, email)",
        "Add 100 more hard drives",
        "Disable database indexes",
        "Reboot the database"
      ],
      correct: 0,
      explain: "Adding name and email into the composite index creates a Covering Index. The database answers the query directly from the B+ Tree index without reading physical disk data pages."
    },
    {
      q: "[SCENARIO] You are searching an e-commerce catalog of 50 Million products. A user types 'shirt' in the search bar, executing 'SELECT * FROM products WHERE description LIKE '%shirt%'' which takes 14 seconds to complete. Why is the B+ Tree index ignored and how do you fix it?",
      opts: [
        "Leading wildcard '%shirt%' prevents B+ Tree prefix matching; replace with a Postgres GIN Full-Text Index or Elasticsearch",
        "Increase CPU clock speed",
        "Convert SQL to JSON files",
        "Delete product descriptions"
      ],
      correct: 0,
      explain: "B+ Trees rely on sorted prefix matching. Leading wildcards ('%shirt') prevent B+ Tree index navigation, requiring an inverted index (GIN / Elasticsearch) for full-text search."
    }
  ]
});
