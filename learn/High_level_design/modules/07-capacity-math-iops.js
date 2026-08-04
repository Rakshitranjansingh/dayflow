window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "estimation",
  num: "07",
  title: "Capacity Math: IOPS, Memory & Bandwidth",
  category: "FOUNDATIONS",
  icon: "🧮",
  tag: "IOPS / Bandwidth / Hardware",
  content: `
    <p>Accurate system capacity estimations must account for physical hardware limits: <b>Network Bandwidth (Gbps)</b>, <b>Memory Footprint</b>, and <b>Disk IOPS Limits</b>.</p>

    <h3>Hardware Benchmarks Reference</h3>
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr><th>Hardware Component</th><th>Typical Throughput / IOPS</th><th>Latency</th></tr></thead>
        <tbody>
          <tr><td><b>L1 / L2 Cache</b></td><td>~100 GB/s</td><td>~0.5 - 7 ns</td></tr>
          <tr><td><b>RAM (DDR4/DDR5)</b></td><td>~50 - 100 GB/s</td><td>~100 ns</td></tr>
          <tr><td><b>NVMe SSD</b></td><td>~100,000 - 500,000 IOPS (3-7 GB/s)</td><td>~50 - 100 μs</td></tr>
          <tr><td><b>SATA SSD</b></td><td>~10,000 IOPS (500 MB/s)</td><td>~0.1 - 0.2 ms</td></tr>
          <tr><td><b>HDD (Mechanical)</b></td><td>~150 - 200 IOPS (150 MB/s)</td><td>~10 ms</td></tr>
          <tr><td><b>10 Gbps Network Interface</b></td><td>~1.25 GB/sec max throughput</td><td>~0.5 - 2 ms (Same Region)</td></tr>
        </tbody>
      </table>
    </div>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Memory Footprint Math:</b> Always account for index overhead in RAM. An index entry storing a 64-bit ID + 64-bit pointer requires 16 bytes. 1 Billion rows = 16GB pure index memory (plus B+ Tree node overhead ~30GB total).</li>
      <li><b>Network Bandwidth Saturation:</b> A single 10 Gbps Network Interface Card (NIC) caps at ~1.25 GB/sec. A cluster serving 10,000 video streams at 2 Mbps per stream requires 20 Gbps total egress bandwidth.</li>
      <li><b>IOPS vs Throughput Limiters:</b> Small random 4KB writes hit the disk <b>IOPS limit</b> before hitting bandwidth limits. Large 1MB sequential writes hit the disk <b>Throughput limit (GB/s)</b> first.</li>
      <li><b>Peak Traffic Multiplier:</b> Always calculate hardware sizing for <b>Peak Traffic</b> (typically 2x to 5x average daily QPS).</li>
      <li><b>Read/Write Ratio Sizing:</b> Systems with 99% reads (like Wikipedia) require heavy CDN & Redis caching layer sizing. Systems with 80% writes (like IoT telemetry) require LSM-tree disk IOPS sizing.</li>
      <li><b>80/20 Memory Cache Rule:</b> 20% of hot data generates 80% of read requests. Cache RAM capacity should be sized to hold 20% of daily active data.</li>
      <li><b>Garbage Collection RAM Headroom:</b> Never size JVM RAM right at working set limits. Allocate 30-50% extra memory headroom for garbage collection allocation rates.</li>
      <li><b>Database Connection Overhead:</b> Each PostgreSQL connection thread consumes ~5-10MB RAM. 5,000 active connections consume 25-50GB RAM just for idle thread stacks! Use pgbouncer connection pooling.</li>
      <li><b>SSD Write Endurance (DWPD):</b> High-write database systems can burn through consumer SSD flash memory in months. Specify Enterprise SSDs rated for $\ge 3$ Drive Writes Per Day (DWPD).</li>
      <li><b>Cloud Network Egress Cost:</b> Cross-region data transfer costs money (~$0.02/GB in AWS). Keep high-bandwidth microservice-to-microservice traffic inside the same Availability Zone / Region whenever possible.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "How many Random Read IOPS can a traditional mechanical HDD handle compared to an NVMe SSD?",
      opts: [
        "HDD: ~200 IOPS vs NVMe: ~100,000+ IOPS",
        "HDD: ~10,000 IOPS vs NVMe: ~10,000 IOPS",
        "HDD: ~1 Million IOPS vs NVMe: ~500 IOPS",
        "They have identical IOPS"
      ],
      correct: 0,
      explain: "Mechanical HDDs are limited by physical disk head seeking (~150-200 IOPS), whereas NVMe SSDs process parallel flash memory requests achieving 100,000 to 500,000+ IOPS."
    },
    {
      q: "If a database receives 50,000 small random 4KB write operations per second, what is the minimum IOPS rating required from the underlying storage layer?",
      opts: [
        "150 IOPS",
        "5,000 IOPS",
        "50,000 IOPS",
        "1,000,000 IOPS"
      ],
      correct: 2,
      explain: "Each 4KB random write counts as 1 I/O operation. Handling 50,000 random writes/sec requires a storage system rated for at least 50,000 IOPS (such as NVMe SSDs or RAID arrays)."
    },
    {
      q: "Why does PostgreSQL consume 25-50GB of RAM when holding 5,000 direct client connections, even if queries are idle?",
      opts: [
        "PostgreSQL creates a dedicated process/thread per connection, each consuming 5-10MB of memory for stack space and session state",
        "PostgreSQL encrypts the hard drive on every connection",
        "PostgreSQL downloads copies of the Web",
        "Idle connections burn CPU GPU cycles"
      ],
      correct: 0,
      explain: "Postgres uses a process-per-connection model. Idle connection processes consume ~5-10MB RAM for process overhead, requiring a connection pooler (PgBouncer) to scale."
    },
    {
      q: "[SCENARIO] You are designing YouTube's video ingestion service. 100,000 creators upload 4K videos simultaneously, each video uploading at 50 Mbps. What is the total network ingress bandwidth your intake gateway fleet must support?",
      opts: [
        "5 Terabits per second (5 Tbps / 625 GB/s)",
        "1 Gigabyte per second",
        "50 Megabits per second",
        "100 Kilobytes per second"
      ],
      correct: 0,
      explain: "100,000 connections * 50 Mbps = 5,000,000 Mbps = 5,000 Gbps = 5 Terabits/sec (5 Tbps) ingress bandwidth."
    },
    {
      q: "[SCENARIO] An e-commerce company generates 500 Terabytes of new user log data daily. You need to size a Redis cache cluster using the 80/20 rule to cache 1 day of hot data. How much RAM must the Redis cluster hold?",
      opts: [
        "100 Terabytes of RAM (20% of 500TB)",
        "500 Terabytes of RAM",
        "1 Gigabyte of RAM",
        "10 Megabytes of RAM"
      ],
      correct: 0,
      explain: "The 80/20 rule dictates that 20% of data drives 80% of traffic. To cache 1 day of hot data out of 500TB, size the Redis cache cluster to hold $20\% \times 500\text{TB} = 100\text{TB}$ RAM."
    }
  ]
});
