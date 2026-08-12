window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "api-gateway-qna",
  num: "18",
  title: "System Design Interview Framework & Q&A",
  category: "ARCHITECTURE",
  icon: "🚪",
  tag: "HLD Framework",
  content: `
    <p>When navigating System Design interviews and technical design reviews, use a structured <b>System Design Leadership Framework</b>:</p>

    <div class="flow-container">
      <div class="flow-step">
        <span class="flow-step-num">1</span>
        <div class="flow-step-content"><b>Clarify Requirements:</b> Define Functional & Non-Functional Goals (SLAs, p99 Latency, Traffic Scale).</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">2</span>
        <div class="flow-step-content"><b>Capacity & Hardware Estimation:</b> Estimate QPS, Memory, Storage, and Network Bandwidth limits.</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">3</span>
        <div class="flow-step-content"><b>API Design & Schemas:</b> Define endpoints (REST/gRPC) and data storage model (SQL vs NoSQL).</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">4</span>
        <div class="flow-step-content"><b>High-Level Diagram:</b> Sketch API Gateway, Load Balancers, Services, Cache, and Message Queues.</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">5</span>
        <div class="flow-step-content"><b>Deep-Dive Component Design:</b> Address single points of failure, bottlenecks, and edge cases.</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">6</span>
        <div class="flow-step-content"><b>Trade-off Justifications & Observability:</b> Justify CAP/PACELC choices, p99 tail latency, and monitoring stack.</div>
      </div>
    </div>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Requirements Slicing:</b> Always separate Functional Requirements (e.g. "Post a Tweet") from Non-Functional Requirements (e.g. "p99 < 200ms, 99.99% uptime, 100k QPS peak").</li>
      <li><b>Back-of-Envelope Sizing:</b> Use napkin math during interviews to justify choosing NoSQL vs SQL, or sizing Redis cache RAM.</li>
      <li><b>Single Point of Failure (SPOF) Scan:</b> Walk through your architecture diagram and explicitly point out how every component (LB, Gateway, DB, Cache) has active redundancy.</li>
      <li><b>Data Schema Choice Justification:</b> Never say "I picked MongoDB because it's fast." Explain schema flexibility, document nesting vs normalized relational joins, and scaling model.</li>
      <li><b>API Boundary Definition:</b> Clearly define request/response payloads, HTTP methods, status codes, and error responses before drawing deep architecture blocks.</li>
      <li><b>Database Bottleneck Resolution:</b> Be prepared to explain read-scaling (Read Replicas, Caching) vs write-scaling (Sharding, LSM Trees, Message Queues).</li>
      <li><b>Tail Latency Mitigation:</b> Proactively discuss p99 latency drivers (GC pauses, connection pools, noisy neighbors) and solutions (ZGC, Hedged Requests).</li>
      <li><b>Edge Case & Failure Mode Defense:</b> Impress staff interviewers by volunteering solutions for Split-Brain, Thundering Herds, Dual-Writes, and Clock Drift.</li>
      <li><b>Cost Optimization Awareness:</b> A Staff Engineer balances architectural elegance with cloud bill costs (cross-AZ traffic, RAM vs NVMe SSD costs, server counts).</li>
      <li><b>Monitoring & Observability Stack:</b> End your design with Observability: Metrics (Prometheus), Distributed Tracing (Jaeger), and Structured Logging (ELK/Loki).</li>
    </ol>
  `,
  quizzes: [
    {
      q: "When designing a real-time push system supporting 100 Million concurrent connections, which I/O model is required to prevent thread exhaustion?",
      opts: [
        "One-thread-per-connection blocking I/O model",
        "Non-blocking Async I/O (epoll / kqueue / Netty event loop)",
        "Synchronous PHP scripts",
        "Writing connections to disk"
      ],
      correct: 1,
      explain: "One-thread-per-connection causes OS memory exhaustion with millions of threads. Non-blocking Async I/O (epoll / Netty) allows a small thread pool to manage millions of concurrent socket descriptors."
    },
    {
      q: "What is the very FIRST phase a candidate should execute in a System Design Interview or RFC design review?",
      opts: [
        "Start drawing database tables immediately",
        "Clarify Functional & Non-Functional requirements, scale, SLAs, and scope boundaries",
        "Write 500 lines of Java code",
        "Calculate cloud billing costs"
      ],
      correct: 1,
      explain: "Jumping straight into drawing diagrams without clarifying functional goals, latency SLAs, and traffic scale leads to failing system design interviews."
    },
    {
      q: "How do you handle split-brain prevention in a multi-region distributed cluster when a network partition cuts off regional connectivity?",
      opts: [
        "Use Raft or Paxos consensus algorithms requiring majority quorum (N/2 + 1) agreement before leader election or state changes",
        "Allow both isolated data centers to elect local primary masters and accept conflicting writes without merging",
        "Turn off power in both data centers",
        "Delete all database indexes"
      ],
      correct: 0,
      explain: "Raft/Paxos consensus mandates strict majority quorum agreement ($N/2 + 1$), preventing isolated minority partitions from electing rogue leader masters."
    },
    {
      q: "[SCENARIO] You are interviewing for a Senior/Staff Engineer role. The interviewer asks: 'Design WhatsApp's messaging backend for 2 Billion users.' You need to store message chat history. Should you choose PostgreSQL or Apache Cassandra / ScyllaDB?",
      opts: [
        "Cassandra / ScyllaDB (LSM Tree NoSQL): append-only sequential write performance, high partition scalability by (chat_id), and effortless horizontal expansion",
        "Single-node PostgreSQL with B+ Trees",
        "Flat text files stored on USB drives",
        "SQLite on mobile phones"
      ],
      correct: 0,
      explain: "WhatsApp chat messages are write-heavy append-only time-series data partitioned by chat_id. LSM-tree distributed stores (Cassandra/ScyllaDB) handle millions of write operations effortlessly."
    },
    {
      q: "[SCENARIO] In a System Design interview, your proposed architecture uses Redis as a centralized cache. The interviewer asks: 'What happens if 100,000 requests per second hit a single cache key at the exact millisecond it expires?' How do you answer?",
      opts: [
        "Explain Cache Stampede / Thundering Herd mitigation using Mutex Locks on cache misses or XFetch Probabilistic Early Expiration",
        "Say that cache keys never expire",
        "Suggest restarting the database server",
        "Change the subject to frontend CSS"
      ],
      correct: 0,
      explain: "Demonstrating deep knowledge of Cache Stampedes and providing concrete algorithmic solutions (Mutex locks, XFetch, Soft TTL) is a classic benchmark for Senior/Staff candidates."
    }
  ]
});
