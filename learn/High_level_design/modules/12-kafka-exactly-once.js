window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "message-queues",
  num: "12",
  title: "Kafka Exactly-Once Semantics (EOS) & Outbox",
  category: "ARCHITECTURE",
  icon: "📬",
  tag: "Kafka EOS / Outbox",
  content: `
    <p>In distributed event streaming, achieving <b>Exactly-Once Semantics (EOS)</b> across producers, brokers, and consumers requires combining 3 features:</p>
    
    <ol>
      <li><b>Idempotent Producer:</b> Uses sequence numbers (<code>enable.idempotence=true</code>) to deduplicate retried message batches at the broker.</li>
      <li><b>Transactional Producer:</b> Groups atomic writes across multiple topics/partitions via a <b>Transaction Coordinator</b> (<code>transactional.id</code>).</li>
      <li><b>Read-Committed Consumer:</b> Configures <code>isolation.level=read_committed</code> so consumers ignore uncommitted or aborted transaction messages.</li>
    </ol>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Three Delivery Guarantees:</b> At-Most-Once (may lose events), At-Least-Once (may duplicate events), Exactly-Once (guaranteed single processing).</li>
      <li><b>Idempotent Producer Sequence Numbers:</b> Producer assigns increasing sequence numbers per batch. Broker rejects duplicates if network retries resend a batch.</li>
      <li><b>Kafka Transaction Coordinator:</b> Manages two-phase commits across Kafka partitions using a specialized <code>__transaction_state</code> internal topic.</li>
      <li><b>Consumer Offset Commit Strategy:</b> Auto-committing offsets before processing causes data loss on crash. Manually commit offsets AFTER processing completes.</li>
      <li><b>Kafka Rebalance Storms:</b> Heavy long-running consumer processing exceeding <code>max.poll.interval.ms</code> causes Kafka to think the consumer died, triggering expensive consumer group rebalances.</li>
      <li><b>Cooperative Sticky Assignor:</b> Use <code>CooperativeStickyAssignor</code> in Kafka 2.4+ for incremental rebalancing without stopping all consumer threads (Eager Rebalance Stop-The-World).</li>
      <li><b>Log Compaction in Kafka:</b> Retains at least the latest value for each message key within a partition, transforming Kafka into an event-driven key-value database.</li>
      <li><b>Zero-Copy Optimization (sendfile):</b> Kafka transfers bytes directly from OS Page Cache to Network NIC via <code>sendfile()</code> system call, bypassing JVM memory copying for 10x speed.</li>
      <li><b>Dead Letter Queue (DLQ) Pattern:</b> Malformed "poison pill" messages that crash consumers are caught, logged, and redirected to a DLQ topic after N retries.</li>
      <li><b>Partition Key Hotspots:</b> Uneven partitioning keys (e.g. keying by Country where US has 80% volume) overload single partitions. Add random salt suffixes to hot keys.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "Which combination of Kafka configurations enables true Exactly-Once Processing across topic streams?",
      opts: [
        "enable.idempotence=true, transactional.id, and isolation.level=read_committed",
        "auto.commit.offset=true and batch.size=1",
        "compression.type=gzip and retries=0",
        "max.poll.interval.ms=10"
      ],
      correct: 0,
      explain: "Kafka EOS combines Producer Idempotence (deduplication), Producer Transactions (atomic multi-partition writes), and Consumer Read-Committed isolation."
    },
    {
      q: "How does Kafka achieve ultra-high network transfer throughput via Zero-Copy (sendfile)?",
      opts: [
        "It transfers data from disk Page Cache directly to the Network NIC without copying data into JVM application memory",
        "It runs on client GPUs",
        "It bypasses IP routers",
        "It disables disk writes"
      ],
      correct: 0,
      explain: "Zero-copy uses the Linux OS sendfile() kernel API to pipe page cache bytes straight to the network card buffer, skipping JVM user-space copies."
    },
    {
      q: "What happens if a Kafka consumer's processing loop takes longer than max.poll.interval.ms?",
      opts: [
        "The consumer group coordinator marks the consumer dead and triggers a consumer group rebalance",
        "Kafka deletes the topic",
        "The broker shuts down",
        "The message is converted to XML"
      ],
      correct: 0,
      explain: "Exceeding max.poll.interval.ms signals the broker that the consumer thread is stuck, causing the broker to evict it and trigger a rebalance."
    },
    {
      q: "[SCENARIO] You are building LinkedIn's real-time notifications stream. A malformed 'poison pill' JSON payload causes consumer workers to crash in an infinite loop. How do you prevent stream pipeline collapse?",
      opts: [
        "Catch the JSON parsing exception and route the malformed payload to a Dead Letter Queue (DLQ) topic after 3 retries",
        "Delete the entire Kafka cluster",
        "Ignore all incoming notifications forever",
        "Restart the consumer server every second"
      ],
      correct: 0,
      explain: "Dead Letter Queue (DLQ) routing isolates corrupt payloads so unparseable messages do not block the pipeline for legitimate messages."
    },
    {
      q: "[SCENARIO] You are operating a 500-node Kafka cluster handling 10 Million events/sec. When a single consumer joins, the legacy Eager Rebalancer pauses ALL 500 consumers for 45 seconds (Stop-The-World). How do you eliminate this pause?",
      opts: [
        "Upgrade consumer group configuration to use CooperativeStickyAssignor for incremental non-blocking rebalances",
        "Disable consumers completely",
        "Reboot the Zookeeper ensemble",
        "Delete all partitions"
      ],
      correct: 0,
      explain: "Cooperative Sticky Assignor performs incremental rebalances, reassigning only affected partitions while allowing unaffected consumers to continue reading."
    }
  ]
});
