window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "high-availability",
  num: "11",
  title: "High Availability Metrics: RPO, RTO & Chaos Testing",
  category: "SCALABILITY",
  icon: "🛡️",
  tag: "RPO / RTO / Chaos Eng",
  content: `
    <p>Disaster recovery plans and high availability architectures are measured by two core metrics: <b>RPO (Recovery Point Objective)</b> and <b>RTO (Recovery Time Objective)</b>.</p>

    <h3>RPO vs RTO Definitions</h3>
    <ul>
      <li><b>RPO (Recovery Point Objective):</b> Maximum acceptable data loss duration during a disaster (e.g. RPO = 5 mins means losing up to 5 mins of DB writes is tolerated).</li>
      <li><b>RTO (Recovery Time Objective):</b> Maximum acceptable downtime to restore system operations (e.g. RTO = 1 hour means service must be online within 1 hour).</li>
    </ul>

    <h3>Chaos Engineering (Netflix Chaos Monkey)</h3>
    <p>Proactively injecting random production failures (killing instances, introducing 500ms network latency, terminating DB masters) to verify automated failovers and self-healing systems.</p>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Availability Percentage Math:</b> 99.9% ("Three Nines") = 8.76 hours downtime/yr. 99.99% ("Four Nines") = 52.6 mins downtime/yr. 99.999% ("Five Nines") = 5.26 mins downtime/yr.</li>
      <li><b>RPO = 0 Requirement:</b> Achieving zero data loss (RPO = 0) requires <b>Synchronous Multi-Region Replication</b>, which adds network round-trip write latency.</li>
      <li><b>RTO Optimization via Automated Failover:</b> Manual human failover procedures yield RTO > 30 mins. Automated health checks + DNS/BGP traffic switching yield RTO < 30 seconds.</li>
      <li><b>Split-Brain Prevention (Quorum Consensus):</b> Failover managers must use Raft/Paxos consensus across an odd number of nodes (3, 5, or 7) to avoid dual primary masters.</li>
      <li><b>Graceful Service Degradation:</b> When core databases become overloaded, fallback to static mock responses, cached values, or disable non-essential UI features (e.g. recommendations).</li>
      <li><b>Health Check Probes (Liveness vs Readiness):</b> <b>Liveness Probes</b> restart dead pods. <b>Readiness Probes</b> temporarily remove pods from load balancer traffic during warming/overload.</li>
      <li><b>Chaos Engineering Principles:</b> Run Chaos Monkey in production during business hours when engineers are online to monitor automated failovers before real outages strike.</li>
      <li><b>Cold Standby vs Hot Standby:</b> Cold standby requires spinning up new cloud servers (RTO = 15-30 mins). Hot standby keeps active running instances ready for instant traffic takeover (RTO < 5s).</li>
      <li><b>Back-pressure Mechanisms:</b> Downstream services must return HTTP 503 Service Unavailable when queue buffers fill up to signal upstream callers to slow down.</li>
      <li><b>Disaster Recovery Game Days:</b> Regularly run simulated data center failure drills with dev teams to validate runbooks and RPO/RTO metrics.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "What does an RPO (Recovery Point Objective) of 0 seconds require in database architecture?",
      opts: [
        "Asynchronous read replicas",
        "Synchronous Multi-Region Database Replication (Zero Data Loss)",
        "Daily backup tapes",
        "Single-node PostgreSQL"
      ],
      correct: 1,
      explain: "RPO = 0 means ZERO data loss is acceptable during a disaster, requiring synchronous multi-region replication where writes wait for confirmation from remote regions before committing."
    },
    {
      q: "What is the difference between a Liveness Probe and a Readiness Probe in Kubernetes?",
      opts: [
        "Liveness probe restarts a failed container; Readiness probe temporarily stops sending traffic to a container that is busy or warming up",
        "Liveness probe runs on GPUs; Readiness probe runs on CPUs",
        "They are identical",
        "Readiness probe deletes log files"
      ],
      correct: 0,
      explain: "Liveness probes detect deadlocks and restart pods. Readiness probes detect temporary overload or warming states, taking pods off load balancer traffic without killing them."
    },
    {
      q: "Why is an ODD number of nodes (3, 5, or 7) required in consensus clusters (e.g. Raft, Zookeeper) for automated failover?",
      opts: [
        "Odd numbers run faster on 64-bit CPUs",
        "Odd numbers prevent split-brain ties when voting for a new leader during network partitions",
        "Even numbers cause database corruption",
        "Odd numbers use less RAM"
      ],
      correct: 1,
      explain: "Consensus requires a strict majority quorum ($N/2 + 1$). An odd number of nodes prevents 50/50 tie splits during network partition votes."
    },
    {
      q: "[SCENARIO] Netflix's primary AWS region (us-east-1) suffers a complete power outage. Netflix's automated traffic router redirects 100% of global video stream traffic to us-west-2 in 12 seconds with zero data loss. What RPO and RTO did Netflix achieve?",
      opts: [
        "RPO = 0 seconds, RTO = 12 seconds",
        "RPO = 1 hour, RTO = 24 hours",
        "RPO = 12 seconds, RTO = 0 seconds",
        "RPO = 5 days, RTO = 12 minutes"
      ],
      correct: 0,
      explain: "RPO measures data loss (0 seconds lost). RTO measures downtime duration until restored (12 seconds)."
    },
    {
      q: "[SCENARIO] During Black Friday, Amazon's recommendation engine database crashes. Instead of displaying a 500 error page, the website displays top 10 bestseller items from static S3 caches. What architectural pattern is this?",
      opts: [
        "Graceful Service Degradation",
        "Dual-Write Anti-Pattern",
        "Database Sharding",
        "Memory Leak"
      ],
      correct: 0,
      explain: "Graceful Degradation ensures that when complex dependencies fail, the system falls back to static cached data or degraded non-critical features rather than crashing the core experience."
    }
  ]
});
