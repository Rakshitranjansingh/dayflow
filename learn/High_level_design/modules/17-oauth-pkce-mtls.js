window.hldModulesData = window.hldModulesData || [];
window.hldModulesData.push({
  id: "security-cryptography",
  num: "17",
  title: "OAuth 2.0 PKCE, mTLS & JWT Revocation",
  category: "SECURITY",
  icon: "🔐",
  tag: "PKCE / mTLS / JWT Revocation",
  content: `
    <p>Modern security architecture enforces <b>Zero-Trust Networks</b> using mTLS (Mutual TLS) between microservices and <b>PKCE (Proof Key for Code Exchange)</b> for client authentication.</p>

    <h3>OAuth 2.0 PKCE (Proof Key for Code Exchange)</h3>
    <p>Standard OAuth 2.0 authorization code flow on Mobile Apps/Single Page Apps (SPAs) is vulnerable to authorization code interception. PKCE generates a dynamic <b>Code Verifier</b> and hashed <b>Code Challenge</b> to cryptographically verify token exchanges without client secrets.</p>

    <h3>📌 10 Important Architectural Points to Note</h3>
    <ol class="architect-points">
      <li><b>Public vs Confidential OAuth Clients:</b> Backend servers are Confidential (can hide client secrets). SPAs and Mobile Apps are Public (cannot hide secrets, requiring PKCE).</li>
      <li><b>PKCE Code Challenge Math:</b> Client generates random <code>code_verifier</code>, hashes it via SHA-256 to create <code>code_challenge</code>, and sends challenge during initial <code>/authorize</code> call.</li>
      <li><b>Mutual TLS (mTLS) Zero-Trust:</b> Both client and server present X.509 digital certificates during TLS handshake, verifying identity at the transport layer for all internal microservices.</li>
      <li><b>JWT Signature Verification Cost:</b> Verifying RSA 2048-bit asymmetric JWT signatures requires high CPU. Use HMAC-SHA256 symmetric keys internally or cache public JWKS keys.</li>
      <li><b>State Parameter (CSRF Prevention):</b> Always pass a cryptographically random <code>state</code> parameter during OAuth authorization requests to prevent Cross-Site Request Forgery.</li>
      <li><b>JWT Invalidation Options:</b> Standard JWTs cannot be revoked remotely before expiration. Use short-lived Access JWTs (5-15 mins) paired with revocable Refresh Tokens in Redis.</li>
      <li><b>JWT "alg: none" Vulnerability:</b> Security libraries MUST explicitly reject incoming JWT tokens configured with header <code>"alg": "none"</code> or mismatched HMAC/RSA algorithms.</li>
      <li><b>OAuth 2.0 Token Introspection (RFC 7662):</b> Resource servers query the Auth Server <code>/introspect</code> endpoint to validate reference tokens (opaque tokens) in real time.</li>
      <li><b>API Key Hashing in Storage:</b> Never store API Keys in plain text in database tables. Hash them with SHA-256 (or bcrypt) just like passwords.</li>
      <li><b>Secrets Management (Vault / AWS Secrets Manager):</b> Microservice pods should fetch database passwords and private keys at runtime from HashiCorp Vault with dynamic rotation.</li>
    </ol>
  `,
  quizzes: [
    {
      q: "Why is PKCE (Proof Key for Code Exchange) required for OAuth 2.0 in Single Page Apps (SPAs) and Mobile Apps?",
      opts: [
        "Public clients (SPAs/Mobile) cannot securely store a static Client Secret, leaving Authorization Codes vulnerable to interception",
        "PKCE speeds up TLS handshakes",
        "PKCE replaces JSON with Protobuf",
        "PKCE eliminates HTTP cookies"
      ],
      correct: 0,
      explain: "Mobile apps and SPAs are public clients that cannot hide client secrets. PKCE dynamically creates secret verifiers per request, rendering intercepted authorization codes useless."
    },
    {
      q: "What security guarantee does Mutual TLS (mTLS) provide in microservice architectures?",
      opts: [
        "It cryptographically authenticates BOTH the calling client and destination service via X.509 digital certificates",
        "It speeds up SQL queries",
        "It eliminates the need for DNS",
        "It formats JSON logs"
      ],
      correct: 0,
      explain: "Standard TLS only authenticates the server. mTLS forces both caller and receiver to present digital certificates, establishing zero-trust service-to-service security."
    },
    {
      q: "How should an enterprise architecture handle immediate revocation of stolen JWT access tokens before their TTL expires?",
      opts: [
        "Store revoked token IDs (JTI) in a centralized Redis Bloom Filter / Blacklist, or use short 5-minute JWT TTLs with Refresh Token rotation",
        "Reboot the authorization server",
        "Ask the hacker to return the token",
        "Delete the user database"
      ],
      correct: 0,
      explain: "Because JWTs are stateless, immediate revocation requires checking a lightweight Redis blacklist of revoked `jti` claim IDs or enforcing short 5-minute access token expirations."
    },
    {
      q: "[SCENARIO] A hacker decompiles an Android APK, extracts the embedded hardcoded 'client_secret', and uses it to hijack OAuth 2.0 user tokens. What architectural mistake was made?",
      opts: [
        "Hardcoding a Client Secret in a public client (mobile app) instead of using the OAuth 2.0 PKCE flow",
        "Using HTTPS instead of HTTP",
        "Using 64-bit CPUs",
        "Storing data in MySQL"
      ],
      correct: 0,
      explain: "Mobile apps are public clients; secrets can easily be extracted via reverse engineering. OAuth 2.0 PKCE must be used for public clients without static client secrets."
    },
    {
      q: "[SCENARIO] An attacker sends a forged JWT payload to an API endpoint with header '\"alg\": \"none\"'. The vulnerable API server accepts the token without verifying signature and grants admin access. How do you patch this?",
      opts: [
        "Configure the JWT validation library to explicitly require expected signing algorithms (e.g. RS256) and reject tokens with 'alg: none'",
        "Disable all authentication",
        "Re-deploy the server on Windows",
        "Increase CPU RAM"
      ],
      correct: 0,
      explain: "The infamous 'alg: none' flaw allows unsigned tokens if the server blindly trusts the token header's specified algorithm. Enforce whitelist validation of algorithm types."
    }
  ]
});
