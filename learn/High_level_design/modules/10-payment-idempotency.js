window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "idempotency",
  num: "10",
  title: "Payment Systems: Idempotency Keys & State Machine",
  category: "ARCHITECTURE",
  icon: "🔑",
  tag: "Payment Architecture",
  content: `
    <p>Building reliable payment APIs requires a strict <b>Distributed Locking + Idempotency State Machine</b> to prevent double-charging users during sub-millisecond duplicate submissions or network retries.</p>

    <h3>Idempotent Execution Workflow</h3>
    <div class="flow-container">
      <div class="flow-step">
        <span class="flow-step-num">1</span>
        <div class="flow-step-content"><b>Client Request:</b> Client sends <code>POST /v1/charges</code> with header <code>Idempotency-Key: uuid-123</code>.</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">2</span>
        <div class="flow-step-content"><b>Acquire Lock:</b> API Gateway tries Redis <code>SETNX lock:idempotency:uuid-123</code> with 30s TTL.</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">3</span>
        <div class="flow-step-content"><b>If Lock Acquired:</b> Set state <code>IN_PROGRESS</code>. Execute Payment Provider API call (Stripe/Bank).</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">4</span>
        <div class="flow-step-content"><b>On Completion:</b> Store HTTP response body & status in DB/Cache linked to key. Set state <code>COMPLETED</code>. Release lock.</div>
      </div>
      <div class="flow-step">
        <span class="flow-step-num">5</span>
        <div class="flow-step-content"><b>If Lock Exists (Duplicate):</b> Return <b>HTTP 409 Conflict</b> or serve cached <code>COMPLETED</code> response payload without re-charging!</div>
      </div>
    </div>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Mandatory Unique Key Header:</b> API clients generate a unique V4 UUID <code>Idempotency-Key</code> header for all non-idempotent operations (POST).</li>
      <li><b>Redis SETNX Lock Acquisition:</b> Use <code>SET key value NX PX 30000</code> to atomically set the key ONLY if it does not already exist, with a 30-second expiry.</li>
      <li><b>Payment State Machine Transition:</b> Valid transitions MUST be enforced in code: <code>CREATED -> IN_PROGRESS -> SUCCEEDED / FAILED</code>. Disallow invalid jumps.</li>
      <li><b>Handling Sub-Millisecond Parallel Retries:</b> If Request 2 arrives while Request 1 is still <code>IN_PROGRESS</code>, return <b>HTTP 409 Conflict</b> with <code>Retry-After: 2</code> header.</li>
      <li><b>Caching Response Payloads:</b> Once a payment request completes, store the entire HTTP response body and status code in the DB table linked to the idempotency key for 24-72 hours.</li>
      <li><b>Payload Hashing Verification:</b> Hash the request payload (e.g. SHA-256 of amount, currency, user ID). If a client sends the SAME Idempotency-Key with a DIFFERENT payload, return <b>HTTP 400 Bad Request</b> (Idempotency Key reuse payload mismatch).</li>
      <li><b>Database Unique Constraints:</b> Add a database-level <code>UNIQUE INDEX (user_id, idempotency_key)</code> as a second line of defense behind Redis locks.</li>
      <li><b>Bank Provider Webhook Re-Entrancy:</b> Payment gateways (Stripe/PayPal) send asynchronous webhooks on transaction status changes. Webhook handlers MUST also be idempotent!</li>
      <li><b>Idempotency TTL Retention:</b> Idempotency keys should be retained in storage for 24 to 72 hours, after which old keys can be safely purged.</li>
      <li><b>Distributed Lock Heartbeat / Renewal:</b> For long-running background tasks (>30s), use a background watchdog thread to extend the Redis lock TTL periodically until task completion.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "In an idempotent payment system, what should the API return if a second request with the SAME Idempotency Key arrives while the first request is STILL processing?",
      opts: [
        "Charge the customer a second time to be safe",
        "Return HTTP 409 Conflict or HTTP 429 Retry-After until processing completes",
        "Delete the customer's credit card",
        "Return HTTP 500 Internal Error"
      ],
      correct: 1,
      explain: "If a duplicate request arrives while the initial payment call is still IN_PROGRESS, returning 409 Conflict or waiting for the locked result prevents double-processing."
    },
    {
      q: "What should an API server do if a client sends a request with an existing Idempotency Key, but changes the request payload (e.g., changes amount from $10 to $500)?",
      opts: [
        "Process the $500 payment silently",
        "Return HTTP 400 Bad Request error indicating Idempotency Key reuse with mismatched payload",
        "Format the database",
        "Refund all previous charges"
      ],
      correct: 1,
      explain: "Reusing an Idempotency Key with a different payload is an application error or fraud attempt. The server must reject it with HTTP 400 Bad Request."
    },
    {
      q: "Why is an atomic Redis command like 'SET key value NX PX 30000' necessary when acquiring an idempotency lock?",
      opts: [
        "It encrypts the payload in RAM",
        "It sets the key ONLY if it does not already exist and sets a 30-second TTL in a single atomic step",
        "It bypasses database authentication",
        "It formats the hard drive"
      ],
      correct: 1,
      explain: "SET NX (Not Exists) PX (Milliseconds Expiry) ensures atomic lock acquisition, preventing race conditions where two threads think they both acquired the lock."
    },
    {
      q: "[SCENARIO] A user on Amazon clicks 'Place Order' twice in 10 milliseconds due to a laggy button UI. Both HTTP POST requests arrive simultaneously at two different API gateway instances. How does your backend prevent duplicate charges?",
      opts: [
        "Instance 1 acquires the Redis SETNX lock for the Idempotency Key; Instance 2 fails to acquire the lock and returns a 409 Conflict response without hitting the bank API",
        "Process both credit card charges and send two packages",
        "Block the user's IP address forever",
        "Reboot the database"
      ],
      correct: 0,
      explain: "Redis SETNX ensures only Instance 1 acquires the lock and processes the bank transaction, while Instance 2 fails lock acquisition instantly."
    },
    {
      q: "[SCENARIO] Stripe sends a payment confirmation Webhook to your server. A network glitch causes Stripe to retry sending the exact same webhook 5 times over 10 minutes. How must your Webhook receiver be architected?",
      opts: [
        "Check the webhook event ID in the database; if already processed, return HTTP 200 OK immediately without re-processing business logic",
        "Credit the user's account 5 times",
        "Throw an unhandled exception and crash",
        "Delete the order record"
      ],
      correct: 0,
      explain: "Webhook endpoints must be idempotent. Logging processed webhook event IDs ensures duplicate webhook deliveries return 200 OK immediately without duplicate processing."
    }
  ]
});
