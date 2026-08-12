window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "caching-strategies",
  num: "14",
  title: "Cache Stampede Mitigation & Probabilistic Expiration",
  category: "SCALABILITY",
  icon: "⚡",
  tag: "Cache Stampede / XFetch",
  content: `
    <p>A <b>Cache Stampede (Thundering Herd)</b> occurs when a highly popular cache key expires. Thousands of concurrent requests experience a cache miss simultaneously, flooding the database and causing system collapse.</p>

    <h3>Mitigation 1: Mutex Lock on Cache Miss</h3>
    <p>The first worker experiencing a cache miss acquires a distributed lock (Redis) to compute and re-populate the cache, while other workers wait or receive stale data.</p>

    <h3>Mitigation 2: Probabilistic Early Expiration (XFetch Algorithm)</h3>
    <p>As a key approaches TTL expiration, requests probabilistically recompute and refresh the cache <b>BEFORE it actually expires</b> based on computation cost and random delta math!</p>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Cache Stampede Mechanism:</b> Caused when high-read keys expire, causing $N$ parallel DB queries for the exact same data.</li>
      <li><b>XFetch Formula:</b> $\text{Read} - \beta \times \delta \times \ln(\text{random}()) > \text{TTL}$. Recomputes earlier if computation time ($\delta$) or read frequency is high.</li>
      <li><b>Soft TTL vs Hard TTL:</b> Return stale data immediately from cache if Hard TTL hasn't passed, while launching a background async task to refresh Soft TTL expired values.</li>
      <li><b>Cache Eviction Policies (LRU, LFU, ARC):</b> LRU (Least Recently Used) evicts oldest untouched items. LFU (Least Frequently Used) evicts lowest frequency items. ARC (Adaptive Replacement Cache) dynamically balances LRU + LFU.</li>
      <li><b>Cache Penetration Defense (Bloom Filter):</b> Attackers query non-existent keys (e.g. <code>user_id = -999</code>) to bypass cache and hit DB. Use a Bloom Filter or cache <code>null</code> values for 60s.</li>
      <li><b>Cache Breakdown vs Cache Avalanche:</b> Breakdown = 1 hot key expires. Avalanche = Thousands of different cache keys expire at the EXACT same time.</li>
      <li><b>Randomized Jitter TTL:</b> Add random jitter (e.g. $\text{TTL} = 300\text{s} + \text{random}(0, 60\text{s})$) when writing batch cache keys to prevent Cache Avalanche.</li>
      <li><b>Redis Memory Eviction Modes:</b> Set <code>maxmemory-policy volatile-lru</code> or <code>allkeys-lru</code> in Redis to prevent OOM crashes when memory fills up.</li>
      <li><b>Big Keys in Redis:</b> Avoid storing 100MB JSON blobs under a single Redis key. Big keys cause high network serialization pauses and block single-threaded Redis execution during deletion.</li>
      <li><b>Hot Key Local Caching (Two-Tier Cache):</b> Cache ultra-hot viral keys in local app server memory (Guava / Caffeine Cache) for 1-5 seconds to completely eliminate Redis network hops.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "What is the core benefit of the XFetch (Probabilistic Early Expiration) algorithm for caching?",
      opts: [
        "It encrypts Redis keys",
        "It proactively recomputes popular cache keys before they expire, preventing Cache Stampedes",
        "It deletes unused database tables",
        "It doubles RAM speed"
      ],
      correct: 1,
      explain: "XFetch calculates a probability threshold as TTL approaches, triggering a background refresh before the key expires so clients never encounter a cold cache miss."
    },
    {
      q: "How do you prevent a 'Cache Avalanche' caused by thousands of database keys expiring simultaneously at midnight?",
      opts: [
        "Add randomized jitter (e.g. + 0-60 seconds) to the TTL values when writing keys",
        "Disable caching at midnight",
        "Delete all database indexes",
        "Reboot the Redis cluster"
      ],
      correct: 0,
      explain: "Adding randomized jitter spreads key expiration timestamps across a time window, preventing all keys from expiring at the exact same second."
    },
    {
      q: "What attack does a Bloom Filter prevent when placed in front of a cache?",
      opts: [
        "Cache Penetration where malicious queries for non-existent IDs bypass cache to overload the database",
        "DDoS attack on DNS",
        "Buffer overflow in RAM",
        "SQL Syntax errors"
      ],
      correct: 0,
      explain: "Cache Penetration occurs when non-existent keys are queried repeatedly. A Bloom Filter quickly checks if an ID exists at all before allowing the query to hit the database."
    },
    {
      q: "[SCENARIO] Super Bowl live score data is queried 500,000 times/sec from Redis. Redis CPU hits 100% due to network I/O. How do you redesign the caching layer to handle 5M QPS without adding 50 Redis nodes?",
      opts: [
        "Implement a two-tier cache using local in-memory Caffeine cache inside API Gateway nodes for 1-second TTL to absorb 99% of requests",
        "Format the database",
        "Disable score updates during the game",
        "Use mechanical HDDs for caching"
      ],
      correct: 0,
      explain: "Local in-process caching (Caffeine/Guava) for 1-second TTL absorbs massive viral read traffic locally before it ever reaches the central Redis cluster."
    },
    {
      q: "[SCENARIO] A Redis engineer deletes a 500MB Hash object containing 10 Million fields using the 'DEL big_key' command. The entire Redis cluster stops responding for 4 seconds. What went wrong and how do you fix it?",
      opts: [
        "DEL is a single-threaded blocking memory deallocation call; use UNLINK big_key to deallocate memory asynchronously in a background thread",
        "Redis ran out of CPU power",
        "The hard drive crashed",
        "DEL commands require root passwords"
      ],
      correct: 0,
      explain: "Deleting big keys synchronously via DEL blocks the single-threaded Redis event loop. UNLINK reclaims memory asynchronously in a background thread without blocking commands."
    }
  ]
});
