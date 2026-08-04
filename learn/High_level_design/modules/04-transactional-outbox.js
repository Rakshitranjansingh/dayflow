window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "distributed-transactions",
  num: "04",
  title: "Transactional Outbox Pattern & Fencing Tokens",
  category: "DATA MANAGEMENT",
  icon: "🔄",
  tag: "Outbox Pattern / CDC",
  content: `
    <p>Updating a database and publishing a message queue event in two separate network calls introduces the <b>Dual-Write Problem</b>. If the application crashes or the network fails between operations, your database and message queue enter an inconsistent state.</p>

    <h3>The Transactional Outbox Pattern + Change Data Capture (CDC)</h3>
    <div class="flow-container">
      <div class="flow-step">
        <span class="flow-step-num">1</span>
        <div class="flow-step-content"><b>Begin Local DB Transaction:</b> The application service opens an ACID transaction on the local database.</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">2</span>
        <div class="flow-step-content"><b>Write Business Data:</b> Insert/Update domain records (e.g. <code>orders</code> table).</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">3</span>
        <div class="flow-step-content"><b>Write Outbox Event:</b> Insert event payload into an <code>outbox</code> table inside the <b>SAME local database transaction</b>.</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">4</span>
        <div class="flow-step-content"><b>Commit DB Transaction:</b> Atomically guarantees both domain record and outbox event are persisted together.</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">5</span>
        <div class="flow-step-content"><b>CDC Engine (Debezium):</b> Tails the DB binlog/WAL and asynchronously streams outbox events to Kafka topics without data loss.</div>
      </div>
    </div>

    <h3>Fencing Tokens in Distributed Locks</h3>
    <p>Distributed locks (e.g. Redis Redlock) can experience GC pauses where a worker's lock expires while it is paused. To prevent stale writes, use a monotonically increasing <b>Fencing Token</b> with storage engines to reject outdated tokens.</p>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>The Dual-Write Anti-Pattern:</b> Never call <code>db.save()</code> followed by <code>kafka.send()</code> in code. If Kafka fails, the DB has committed; if DB fails, Kafka has sent an invalid event.</li>
      <li><b>Outbox Table Atomicity:</b> Writing to an <code>outbox</code> table in the SAME database transaction guarantees atomicity via local ACID properties.</li>
      <li><b>Log-Based Change Data Capture (CDC):</b> Use Debezium to tail database binlogs (WAL) rather than polling the Outbox table with <code>SELECT *</code> queries which cause heavy DB lock contention.</li>
      <li><b>At-Least-Once Delivery:</b> CDC tools deliver events <i>at least once</i>. Consumers MUST implement idempotent handling using event IDs.</li>
      <li><b>Distributed Lock Expiration Risk:</b> A worker node holding a Redis lock can be paused by a 10-second JVM Stop-The-World GC. During the pause, the lock expires and another node acquires it!</li>
      <li><b>Fencing Token Defense:</b> The lock manager MUST issue an incrementing number (Fencing Token) with each lock. Storage systems reject writes with a fencing token lower than the highest committed token.</li>
      <li><b>Choreography vs Orchestration Saga:</b> Use Choreography for simple 2-3 step flows. Use Orchestration (with a Saga Orchestrator state machine) for complex multi-step workflows.</li>
      <li><b>Compensating Transaction Design:</b> Compensating transactions can also fail! They must be designed to be idempotent and retried until successful.</li>
      <li><b>Dead Letter Queues (DLQ) in Sagas:</b> If a compensating transaction repeatedly fails due to unrecoverable errors, route the event to a DLQ for manual admin intervention.</li>
      <li><b>Eventual Consistency Window Monitoring:</b> Instrument metrics for the delay between Outbox insertion and Kafka event publication (CDC lag). Alarm if CDC lag exceeds 1 second.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "How does the Transactional Outbox Pattern solve the Dual-Write problem when updating a database and publishing an event?",
      opts: [
        "By disabling database binlog indexing",
        "By writing the event to an Outbox table inside the exact same local database transaction",
        "By using multi-region synchronous replication",
        "By forcing clients to wait 10 seconds"
      ],
      correct: 1,
      explain: "Writing the outbox event to the local database inside the same ACID transaction ensures atomic execution; Change Data Capture (Debezium) then asynchronously streams events to Kafka without data loss."
    },
    {
      q: "What role does a Fencing Token play when using distributed locks (e.g. Redis Redlock)?",
      opts: [
        "It encrypts user passwords",
        "It provides a monotonically increasing counter with every lock grant, allowing storage engines to reject stale writes from paused workers",
        "It speeds up Redis memory allocation",
        "It replaces Kafka topics"
      ],
      correct: 1,
      explain: "Fencing tokens ensure that if Worker 1 suffers a long GC pause and its lock expires, its subsequent write is rejected by the database because Worker 2 has already written with a higher fencing token."
    },
    {
      q: "Why is Log-Based CDC (Debezium reading DB binlogs) preferred over polling an Outbox table with 'SELECT * FROM outbox'?",
      opts: [
        "Polling queries require custom C++ compilers",
        "Polling queries add severe CPU and table-locking overhead to the database, while binlog tailing reads existing sequential WAL disk logs",
        "Binlog tailing deletes user accounts",
        "Debezium runs on mobile phones"
      ],
      correct: 1,
      explain: "Binlog tailing extracts changes from disk WAL files asynchronously without issuing active SQL queries or acquiring locks on active database tables."
    },
    {
      q: "[SCENARIO] You are designing DoorDash's Order Processing engine. An order requires deducting inventory, charging credit card, and notifying the restaurant. During a network partition, the Credit Card step succeeds, but Restaurant Notification fails. How should your Saga handle this?",
      opts: [
        "Execute a compensating transaction to refund the credit card charge and restore inventory state to maintain data consistency",
        "Do nothing and keep the money",
        "Delete the user's account",
        "Lock the database forever"
      ],
      correct: 0,
      explain: "Sagas maintain eventual consistency across distributed microservices by executing compensating transactions in reverse order when a downstream step fails."
    },
    {
      q: "[SCENARIO] An e-commerce system uses Redis locks to ensure only 1 worker processes a high-value warehouse shipment. Worker A acquires the lock for 5s, suffers an unexpected 8-second JVM Garbage Collection pause, and attempts to commit after recovering. How do you protect against data corruption?",
      opts: [
        "Require the warehouse DB to enforce Fencing Tokens, rejecting Worker A's transaction because Worker B acquired the lock with a higher token during A's GC pause",
        "Increase Redis RAM",
        "Disable garbage collection completely",
        "Switch from Redis to MySQL"
      ],
      correct: 0,
      explain: "Fencing tokens are monotonically increasing numbers passed to the database. When Worker B acquires the expired lock, it receives Token #31. When Worker A wakes up and tries to write with Token #30, the DB rejects it."
    }
  ]
});
