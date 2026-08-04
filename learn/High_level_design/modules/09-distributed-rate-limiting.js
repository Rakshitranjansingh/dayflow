window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "rate-limiter",
  num: "09",
  title: "Distributed Rate Limiting with Redis & Lua Scripts",
  category: "NETWORKING",
  icon: "🛑",
  tag: "Redis Lua / Atomicity",
  content: `
    <p>Distributed rate limiters running across multiple API Gateways face <b>Race Conditions</b> if they execute non-atomic GET and INCR operations against Redis.</p>

    <h3>Atomic Rate Limiting with Redis Lua Scripts</h3>
    <p>Redis executes Lua scripts <b>atomically in a single thread</b>, ensuring no concurrent gateway worker can read stale counter values between checks.</p>
    <div class="code-block">
-- Lua Script for Sliding Window Counter
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = tonumber(redis.call('get', key) or "0")
if current + 1 > limit then
    return 0 -- Rejected (HTTP 429)
else
    redis.call("INCRBY", key, 1)
    return 1 -- Allowed
end
    </div>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Race Conditions in Distributed Counters:</b> Executing <code>val = redis.get(); if (val < limit) redis.incr()</code> across 100 API gateway workers causes race conditions where multiple workers read the same stale value and breach the limit.</li>
      <li><b>Redis Lua Script Atomicity:</b> Redis guarantees atomic execution of Lua scripts. No other command can run while a Lua script executes.</li>
      <li><b>Sliding Window Counter Approximation Formula:</b> $\text{Count} = \text{Current Window Count} + (\text{Previous Window Count} \times \text{Remaining Ratio of Previous Window})$. Uses minimal RAM while preventing boundary spikes.</li>
      <li><b>Local In-Memory Bucket vs Centralized Redis:</b> For ultra-high traffic (100k QPS), querying Redis on every request creates a bottleneck. Combine local L1 in-memory token buckets with L2 async Redis syncing.</li>
      <li><b>Client Identification Strategy:</b> Rate limit based on <code>User ID</code> for authenticated users, <code>API Key</code> for B2B integrations, and <code>IP Address + JA3 TLS Fingerprint</code> for unauthenticated endpoints.</li>
      <li><b>HTTP 429 Retry-After Headers:</b> Always return standard response headers: <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code>, and <code>Retry-After: seconds</code>.</li>
      <li><b>System-Wide Load Shedding:</b> When CPU usage of backend services hits 90%, API Gateways should switch from user-level rate limiting to global Adaptive Load Shedding (dropping low-tier requests instantly).</li>
      <li><b>Redis Cluster Key Sharding ({hash_tag}):</b> Ensure Redis Keys used in Lua scripts map to the same Redis cluster slot by wrapping the core identifier in curly braces e.g. <code>rate_limit:{user_123}</code>.</li>
      <li><b>Soft vs Hard Rate Limits:</b> Soft limits alert billing/ops teams when thresholds are approached. Hard limits return HTTP 429 errors.</li>
      <li><b>Graceful Fallback on Redis Outage:</b> If the central Redis rate limiter cluster goes down, the API Gateway should **fail open** (allow requests with local rate limits) rather than failing closed and crashing the entire platform.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "Why MUST distributed rate limiters use Redis Lua scripts or atomic transactions rather than multi-step GET and INCR commands?",
      opts: [
        "Lua scripts compress the payload size",
        "Separate GET and INCR commands create race conditions between parallel gateway workers, allowing clients to breach rate limits",
        "Redis forbids GET commands on strings",
        "Lua scripts run on client GPUs"
      ],
      correct: 1,
      explain: "Non-atomic GET and INCR operations allow concurrent gateway instances to read the same old counter value simultaneously, causing the rate limiter to permit more requests than allowed."
    },
    {
      q: "What should an API Gateway's rate limiter do if the centralized Redis cluster suddenly becomes unreachable?",
      opts: [
        "Fail open (allow traffic via local in-memory fallback rate limits) to prevent bringing down the entire platform",
        "Fail closed and block 100% of user traffic worldwide",
        "Delete all database rows",
        "Reboot the gateway cluster every 10 seconds"
      ],
      correct: 0,
      explain: "In high-availability design, infrastructure rate limiters should fail open during database/cache outages so business services remain accessible."
    },
    {
      q: "How does the Sliding Window Counter algorithm estimate request count without storing full request timestamp logs in RAM?",
      opts: [
        "By averaging numbers between 1 and 100",
        "By weighting the previous window count based on remaining time percentage and adding the current window count",
        "By using machine learning prediction",
        "By counting network packets at L2 layer"
      ],
      correct: 1,
      explain: "The Sliding Window Counter uses current count + (previous count * remaining ratio), providing accurate rate estimation with negligible memory overhead."
    },
    {
      q: "[SCENARIO] Twitter's public API limits third-party bots to 900 requests per 15-minute window. At 12:14:59 PM, a bot sends 900 requests, and at 12:15:01 PM sends another 900 requests under a Fixed Window counter. Why does the API server crash?",
      opts: [
        "Fixed Window counters allow 2x burst traffic (1,800 requests) right at the window boundary in 2 seconds",
        "The bot used HTTP/3",
        "Fixed Window counters encrypt keys",
        "Twitter ran out of disk space"
      ],
      correct: 0,
      explain: "Fixed Window counters reset at fixed intervals. A client can send max quota at the end of window 1 and another max quota at the start of window 2, doubling rate capacity at the boundary."
    },
    {
      q: "[SCENARIO] You are designing Shopify's Rate Limiter handling 500,000 requests/sec. Querying Redis on every single request is causing high network latency. What architectural upgrade solves this?",
      opts: [
        "Implement a two-tier rate limiter: L1 in-memory local token bucket inside the gateway process for high-speed checks, backed by async batch sync to L2 Redis",
        "Disable rate limiting completely",
        "Use mechanical hard drives for caching",
        "Require users to enter CAPTCHAs on every click"
      ],
      correct: 0,
      explain: "A two-tier architecture performs 99% of checks locally in RAM at microsecond speed, periodically synchronizing token consumption in batches to Redis."
    }
  ]
});
