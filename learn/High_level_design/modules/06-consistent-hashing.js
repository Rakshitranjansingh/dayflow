window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "consistent-hashing",
  num: "06",
  title: "Consistent Hashing with Bounded Loads (Google)",
  category: "SCALABILITY",
  icon: "⭕",
  tag: "Bounded Loads / Hashing",
  content: `
    <p>In standard Consistent Hashing, if a popular cache key (e.g. viral celebrity post) hits a single server, that server crashes from load. When it crashes, its traffic cascades to the next server on the ring, triggering <b>Cascading Failures</b>.</p>

    <h3>Google's Consistent Hashing with Bounded Loads</h3>
    <p>Sets a hard maximum capacity limit per node: <code>Max Load = (1 + ε) * Average Load</code> (typically 1.25x). If a target server on the ring exceeds this threshold, the lookup continues clockwise to the next available non-overloaded server.</p>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Mod Hashing Fragility:</b> <code>hash(key) % N</code> breaks down when $N$ changes, remapping $(N-1)/N \approx 99\%$ of keys and crashing databases.</li>
      <li><b>Consistent Hashing Key Remapping:</b> Consistent hashing remaps only $K/N$ keys on node addition/removal, where $K$ is total keys and $N$ is total servers.</li>
      <li><b>Virtual Nodes (Vnodes):</b> Physical servers are mapped to 100-250 virtual positions on the ring to smooth out non-uniform hash distribution.</li>
      <li><b>Google Bounded Load Factor ($\epsilon$):</b> Capping server capacity at $(1 + \epsilon)$ times average load prevents viral celebrity posts from blowing up a single cache node.</li>
      <li><b>Uniform Hash Function Choice:</b> Use <b>MurmurHash3</b> or <b>CityHash</b> for hash ring mapping. They are non-cryptographic, extremely fast, and provide uniform distribution.</li>
      <li><b>Replicas on Hash Ring:</b> Store data replicas on the next $R$ consecutive physical servers clockwise on the ring (skipping duplicate vnodes of the same physical machine).</li>
      <li><b>Hotspot Key Splitting:</b> For extreme viral keys (e.g. Cristiano Ronaldo post), append a random suffix <code>key_#1</code> to <code>key_#10</code> to distribute reads across multiple ring nodes.</li>
      <li><b>Node Weighting:</b> Assign more Virtual Nodes to high-spec physical machines (e.g. 64-core vs 16-core servers) proportional to their RAM/CPU capacity.</li>
      <li><b>Client-Side Ring Routing:</b> Clients or API Gateways maintain local cached copies of the hash ring to route requests directly to destination servers without extra proxy hops.</li>
      <li><b>Dynamic Ring Gossip Protocol:</b> Nodes use a peer-to-peer Gossip Protocol (Ring state sync) to discover node additions/failures within milliseconds.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "What vulnerability in standard Consistent Hashing does Google's 'Bounded Loads' algorithm address?",
      opts: [
        "Memory fragmentation in C++",
        "Cascading server failures caused by popular hot keys overwhelming a single cache node",
        "Slow SSL handshakes",
        "SQL injection attacks"
      ],
      correct: 1,
      explain: "Consistent Hashing with Bounded Loads caps max capacity per node at (1 + ε) * Average, routing excess traffic to neighboring nodes to prevent hot key cascades."
    },
    {
      q: "Why are non-cryptographic hash functions like MurmurHash3 or CityHash preferred over MD5/SHA-256 for Consistent Hashing ring placement?",
      opts: [
        "MurmurHash3 is much faster and produces a highly uniform distribution without expensive cryptographic overhead",
        "SHA-256 is banned by Google",
        "MD5 requires 500GB RAM",
        "CityHash encrypts database tables"
      ],
      correct: 0,
      explain: "Hash ring placement requires fast uniform distribution. Cryptographic security is unnecessary, so ultra-fast non-cryptographic algorithms like MurmurHash3 are optimal."
    },
    {
      q: "How does a system store 3 replicas of a key on a Consistent Hashing ring with Virtual Nodes?",
      opts: [
        "Store the key on 3 random servers anywhere in the world",
        "Walk clockwise along the ring and place replicas on the first 3 DISTINCT physical servers encountered",
        "Store 3 copies on the exact same server",
        "Write 3 copies to local developer laptops"
      ],
      correct: 1,
      explain: "To ensure fault tolerance, replicas are placed on the next distinct physical servers clockwise on the ring, skipping virtual nodes belonging to physical servers already picked."
    },
    {
      q: "[SCENARIO] Taylor Swift posts a live streaming update on Twitter/X. 5 Million users request the key 'tweet_123' simultaneously. Standard Consistent Hashing routes all 5M requests to Server 42, crashing it. Traffic cascades to Server 43, crashing it too. How do you re-architect this?",
      opts: [
        "Implement Consistent Hashing with Bounded Loads AND apply Key Splitting (e.g. 'tweet_123_1' .. 'tweet_123_20') to scatter reads across 20 ring nodes",
        "Reboot Twitter",
        "Ask users to stop clicking the tweet",
        "Increase MySQL connection timeout"
      ],
      correct: 0,
      explain: "Key Splitting creates virtual sub-keys for hot items, scattering reads across multiple hash ring nodes while Bounded Loads prevents any single node from taking >125% average load."
    },
    {
      q: "[SCENARIO] You are upgrading a distributed Redis caching fleet by introducing new 128GB RAM servers alongside legacy 32GB RAM servers. How do you configure Consistent Hashing to utilize the new hardware capacity?",
      opts: [
        "Assign 4x more Virtual Nodes to the 128GB physical servers on the hash ring proportional to their capacity",
        "Delete all legacy 32GB servers immediately",
        "Use mod-hashing on the new servers only",
        "Disable caching"
      ],
      correct: 0,
      explain: "Weighted Consistent Hashing assigns virtual nodes proportional to server capacity, ensuring 128GB nodes receive 4x more cache keys than 32GB nodes."
    }
  ]
});
