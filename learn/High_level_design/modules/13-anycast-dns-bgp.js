window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "proxies-load-balancers",
  num: "13",
  title: "Global Traffic Routing: Anycast DNS & BGP Routing",
  category: "NETWORKING",
  icon: "🔀",
  tag: "Anycast DNS / BGP",
  content: `
    <p>Global platforms (Cloudflare, AWS Route 53) route user traffic to the nearest Data Center using <b>Anycast DNS</b> and <b>BGP (Border Gateway Protocol)</b>.</p>

    <h3>Unicast vs Anycast IP Routing</h3>
    <ul>
      <li><b>Unicast:</b> One IP address maps to exactly ONE specific server location in the world.</li>
      <li><b>Anycast:</b> Multiple servers globally announce the <b>EXACT SAME IP address</b> using BGP. Network routers automatically direct packets to the geographically nearest server hop!</li>
    </ul>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>BGP Path Selection:</b> Border Gateway Protocol (BGP) routes Anycast traffic along the shortest Autonomous System (AS) path across ISP backbones.</li>
      <li><b>DDoS Mitigation via Anycast:</b> Anycast naturally dilutes volumetric DDoS attacks by absorbing attack traffic across dozens of global Edge POPs simultaneously.</li>
      <li><b>Geo-DNS Latency Fallbacks:</b> Geo-DNS resolves domain names based on client resolver IP address, but can route incorrectly if clients use remote DNS (e.g. 8.8.8.8). Use EDNS Client Subnet (ECS) extension.</li>
      <li><b>L4 Maglev Load Balancing (Google):</b> Google Maglev uses Consistent Hashing + Connection Tracking to distribute packets evenly across backend fleets without state synchronization.</li>
      <li><b>eBPF / XDP High-Performance Routing:</b> Modern Layer 4 load balancers use eBPF (Extended Berkeley Packet Filter) and XDP to process packets directly inside the NIC driver kernel before Linux memory stack allocation.</li>
      <li><b>TLS SNI (Server Name Indication):</b> Allows multiple SSL/TLS certificates to be hosted on a single IP address by sending the target hostname in the TLS ClientHello packet.</li>
      <li><b>Connection Draining (Graceful Deregistration):</b> When removing a server instance, stop routing new connections while maintaining existing TCP streams for a grace period (e.g. 300s).</li>
      <li><b>Session Affinity / Sticky Sessions Risk:</b> Sticky sessions bind users to a specific server using cookies. Avoid sticky sessions for stateless microservices as they break autoscaling.</li>
      <li><b>DNS TTL Trade-off:</b> Short DNS TTLs (e.g. 60s) enable fast failovers, but increase DNS resolver lookup load. Long TTLs (e.g. 86400s) cache heavily but delay failovers.</li>
      <li><b>Global Traffic Management (GTM):</b> Uses real-time synthetic health probes from worldwide locations to dynamically alter DNS responses during region outages.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "How does Anycast IP routing direct users to the closest Data Center globally?",
      opts: [
        "By asking users to manually type their IP",
        "Multiple global Data Centers announce the same IP address via BGP, and Internet routers route packets to the topologically closest node",
        "By converting IPv4 to MAC addresses",
        "By forcing all traffic through Virginia"
      ],
      correct: 1,
      explain: "With Anycast, multiple data centers share the same IP. BGP routing tables direct client packets along the shortest network path to the nearest data center."
    },
    {
      q: "Why is eBPF/XDP used in high-performance Layer 4 load balancing (such as Facebook Katran)?",
      opts: [
        "It processes incoming packets directly inside the network driver kernel layer before allocating OS network buffers",
        "It encrypts user passwords",
        "It replaces DNS servers",
        "It runs on client web browsers"
      ],
      correct: 0,
      explain: "eBPF/XDP executes packet filtering logic right inside the kernel network driver, delivering ultra-high 100Gbps packet processing speeds."
    },
    {
      q: "What DNS extension solves the issue where Geo-DNS misroutes users who query through public resolvers like Google DNS (8.8.8.8)?",
      opts: [
        "EDNS Client Subnet (ECS)",
        "DNSSEC",
        "CNAME records",
        "A AAA records"
      ],
      correct: 0,
      explain: "EDNS Client Subnet (ECS) passes the client's actual IP subnet to the authoritative DNS server, allowing accurate location-based DNS routing."
    },
    {
      q: "[SCENARIO] Cloudflare experiences a massive 2.5 Terabit/sec volumetric DDoS attack targeting a single IP address. Why doesn't this attack take down Cloudflare's network?",
      opts: [
        "Cloudflare uses Anycast BGP routing, automatically scattering the 2.5 Tbps attack across 300 global edge data centers simultaneously",
        "They unplug the router for 5 minutes",
        "They block all TCP connections globally",
        "They turn off DNS"
      ],
      correct: 0,
      explain: "Anycast BGP announces the same IP globally. Attack traffic is automatically divided and absorbed across hundreds of regional POP data centers."
    },
    {
      q: "[SCENARIO] You are terminating 100 EC2 instances for an autoscaling scale-in event. If you terminate instances immediately, 5,000 active checkout users will see 'Connection Reset by Peer' errors. What configuration must be enabled on your Application Load Balancer?",
      opts: [
        "Enable Connection Draining (Deregistration Delay) to allow existing active requests to complete while blocking new connections",
        "Delete the load balancer",
        "Reboot the AWS region",
        "Send an email to all users"
      ],
      correct: 0,
      explain: "Connection Draining keeps terminating servers in a deregistering state, allowing in-flight requests to complete safely before instance termination."
    }
  ]
});
