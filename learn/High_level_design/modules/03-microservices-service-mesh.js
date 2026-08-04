window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "microservices",
  num: "03",
  title: "Microservices: Service Mesh, Envoy & Circuit Breakers",
  category: "ARCHITECTURE",
  icon: "🧱",
  tag: "Service Mesh / Resilience",
  content: `
    <p>Modern microservice governance decouples networking and security concerns from application code by relying on <b>Service Mesh infrastructure</b> (e.g., Istio + Envoy proxy sidecars).</p>

    <h3>Why Service Mesh over Shared Libraries?</h3>
    <p>Embedding resiliency (retries, rate limiting, mTLS) inside application code causes multi-language maintenance hell. A <b>Sidecar Proxy (Envoy)</b> handles network concerns out-of-process.</p>

    <h3>Resiliency Patterns: Circuit Breaker & Bulkhead</h3>
    <div class="code-block">
Circuit Breaker States:
[CLOSED] (Normal) ---High Failure Rate---> [OPEN] (Fails Fast immediately)
    ^                                        |
    |-------Half-Open Probe Succeeds---------v [HALF-OPEN] (Tests sample requests)
    </div>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Control Plane vs Data Plane:</b> Istiod is the Control Plane (distributes config, certificates, and routing rules). Envoy is the Data Plane (intercepts and proxies actual data packets).</li>
      <li><b>Zero-Trust mTLS:</b> Service Mesh enforces mutual TLS (mTLS) between sidecars automatically, encrypting intra-cluster traffic and validating SPIFFE/SPIRE service identities.</li>
      <li><b>Circuit Breaker Trip Thresholds:</b> Tune circuit breakers based on consecutive 5xx errors or percentile latency spikes (e.g. 50% failure rate over 10s window).</li>
      <li><b>Bulkhead Isolation:</b> Create distinct thread pools for critical vs non-critical dependencies so a hanging recommendation service cannot freeze order placement.</li>
      <li><b>Distributed Tracing Context Propagation:</b> Service mesh auto-injects W3C Trace Context headers (<code>traceparent</code>, <code>tracestate</code>), but application code MUST forward these headers across internal HTTP/gRPC calls.</li>
      <li><b>Sidecar Overhead:</b> Envoy sidecars add ~1-2ms latency overhead and ~30-50MB RAM per pod. Evaluate eBPF (Cilium) ambient mesh for sidecarless networking at scale.</li>
      <li><b>Shared Library Trap:</b> Avoid placing business domain logic into shared common JARs/libraries. Changing a shared library forces re-building and re-testing every microservice.</li>
      <li><b>Canary Traffic Shifting:</b> Envoy enables fine-grained weighted routing (e.g. 95% traffic to v1.0, 5% to v2.0) for zero-downtime canary deployments.</li>
      <li><b>Chaos Fault Injection:</b> Envoy can inject synthetic delay (e.g., add 500ms delay to 10% of requests) or HTTP 503 faults in production to verify service resiliency.</li>
      <li><b>Graceful Shutdown & Draining:</b> On SIGTERM, Envoy sidecars must stop accepting new inbound traffic while allowing existing in-flight requests to complete before pod termination.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "What is the primary role of the Bulkhead Pattern in microservice resilience?",
      opts: [
        "Encrypting payloads using AES 256",
        "Isolating resource pools (threads/connections) so failure in one dependency does not drain resources for others",
        "Compressing JSON logs",
        "Routing DNS traffic"
      ],
      correct: 1,
      explain: "Just like watertight compartments in ships (bulkheads), isolating thread and connection pools ensures a hanging dependency doesn't exhaust all application worker threads."
    },
    {
      q: "Why must application code explicitly forward W3C Trace Context headers (traceparent) when making outbound HTTP calls to other services?",
      opts: [
        "To compress the payload size",
        "Because sidecars intercept network bytes but cannot correlate incoming requests to outgoing calls originated inside app memory",
        "To bypass SSL encryption",
        "To authenticate with MySQL"
      ],
      correct: 1,
      explain: "While proxies capture inbound and outbound bytes, the application process must forward the trace ID header from the incoming request context to the outgoing request call."
    },
    {
      q: "What distinguishes the Data Plane from the Control Plane in a Service Mesh architecture?",
      opts: [
        "Data Plane handles DNS while Control Plane handles CSS",
        "Data Plane (Envoy) proxies actual application network packets; Control Plane (Istiod) manages and pushes configuration rules",
        "Data Plane runs on GPUs while Control Plane runs on CPUs",
        "They are identical"
      ],
      correct: 1,
      explain: "The Data Plane consists of high-performance sidecar proxies (Envoy) forwarding network traffic, while the Control Plane translates high-level config into Envoy rules."
    },
    {
      q: "[SCENARIO] Uber's Payment Service depends on a third-party Fraud Detection API. During peak hours, the Fraud API experiences a 15-second latency delay. As a result, Uber's Payment workers freeze and exhaust all 500 server threads. How do you fix this?",
      opts: [
        "Implement a Circuit Breaker and Bulkhead thread isolation around the Fraud API call to fail fast or fallback when latency spikes",
        "Increase the thread count to 100,000",
        "Reboot the payment database every 5 minutes",
        "Remove all authentication"
      ],
      correct: 0,
      explain: "Combining a Circuit Breaker (fast-failing slow calls) and Bulkhead (capping thread pool size allocated to Fraud API) prevents Fraud latency from exhausting payment server threads."
    },
    {
      q: "[SCENARIO] You are launching a major v2 payment service rewrite at Netflix. You need to test v2 on 2% of live production traffic without risking a full site outage. What Service Mesh feature should you use?",
      opts: [
        "Envoy Weighted Traffic Shifting (Canary Deployment) to split 98% to v1 and 2% to v2 at the sidecar proxy level",
        "Re-deploy the entire cluster and hope for no bugs",
        "Ask users to manually select v2 in browser settings",
        "Run v2 only on local developer laptops"
      ],
      correct: 0,
      explain: "Service Mesh sidecars (Envoy) allow exact percentage-based traffic routing at the network level, enabling safe canary releases with instant rollback capability."
    }
  ]
});
