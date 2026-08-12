window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "osi-model",
  num: "01",
  title: "Network Protocols: HTTP/3 (QUIC), gRPC & TLS 1.3",
  category: "FOUNDATIONS",
  icon: "🌐",
  tag: "HTTP/3 / QUIC / gRPC",
  content: `
    <p>Protocol selection is the foundation of modern network architecture. Your choice of transport protocol directly dictates end-to-end latency, connection survival during mobile network handoffs, and serialization efficiency across microservices.</p>
    
    <h3>HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC)</h3>
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr><th>Protocol</th><th>Transport</th><th>Multiplexing</th><th>Head-of-Line (HoL) Blocking</th><th>Handshake Latency</th></tr></thead>
        <tbody>
          <tr><td><b>HTTP/1.1</b></td><td>TCP</td><td>No (Sequential per connection)</td><td>Connection-level HoL blocking</td><td>2-3 RTT (TCP + TLS 1.2)</td></tr>
          <tr><td><b>HTTP/2</b></td><td>TCP</td><td>Yes (Binary Frames on 1 TCP stream)</td><td><b>TCP Stream HoL Blocking</b> (1 lost packet stalls all streams)</td><td>1-2 RTT (TCP + TLS 1.3)</td></tr>
          <tr><td><b>HTTP/3</b></td><td><b>UDP (QUIC)</b></td><td>Yes (Independent UDP Streams)</td><td><b>Eliminated</b> (Packet loss affects only that stream)</td><td><b>0-1 RTT</b> (Combined QUIC + TLS 1.3)</td></tr>
        </tbody>
      </table>
    </div>

    <h3>gRPC / Protocol Buffers vs REST / JSON</h3>
    <p>gRPC leverages HTTP/2 multiplexing and Protobuf binary serialization. It reduces payload sizes by up to <b>60-80%</b> and eliminates CPU-heavy JSON string parsing overhead, making it the industry standard for internal microservice-to-microservice RPCs.</p>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>TCP HoL Blocking in HTTP/2:</b> On lossy mobile networks (2% packet loss), HTTP/2 performs worse than HTTP/1.1 because one lost TCP packet blocks ALL multiplexed streams on that connection.</li>
      <li><b>HTTP/3 (QUIC) Stream Independence:</b> QUIC moves stream management to UDP. A dropped packet on Stream A does NOT stall Stream B or C.</li>
      <li><b>Connection Migration in QUIC:</b> QUIC uses a 64-bit <code>Connection ID</code> instead of 4-tuple IP/Port. When a user switches from WiFi to 5G, the QUIC connection survives without re-handshaking.</li>
      <li><b>TLS 1.3 0-RTT Replay Attack Risk:</b> 0-RTT early data allows clients to send data in the first packet, but is vulnerable to replay attacks. Only idempotent GET requests should use 0-RTT.</li>
      <li><b>Protobuf Field Numbers:</b> In Protobuf, field tags (e.g. <code>string name = 1;</code>) define binary layout. Never change a field number once deployed in production.</li>
      <li><b>gRPC-Web Translation:</b> Browsers cannot generate arbitrary HTTP/2 binary frames directly via JS. An API Gateway (Envoy) must transcode gRPC-Web to standard gRPC.</li>
      <li><b>WebSocket Load Balancing Challenge:</b> WebSockets maintain long-lived stateful TCP connections. Standard L4 round-robin load balancing leads to server connection imbalance during traffic spikes. Use L7 connection draining and rebalancing.</li>
      <li><b>WebRTC NAT Traversal:</b> Direct P2P WebRTC connection establishment requires <b>STUN</b> (discovering public IP) and <b>TURN</b> (relay server when symmetric NAT blocks direct P2P).</li>
      <li><b>Socket Memory Tuning:</b> At 10 Million concurrent TCP sockets, operating system kernel memory overhead per socket matters. Tune <code>net.ipv4.tcp_rmem</code> and <code>net.ipv4.tcp_wmem</code> to prevent OOM.</li>
      <li><b>Brotli vs Gzip Compression:</b> Brotli achieves 15-20% higher static asset compression ratio than Gzip at compression level 11. Use Brotli for static assets and Gzip/Snappy for high-speed dynamic API responses.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "Why does HTTP/3 (over QUIC/UDP) outperform HTTP/2 on lossy mobile networks with packet drops?",
      opts: [
        "HTTP/3 encrypts IP headers using RSA 4096-bit keys",
        "HTTP/3 eliminates TCP Stream Head-of-Line blocking because UDP streams are independent",
        "HTTP/3 replaces JSON with XML data compression",
        "HTTP/3 operates without IP routing"
      ],
      correct: 1,
      explain: "In HTTP/2 over a single TCP connection, a single dropped packet stalls ALL multiplexed streams until TCP retransmits. HTTP/3 over QUIC/UDP handles packet loss per stream independently."
    },
    {
      q: "What security vulnerability must architects mitigate when enabling 0-RTT Connection Resumption in TLS 1.3?",
      opts: [
        "Buffer overflow in RAM",
        "Replay Attacks where an attacker intercepts and re-transmits early data packets",
        "DNS spoofing",
        "SQL injection"
      ],
      correct: 1,
      explain: "TLS 1.3 0-RTT allows early data to be sent before the server handshake completes, making early non-idempotent requests (like POST /payments) vulnerable to replay attacks."
    },
    {
      q: "How does QUIC maintain persistent connections when a mobile user transitions from a WiFi network to Cellular 5G?",
      opts: [
        "By issuing a new IPv6 address",
        "By identifying connections via a unique 64-bit Connection ID rather than the IP/Port 4-tuple",
        "By restarting the device",
        "By forcing DNS flush"
      ],
      correct: 1,
      explain: "Unlike TCP (which identifies connections by IP:Port 4-tuple), QUIC uses an explicit Connection ID, allowing seamless connection survival across network interface switches."
    },
    {
      q: "[SCENARIO] You are designing Instagram's video feed architecture. Mobile users in emerging markets experience video buffering spikes whenever switching from home WiFi to 4G towers. How should you redesign the transport layer?",
      opts: [
        "Migrate video transport to HTTP/3 over QUIC to leverage 0-RTT and Connection ID survival across network switches",
        "Increase TCP window size to 1GB",
        "Switch all video feeds to synchronous HTTP REST JSON payloads",
        "Use FTP for video segment downloads"
      ],
      correct: 0,
      explain: "HTTP/3 over QUIC provides connection migration (surviving WiFi->4G switches without resetting connections) and eliminates stream HoL blocking for video chunks."
    },
    {
      q: "[SCENARIO] Your team is building a microservice fleet processing 500,000 internal RPCs/sec. JSON serialization is consuming 35% of total CPU across 10,000 servers. What is the optimal architectural change?",
      opts: [
        "Migrate internal microservice communication to gRPC with Protocol Buffers to eliminate JSON parsing overhead",
        "Switch all databases from PostgreSQL to MySQL",
        "Encrypt all JSON strings with AES-256",
        "Replace HTTP with SMTP email queues"
      ],
      correct: 0,
      explain: "gRPC uses binary Protocol Buffers which parse up to 6x faster than JSON text strings and reduce network payload size by 60-80%, saving massive CPU infrastructure costs."
    }
  ]
});
