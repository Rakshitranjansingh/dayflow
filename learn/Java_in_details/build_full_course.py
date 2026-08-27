import json
import re
import os

MODULE_CONFIG = [
    {
        "id": "module01_core_java",
        "file": "module01_core_java.html",
        "title": "Module 01: Core Java & Fundamentals",
        "category": "Core Java & Fundamentals",
        "icon": "☕",
        "desc": "Primitives vs Objects, String internals, memory layout, equals/hashCode contract, immutability, enums, nested classes & reflection."
    },
    {
        "id": "module02_oops_design_patterns",
        "file": "module02_oops_design_patterns.html",
        "title": "Module 02: OOPs & Design Patterns",
        "category": "OOPs & Design Patterns",
        "icon": "📐",
        "desc": "SOLID principles, GoF design patterns (Singleton, Factory, Builder, Strategy, Decorator, Proxy), Encapsulation & Polymorphism."
    },
    {
        "id": "module03_modern_java",
        "file": "module03_modern_java.html",
        "title": "Module 03: Modern Java Features (Java 8 - 21+)",
        "category": "Modern Java Features (Java 8 - 21+)",
        "icon": "🚀",
        "desc": "Lambdas, Streams, Optional, Records, Sealed Classes, Switch Expressions, Pattern Matching & Sequenced Collections."
    },
    {
        "id": "module04_collections",
        "file": "module04_collections.html",
        "title": "Module 04: Collections Framework & Internals",
        "category": "Collections Framework & Internals",
        "icon": "📦",
        "desc": "HashMap internals, Red-Black Trees, ConcurrentHashMap, ArrayList capacity growth, PriorityQueue heap & Fail-fast vs Fail-safe."
    },
    {
        "id": "module05_generics",
        "file": "module05_generics.html",
        "title": "Module 05: Generics & Type System",
        "category": "Generics & Type System",
        "icon": "🧬",
        "desc": "PECS principle (? extends T vs ? super T), Type Erasure, Bridge Methods, Bounded Type Parameters & Wildcards."
    },
    {
        "id": "module06_exceptions_io",
        "file": "module06_exceptions_io.html",
        "title": "Module 06: Exception Handling & I/O / NIO",
        "category": "Exception Handling & I/O / NIO",
        "icon": "🛡️",
        "desc": "AutoCloseable, Try-With-Resources, Checked vs Unchecked exceptions, Channels, Buffers, Selectors & NIO.2 Files API."
    },
    {
        "id": "module07_multithreading",
        "file": "module07_multithreading.html",
        "title": "Module 07: Multithreading & Java Concurrency",
        "category": "Multithreading & Java Concurrency",
        "icon": "⚡",
        "desc": "Synchronized, Volatile, JMM happens-before rules, CAS lock-free atomic variables, ReentrantLock, CountDownLatch & Executors."
    },
    {
        "id": "module08_virtual_threads",
        "file": "module08_virtual_threads.html",
        "title": "Module 08: Virtual Threads & Concurrency",
        "category": "Virtual Threads & Concurrency",
        "icon": "🧵",
        "desc": "Project Loom, Carrier threads, Unmounting vs Pinning, ThreadLocal leakage risks, ScopedValue & StructuredTaskScope."
    },
    {
        "id": "module09_jvm_performance",
        "file": "module09_jvm_performance.html",
        "title": "Module 09: JVM Architecture & Memory Tuning",
        "category": "JVM Architecture & Memory Tuning",
        "icon": "⚙️",
        "desc": "Metaspace, Classloaders, JIT C1/C2 compilers, Escape Analysis, G1 GC, ZGC, Shenandoah, Memory Leaks, JFR & Heap Dumps."
    },
    {
        "id": "module10_spring_core",
        "file": "module10_spring_core.html",
        "title": "Module 10: Spring Boot & Spring Framework",
        "category": "Spring Boot & Spring Framework",
        "icon": "🌱",
        "desc": "Spring IoC container, Bean lifecycle hooks, BeanPostProcessor, AOP dynamic proxies (JDK vs CGLIB) & @Transactional propagation."
    },
    {
        "id": "module11_spring_jpa",
        "file": "module11_spring_jpa.html",
        "title": "Module 11: Spring Data JPA & Hibernate ORM",
        "category": "Spring Data JPA & Hibernate ORM",
        "icon": "🗄️",
        "desc": "Entity Lifecycle states, N+1 Select problem, JOIN FETCH, EntityGraph, L1/L2 Cache, Optimistic vs Pessimistic locking & HikariCP pool."
    },
    {
        "id": "module12_spring_security",
        "file": "module12_spring_security.html",
        "title": "Module 12: Spring Security & Web Security",
        "category": "Spring Security & Web Security",
        "icon": "🔒",
        "desc": "SecurityFilterChain, OAuth2 PKCE authorization flows, JWT generation & validation, CSRF, BCrypt & OWASP Top 10 mitigations."
    },
    {
        "id": "module13_webflux_apis",
        "file": "module13_webflux_apis.html",
        "title": "Module 13: REST APIs, WebFlux & Microservices",
        "category": "REST APIs, WebFlux & Microservices",
        "icon": "🌐",
        "desc": "DispatcherServlet lifecycle, Spring WebFlux Reactor Mono/Flux, Backpressure, GraphQL schema mapping & gRPC Protobuf streaming."
    },
    {
        "id": "module14_distributed_systems",
        "file": "module14_distributed_systems.html",
        "title": "Module 14: Distributed Systems & Event-Driven Architecture",
        "category": "Distributed Systems & Event-Driven Architecture",
        "icon": "🛰️",
        "desc": "Kafka Partitions/Offsets, Consumer Groups, Redis Data Structures & Pub/Sub, Resilience4j Circuit Breaker, Saga & Outbox patterns."
    },
    {
        "id": "module15_testing_cloud",
        "file": "module15_testing_cloud.html",
        "title": "Module 15: Testing, Observability & Cloud Native",
        "category": "Testing, Observability & Cloud Native",
        "icon": "📊",
        "desc": "JUnit 5, Mockito, Testcontainers, ArchUnit, Micrometer metrics, Prometheus, Grafana, Docker containerization & AWS Cloud SDK."
    }
]

def determine_category_and_difficulty(index, topic):
    t = topic.lower()
    
    if any(k in t for k in ['virtual thread', 'project loom', 'carrier thread', 'pinning', 'tracepinnedthreads', 'scopedvalue', 'scoped value', 'structuredtaskscope', 'structured concurrency']):
        cat = "Virtual Threads & Concurrency"
        diff = "Hard"
    elif any(k in t for k in ['jvm', 'metaspace', 'class loader', 'classloader', 'class loading', 'jit compiler', 'tiered compilation', 'c1/c2', 'tlab', 'escape analysis', 'garbage collection', 'gc algorithm', 'g1 gc', 'zgc', 'shenandoah', 'outofmemoryerror', 'memory leak', 'soft, weak', 'off-heap', 'directbytebuffer', 'jvisualvm', 'jconsole', 'flight recorder', 'jfr', 'jstack', 'eclipse mat', 'graalvm', 'appcds']):
        cat = "JVM Architecture & Memory Tuning"
        diff = "Hard"
    elif any(k in t for k in ['security', 'authentication', 'authorization', 'securityfilterchain', 'userdetails', 'jwt', 'oauth2', 'preauthorize', 'csrf', 'cors', 'owasp', 'sql injection', 'xss', 'bcrypt', 'argon2', 'secrets management', 'vault']):
        cat = "Spring Security & Web Security"
        diff = "Hard"
    elif any(k in t for k in ['jpa', 'hibernate', 'entity lifecycle', 'generatedvalue', 'onetoone', 'onetomany', 'manytoone', 'manytomany', 'fetchtype', 'n+1', 'jpql', 'criteria api', 'persistencecontext', 'dirty checking', 'optimistic locking', 'pessimistic locking', 'embeddable', 'auditing', 'open session in view', 'spring data']):
        cat = "Spring Data JPA & Hibernate ORM"
        diff = "Hard"
    elif any(k in t for k in ['spring boot', 'ioc', 'dependency injection', 'beanfactory', 'applicationcontext', 'bean lifecycle', 'bean scope', 'autowired', 'qualifier', 'circular dependenc', 'stereotype', '@configuration', 'conditional', 'propertysource', 'spring event', 'aspect', 'pointcut', 'join point', 'proxy types', 'self-invocation', 'transactional', 'propagation', 'isolation level', 'auto-configuration', 'starter', 'actuator', 'devtools', 'logback', 'slf4j', 'fat jar']):
        cat = "Spring Boot & Spring Framework"
        diff = "Medium"
    elif any(k in t for k in ['dispatcherservlet', '@controller', '@restcontroller', 'httpmessageconverter', '@valid', 'controlleradvice', 'interceptor', 'content negotiation', 'reactive stream', 'project reactor', 'mono', 'flux', 'webflux', 'functional endpoint', 'restful', 'richardson', 'hateoas', 'api versioning', 'openapi', 'swagger', 'graphql', 'grpc', 'protobuf']):
        cat = "REST APIs, WebFlux & Microservices"
        diff = "Medium"
    elif any(k in t for k in ['monolith vs microservices', 'service discovery', 'eureka', 'api gateway', 'spring cloud', 'circuit breaker', 'resilience4j', 'distributed tracing', 'jaeger', 'zipkin', 'openfeign', 'service mesh', 'istio', 'saga', 'cqrs', 'distributed transaction', 'kafka', 'producer', 'consumer', 'schema registry', 'dead letter', 'rabbitmq', 'amqp', 'cap theorem', 'pacelc', 'sharding', 'consistent hashing', 'cdn', 'rate limiter', 'key-value store', 'bloom filter', 'skip list']):
        cat = "Distributed Systems & Event-Driven Architecture"
        diff = "Hard"
    elif any(k in t for k in ['junit', 'mockito', 'springboottest', 'testcontainers', 'mockmvc', 'contract testing', 'pact', 'mutation testing', 'pit', 'assertj', 'wiremock', 'docker', 'dockerfile', 'kubernetes', 'k8s', 'canary']):
        cat = "Testing, Observability & Cloud Native"
        diff = "Medium"
    elif any(k in t for k in ['process vs thread', 'thread lifecycle', 'runnable vs callable', 'synchronized', 'wait, notify', 'thread interruption', 'daemon thread', 'thread.sleep', 'happens-before', 'volatile', 'race condition', 'double-checked locking', 'reentrantlock', 'readwritelock', 'countdownlatch', 'cyclicbarrier', 'semaphore', 'atomic', 'cas', 'aba problem', 'threadlocal', 'executorservice', 'thread pool', 'scheduledexecutor', 'completablefuture', 'forkjoinpool', 'parallel stream', 'deadlock', 'livelock']):
        cat = "Multithreading & Java Concurrency"
        diff = "Hard"
    elif any(k in t for k in ['exception', 'try-with-resources', 'autocloseable', 'multi-catch', 'custom exception', 'suppressed exception', 'stacktraceelement', 'inputstream', 'outputstream', 'reader', 'writer', 'buffered stream', 'channel', 'buffer', 'selector', 'nio', 'asynchronous i/o']):
        cat = "Exception Handling & I/O / NIO"
        diff = "Medium"
    elif any(k in t for k in ['lambda', 'functional interface', 'stream api', 'collector', 'optional', 'date/time api', 'java 8', 'java 9', 'java 10', 'java 11', 'java 14', 'java 15', 'java 16', 'java 17', 'java 21', 'java 22', 'record', 'sealed', 'pattern matching', 'text block', 'switch expression', 'sequenced collection', 'string template', 'unnamed pattern', 'higher-order function', 'pure function', 'currying', 'monadic', 'var (local variable', 'local-variable type inference']):
        cat = "Modern Java Features (Java 8 - 21+)"
        diff = "Medium"
    elif any(k in t for k in ['generic', 'generics', 'covariance', 'contravariance', 'type erasure', 'bounded type', 'wildcard', 'pecs', 'type inference', 'bridge method']):
        cat = "Generics & Type System"
        diff = "Hard"
    elif any(k in t for k in ['arraylist', 'linkedlist', 'copyonwritearraylist', 'hashset', 'linkedhashset', 'treeset', 'enumset', 'priorityqueue', 'arraydeque', 'blockingqueue', 'immutable collection', 'hashmap', 'linkedhashmap', 'treemap', 'weakhashmap', 'identityhashmap', 'enummap', 'concurrenthashmap', 'hashtable', 'fail-fast', 'collections utility', 'arrays utility', 'navigableset', 'navigablemap']):
        cat = "Collections Framework & Internals"
        diff = "Medium"
    elif any(k in t for k in ['srp', 'ocp', 'lsp', 'isp', 'dip', 'solid', 'cohesion', 'dry, kiss', 'singleton', 'factory', 'builder', 'prototype', 'object pool', 'adapter', 'decorator', 'facade', 'flyweight', 'proxy', 'strategy', 'observer', 'command', 'template method', 'chain of responsibility', 'state', 'mediator', 'memento', 'visitor', 'interpreter', 'hexagonal', 'clean architecture', 'domain-driven', 'encapsulation', 'inheritance', 'polymorphism', 'abstraction', 'binding', 'overriding', 'overloading', 'covariant', 'diamond problem']):
        cat = "OOPs & Design Patterns"
        diff = "Medium"
    else:
        cat = "Core Java & Fundamentals"
        diff = "Easy" if index < 50 else "Medium"
        
    return cat, diff

def generate_comparison_table(topic):
    t_lower = topic.lower()
    if not (" vs" in t_lower or "versus" in t_lower or "difference between" in t_lower or "compared to" in t_lower or "or " in t_lower):
        return None

    if "primitives vs objects" in t_lower or ("primitive" in t_lower and "object" in t_lower):
        return {
            "type": "table",
            "headers": ["Feature / Aspect", "Primitives (e.g. int)", "Reference Objects (e.g. Integer)"],
            "rows": [
                ["Memory Storage", "Direct value on Stack / Object Layout", "Reference Pointer to Heap Object"],
                ["Memory Overhead", "1 to 8 Bytes (No Header)", "12-16 Byte Object Header + Padding + Data"],
                ["Default Value", "0, false, 0.0", "null"],
                ["Generics Support", "Not supported directly (requires wrapper)", "Fully supported (e.g. List<Integer>)"],
                ["Performance", "Ultra-fast, CPU register friendly", "Requires dereferencing; triggers GC"]
            ]
        }
    elif "pass-by-value" in t_lower:
        return {
            "type": "table",
            "headers": ["Parameter Type", "What is Passed to Method", "Effect of Modification Inside Method"],
            "rows": [
                ["Primitive Variable (e.g. int x)", "A copy of the literal bits value", "Changes stay local inside method stack frame; original variable unchanged"],
                ["Object Reference (e.g. Person p)", "A copy of the 64-bit reference address pointer", "Mutating fields modifies original object on Heap; reassigning reference pointer does not affect caller"]
            ]
        }
    elif "stringbuilder vs stringbuffer" in t_lower or ("stringbuilder" in t_lower and "stringbuffer" in t_lower):
        return {
            "type": "table",
            "headers": ["Feature", "StringBuilder", "StringBuffer", "String"],
            "rows": [
                ["Mutability", "Mutable", "Mutable", "Immutable"],
                ["Thread Safety", "Not Thread-Safe (Unsynchronized)", "Thread-Safe (Synchronized Methods)", "Thread-Safe (Read-Only)"],
                ["Performance", "Fastest for string modification", "Slower due to lock overhead", "Slowest for loops (creates new objects)"],
                ["Introduced In", "Java 1.5", "Java 1.0", "Java 1.0"]
            ]
        }
    elif "arraylist vs linkedlist" in t_lower:
        return {
            "type": "table",
            "headers": ["Operation / Feature", "ArrayList", "LinkedList"],
            "rows": [
                ["Internal Structure", "Resizable Dynamic Array", "Doubly-Linked List"],
                ["Random Access get(i)", "O(1) - Fast direct memory access", "O(n) - Must traverse node by node"],
                ["Add/Remove at End", "O(1) amortized", "O(1)"],
                ["Add/Remove at Middle", "O(n) - Requires array element shifting", "O(1) once node position is reached"],
                ["Memory Overhead", "Low (only array capacity)", "High (24-byte Node object per element)"],
                ["Cache Locality", "Excellent CPU L1/L2 cache locality", "Poor cache locality (fragmented memory)"]
            ]
        }
    elif "hashmap vs concurrenthashmap" in t_lower:
        return {
            "type": "table",
            "headers": ["Feature", "HashMap", "ConcurrentHashMap", "Hashtable"],
            "rows": [
                ["Thread Safety", "Not Thread-Safe", "Thread-Safe (Bucket Locking + CAS)", "Thread-Safe (Global Method Lock)"],
                ["Null Keys / Values", "Allows 1 null key & multiple null values", "No null keys or null values allowed", "No null keys or null values"],
                ["Concurrency Level", "Single thread only", "High (Lock-free reads, bucket writes)", "Low (Single bottleneck lock)"],
                ["Iteration Strategy", "Fail-fast iterator", "Weakly consistent (Fail-safe) iterator", "Fail-fast iterator"]
            ]
        }
    elif "synchronized vs reentrantlock" in t_lower:
        return {
            "type": "table",
            "headers": ["Feature", "synchronized (Intrinsic Lock)", "ReentrantLock (java.util.concurrent)"],
            "rows": [
                ["Lock Acquisition", "Implicit (Compiler/JVM managed)", "Explicit (lock() and unlock() in try-finally)"],
                ["Fairness Selection", "Unfair locking only", "Supports Fair and Unfair locking"],
                ["Non-blocking Attempt", "Not supported (blocks forever)", "Supported via tryLock() / tryLock(timeout)"],
                ["Interruptibility", "Cannot interrupt thread waiting for lock", "Supported via lockInterruptibly()"],
                ["Multiple Conditions", "Single wait/notify queue per object", "Multiple Condition objects per lock"],
                ["Virtual Threads", "Pins virtual thread to carrier OS thread", "Does NOT pin virtual thread (unmounts safely)"]
            ]
        }
    elif "virtual threads vs platform threads" in t_lower or ("virtual thread" in t_lower and "platform thread" in t_lower):
        return {
            "type": "table",
            "headers": ["Property", "Platform Threads (OS Threads)", "Virtual Threads (Project Loom)"],
            "rows": [
                ["Management", "OS Kernel managed (1:1 mapping)", "JVM Runtime managed (M:N mapping onto carrier threads)"],
                ["Memory Footprint", "High (~1 MB stack memory per thread)", "Ultra-low (~a few hundred bytes in Heap)"],
                ["Creation Cost", "Expensive (OS context switch & allocation)", "Cheap (Millions can be spawned in milliseconds)"],
                ["I/O Blocking Behavior", "Blocks underlying OS thread", "Unmounts from OS thread; parks in Heap"],
                ["Pooling Recommendation", "Must pool (ThreadPoolExecutor)", "Never pool (Spawn short-lived threads per task)"]
            ]
        }
    elif "fail-fast vs fail-safe" in t_lower:
        return {
            "type": "table",
            "headers": ["Feature", "Fail-Fast Iterators (e.g. ArrayList)", "Fail-Safe Iterators (e.g. ConcurrentHashMap)"],
            "rows": [
                ["Modification Behavior", "Throws ConcurrentModificationException if collection is modified during iteration", "Operates on internal clone or weak-consistent snapshot without throwing exception"],
                ["modCount Tracking", "Tracks modifications via modCount field", "Does not rely on modCount"],
                ["Memory Overhead", "Zero extra memory overhead", "May create internal array snapshot (e.g. CopyOnWriteArrayList)"]
            ]
        }
    elif "checked vs unchecked" in t_lower:
        return {
            "type": "table",
            "headers": ["Exception Type", "Superclass", "Compiler Enforcement", "Use Case"],
            "rows": [
                ["Checked Exceptions", "java.lang.Exception", "Must be declared in throws clause or handled in try-catch", "Recoverable external failures (e.g. IOException, SQLException)"],
                ["Unchecked Exceptions", "java.lang.RuntimeException", "Not checked at compile-time", "Programmer bugs or logic errors (e.g. NullPointerException, IllegalArgumentException)"]
            ]
        }
    elif "orelse vs orelseget" in t_lower:
        return {
            "type": "table",
            "headers": ["Method", "Evaluation Behavior", "Performance Impact"],
            "rows": [
                ["Optional.orElse(fallback)", "Eagerly evaluates fallback expression regardless of Optional presence", "Invokes fallback method even when value is present (potential wasted processing)"],
                ["Optional.orElseGet(() -> fallback)", "Lazily evaluates Supplier lambda ONLY when Optional is empty", "Zero overhead when Optional contains value"]
            ]
        }
    else:
        parts = re.split(r'\s+vs\.?\s+|\s+versus\s+|\s+or\s+', topic, flags=re.IGNORECASE)
        t1 = parts[0].strip() if len(parts) > 0 else "Concept A"
        t2 = parts[1].strip() if len(parts) > 1 else "Concept B"
        return {
            "type": "table",
            "headers": ["Comparison Aspect", t1, t2],
            "rows": [
                ["Primary Contract", f"Designed specifically for {t1} execution semantics.", f"Designed specifically for {t2} execution semantics."],
                ["Memory Allocation", "Managed on Stack or Heap layout according to type rules.", "Managed on Stack or Heap layout according to type rules."],
                ["Thread Safety Invariants", "Evaluated based on explicit synchronization or lock-free barriers.", "Evaluated based on explicit synchronization or lock-free barriers."],
                ["Recommended Enterprise Usage", f"Optimal choice when requiring {t1} semantics.", f"Optimal choice when requiring {t2} semantics."]
            ]
        }

def generate_relevant_code(topic, category):
    t_lower = topic.lower()

    if "equals" in t_lower and "hashcode" in t_lower:
        return """public class Employee {
    private final Long id;
    private final String email;

    public Employee(Long id, String email) {
        this.id = id;
        this.email = email;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Employee employee = (Employee) o;
        return Objects.equals(id, employee.id) && Objects.equals(email, employee.email);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, email);
    }
}"""
    elif "immutable" in t_lower:
        return """public final class UserProfile {
    private final String username;
    private final List<String> roles;
    private final Date createdDate;

    public UserProfile(String username, List<String> roles, Date createdDate) {
        this.username = username;
        // Defensive copying of mutable collections and date objects
        this.roles = Collections.unmodifiableList(new ArrayList<>(roles));
        this.createdDate = new Date(createdDate.getTime());
    }

    public String getUsername() { return username; }
    public List<String> getRoles() { return roles; }
    public Date getCreatedDate() { return new Date(createdDate.getTime()); } // Defensive copy
}"""
    elif "singleton" in t_lower:
        return """public class BillPughSingleton {
    private BillPughSingleton() {}

    private static class InstanceHolder {
        private static final BillPughSingleton INSTANCE = new BillPughSingleton();
    }

    public static BillPughSingleton getInstance() {
        return InstanceHolder.INSTANCE;
    }
}"""
    elif "builder" in t_lower:
        return """public class DatabaseConfig {
    private final String host;
    private final int port;
    private final int maxConnections;

    private DatabaseConfig(Builder builder) {
        this.host = builder.host;
        this.port = builder.port;
        this.maxConnections = builder.maxConnections;
    }

    public static class Builder {
        private String host = "localhost";
        private int port = 5432;
        private int maxConnections = 10;

        public Builder host(String host) { this.host = host; return this; }
        public Builder port(int port) { this.port = port; return this; }
        public Builder maxConnections(int max) { this.maxConnections = max; return this; }

        public DatabaseConfig build() { return new DatabaseConfig(this); }
    }
}"""
    elif "record" in t_lower:
        return """// Java 16+ Record with Compact Constructor
public record OrderDto(Long id, String customerEmail, BigDecimal totalAmount) {
    public OrderDto {
        Objects.requireNonNull(id, "Order ID cannot be null");
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount cannot be negative");
        }
    }
}"""
    elif "sealed" in t_lower:
        return """// Java 17+ Sealed Classes and Interfaces
public sealed interface PaymentMethod permits CreditCard, UPI, NetBanking {}

public final class CreditCard implements PaymentMethod { private final String cardNumber; public CreditCard(String c) { this.cardNumber = c; } }
public final class UPI implements PaymentMethod { private final String vpa; public UPI(String vpa) { this.vpa = vpa; } }
public final class NetBanking implements PaymentMethod { private final String bankCode; public NetBanking(String b) { this.bankCode = b; } }"""
    elif "completablefuture" in t_lower:
        return """CompletableFuture<String> userFuture = CompletableFuture.supplyAsync(() -> fetchUserData(userId));
CompletableFuture<Order> orderFuture = CompletableFuture.supplyAsync(() -> fetchLatestOrder(userId));

CompletableFuture<UserProfileView> profileFuture = userFuture
    .thenCombine(orderFuture, (user, order) -> new UserProfileView(user, order))
    .exceptionally(ex -> {
        log.error("Failed to build user profile view", ex);
        return UserProfileView.fallback();
    });"""
    elif "stream" in t_lower or "collector" in t_lower:
        return """Map<Department, List<Employee>> employeesByDept = employeeList.stream()
    .filter(Employee::isActive)
    .collect(Collectors.groupingBy(
        Employee::getDepartment,
        Collectors.toList()
    ));"""
    elif "exception" in t_lower or "try-with-resources" in t_lower:
        return """try (BufferedReader reader = Files.newBufferedReader(Path.of("config.txt"));
     Connection conn = dataSource.getConnection()) {
    String line = reader.readLine();
    // Resources auto-closed cleanly in reverse order of declaration
} catch (IOException | SQLException e) {
    throw new ServiceException("Failed to read system configuration", e);
}"""
    elif "beanpostprocessor" in t_lower or "lifecycle" in t_lower:
        return """@Component
public class CustomBeanPostProcessor implements BeanPostProcessor {
    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof AuditAware) {
            log.info("Initializing AuditAware bean: {}", beanName);
        }
        return bean;
    }
}"""
    elif "jpa" in t_lower or "entity" in t_lower or "repository" in t_lower:
        return """@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Version
    private Long version; // Optimistic locking
}"""
    elif "security" in t_lower or "jwt" in t_lower or "filter" in t_lower:
        return """@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}"""
    elif "flags" in t_lower or "gc" in t_lower or "jvm" in t_lower or "metaspace" in t_lower:
        return """# Recommended Production JVM Flags (Java 17 / 21)
java -Xms4g -Xmx4g \\
     -XX:+UseG1GC \\
     -XX:MetaspaceSize=256m \\
     -XX:MaxMetaspaceSize=512m \\
     -XX:+HeapDumpOnOutOfMemoryError \\
     -XX:HeapDumpPath=/var/logs/heapdumps/ \\
     -jar app.jar"""
    
    return None

def build_teacher_notes(topic, category):
    t_clean = topic.strip()
    t_lower = t_clean.lower()
    parsed_answer = []

    # Custom Dedicated Authoritative Teacher Explanations for Specific Core Topics
    if "primitives vs objects" in t_lower or ("primitive" in t_lower and "object" in t_lower):
        parsed_answer.append({
            "type": "prose",
            "content": "In Java, data types are fundamentally split into **Primitives** (`int`, `long`, `double`, `boolean`, etc.) and **Reference Objects** (`Integer`, `Long`, `String`, custom objects). Primitive variables store their literal values directly in memory—on the execution thread stack for local variables or inline inside object layout for instance fields. Reference objects store a 64-bit reference pointer pointing to an object instance instantiated on the JVM Heap."
        })
        parsed_answer.append(generate_comparison_table(topic))
        parsed_answer.append({
            "type": "bullet_list",
            "items": [
                "Memory Footprint: Primitives consume 1 to 8 bytes of raw memory without object header overhead. Reference objects carry a 12-byte or 16-byte object header (Mark Word + Klass Word) plus 8-byte alignment padding.",
                "Autoboxing Mechanics: Automatic conversion of primitives to wrapper objects (e.g. `int` to `Integer` via `Integer.valueOf()`). Occurs during assignment, method invocation, or collection insertion.",
                "Integer Caching: Java caches `Integer` instances for values between `-128` and `127`. Comparing cached integers with `==` returns `true`, whereas comparing values outside this range returns `false` due to different heap object references."
            ]
        })
        parsed_answer.append({
            "type": "code",
            "content": "// Autoboxing & Integer Caching Behavior\nInteger a = 100;\nInteger b = 100;\nSystem.out.println(a == b); // true (Cached instance)\n\nInteger x = 500;\nInteger y = 500;\nSystem.out.println(x == y); // false (Different heap objects! Use x.equals(y))"
        })
        parsed_answer.append({
            "type": "note",
            "content": "Performance Tip: Implicit autoboxing inside high-frequency loops creates millions of short-lived wrapper objects on the Heap, triggering GC pressure. Prefer primitives in performance-critical execution loops."
        })

    elif "pass-by-value" in t_lower:
        parsed_answer.append({
            "type": "prose",
            "content": "Java is **strictly pass-by-value**. When an argument is passed into a method, Java copies the value of the variable into a new local stack frame variable inside the method. For primitive arguments, the actual literal bit pattern is copied. For object references, the **64-bit reference address pointer** is copied by value onto the stack."
        })
        parsed_answer.append(generate_comparison_table(topic))
        parsed_answer.append({
            "type": "bullet_list",
            "items": [
                "Primitive Arguments: Modifying primitive parameters inside a method changes only the local stack copy. The caller's variable remains unchanged.",
                "Object Arguments: Reassigning an object parameter inside a method (`p = new Person()`) changes only the local copy of the reference pointer. The caller's reference pointer still points to the original object.",
                "Object Mutation: Calling setter methods or mutating fields on an object reference modifies the actual instance on the JVM Heap, because both reference copies point to the exact same object location."
            ]
        })
        parsed_answer.append({
            "type": "code",
            "content": "public void modify(int num, Person p) {\n    num = 99; // Changes local copy only\n    p.setName(\"Alice\"); // Mutates heap object! (Reflects in caller)\n    p = new Person(\"Bob\"); // Reassigns local pointer copy (Does NOT affect caller)\n}"
        })
        parsed_answer.append({
            "type": "note",
            "content": "Core Rule to Remember: Java never passes references by reference. It passes the pointer value itself by value!"
        })

    elif "string" in t_lower and ("pool" in t_lower or "intern" in t_lower or "immutable" in t_lower):
        parsed_answer.append({
            "type": "prose",
            "content": "In Java, **String** is immutable and final. String literals are stored and cached in the **String Constant Pool (SCP)**—a specialized hashtable residing in main Heap memory (moved from PermGen in Java 7 to eliminate OutOfMemoryErrors)."
        })
        parsed_answer.append({
            "type": "bullet_list",
            "items": [
                "Immutability Rationale: Character arrays inside String are marked private and final. Once instantiated, contents cannot be altered, ensuring thread safety, secure class loading, and safe caching.",
                "Literal Reuse: Declaring `String s = \"hello\"` checks the SCP table. If present, it returns the pooled reference. Declaring `new String(\"hello\")` explicitly allocates a new Heap object.",
                "String.intern(): Invoking `.intern()` searches the SCP for an equal string. If found, it returns the pooled pointer; otherwise, it adds the string reference to the SCP."
            ]
        })
        parsed_answer.append({
            "type": "code",
            "content": "String s1 = \"DayFlow\";              // Stored in SCP\nString s2 = \"DayFlow\";              // Reuses SCP reference\nString s3 = new String(\"DayFlow\");  // Allocated on Heap\n\nSystem.out.println(s1 == s2);           // true\nSystem.out.println(s1 == s3);           // false\nSystem.out.println(s1 == s3.intern());  // true"
        })
        parsed_answer.append({
            "type": "note",
            "content": "Performance Advice: Use StringBuilder for repetitive string concatenation inside loops to prevent creating temporary intermediate string objects on the Heap."
        })

    elif "equals" in t_lower and "hashcode" in t_lower:
        parsed_answer.append({
            "type": "prose",
            "content": "The **equals()** and **hashCode()** contract is a core foundational invariant in Java. `equals()` defines object logical equality, while `hashCode()` computes an integer hash value used by hash-based collections (`HashMap`, `HashSet`, `ConcurrentHashMap`) to locate bucket indexes."
        })
        parsed_answer.append({
            "type": "bullet_list",
            "items": [
                "Mathematical Contract: If two objects are equal according to `equals(Object)`, they MUST produce the exact same `hashCode()`. However, two objects producing the same `hashCode()` are NOT required to be equal (hash collision).",
                "HashMap Bucket Placement: `HashMap` computes `index = (n - 1) & (hash ^ (hash >>> 16))`. If `hashCode()` is inconsistent, elements are stored in wrong buckets and cannot be retrieved.",
                "Contract Violation Bug: Overriding `equals()` without overriding `hashCode()` causes equal objects to hash into different buckets, resulting in duplicate keys or `map.get()` returning `null`."
            ]
        })
        parsed_answer.append({
            "type": "code",
            "content": "public class User {\n    private final Long id;\n    private final String email;\n\n    public User(Long id, String email) {\n        this.id = id;\n        this.email = email;\n    }\n\n    @Override\n    public boolean equals(Object o) {\n        if (this == o) return true;\n        if (o == null || getClass() != o.getClass()) return false;\n        User user = (User) o;\n        return Objects.equals(id, user.id) && Objects.equals(email, user.email);\n    }\n\n    @Override\n    public int hashCode() {\n        return Objects.hash(id, email);\n    }\n}"
        })
        parsed_answer.append({
            "type": "note",
            "content": "Production Practice: Use Objects.equals() and Objects.hash() or Lombok's @EqualsAndHashCode(onlyExplicitlyIncluded = true) to prevent hash contract bugs."
        })

    elif "immutability" in t_lower and "defensive" in t_lower:
        parsed_answer.append({
            "type": "prose",
            "content": "Designing a truly **immutable class** in Java requires strict architectural rules: marking the class `final` to prevent subclassing, marking all fields `private final`, avoiding setters, and performing **defensive copying** on all mutable objects passed into constructors or returned by getter methods."
        })
        parsed_answer.append({
            "type": "bullet_list",
            "items": [
                "Defensive Constructor Copying: When receiving mutable references like `Date` or `List`, construct new copies internally rather than storing the caller's reference pointer.",
                "Defensive Getter Copying: Never return direct references to internal mutable fields. Return unmodifiable wrappers (`Collections.unmodifiableList()`) or fresh cloned instances.",
                "Thread Safety Benefit: Immutable objects are inherently thread-safe without requiring synchronized locks or memory barriers."
            ]
        })
        parsed_answer.append({
            "type": "code",
            "content": "public final class UserProfile {\n    private final String username;\n    private final Date createdDate;\n\n    public UserProfile(String username, Date createdDate) {\n        this.username = username;\n        this.createdDate = new Date(createdDate.getTime()); // Defensive copy in\n    }\n\n    public Date getCreatedDate() {\n        return new Date(createdDate.getTime()); // Defensive copy out\n    }\n}"
        })
        parsed_answer.append({
            "type": "note",
            "content": "Key Rule: In Java 16+, Records provide immutability out of the box, but you still must perform defensive copying inside compact constructors if fields contain mutable objects."
        })

    elif "final, static, transient, volatile" in t_lower:
        parsed_answer.append({
            "type": "prose",
            "content": "In Java, key modifier keywords control object state, memory placement, serialization, and concurrency: **`final`** enforces immutability, **`static`** binds variables to class Metaspace memory, **`transient`** excludes fields from serialization streams, and **`volatile`** forces CPU memory visibility barriers."
        })
        parsed_answer.append({
            "type": "table",
            "headers": ["Modifier Keyword", "Primary Purpose", "JVM Memory & Execution Behavior"],
            "rows": [
                ["final", "Immutability & Non-overrideability", "Variables assigned once; methods cannot be overridden; classes cannot be subclassed"],
                ["static", "Class-level Shared Memory", "Allocated once in Metaspace; shared across all class instances"],
                ["transient", "Serialization Exclusion", "Ignored by ObjectOutputStream during default serialization; deserialized as null/0"],
                ["volatile", "Main Memory Thread Visibility", "Flushes CPU cache writes to Main Memory; prevents compiler instruction reordering"]
            ]
        })
        parsed_answer.append({
            "type": "bullet_list",
            "items": [
                "Static Final Constants: Declaring `public static final` creates a thread-safe global constant initialized during class loading.",
                "Transient Fields: Use transient for sensitive fields (e.g. passwords) or transient caches that should not persist to disk.",
                "Volatile Limitation: Volatile guarantees visibility, but does NOT guarantee atomicity for compound operations like `count++`."
            ]
        })
        parsed_answer.append({
            "type": "code",
            "content": "public class SessionState implements Serializable {\n    private static final long serialVersionUID = 1L;\n    private final String sessionId; // final\n    private transient String rawPassword; // transient\n    private volatile boolean isLoggedOut = false; // volatile\n}"
        })
        parsed_answer.append({
            "type": "note",
            "content": "Engineering Distinction: Volatile is ideal for boolean flags; use AtomicInteger or ReentrantLock for atomic counter increments."
        })

    else:
        # High quality descriptive educator notes
        parsed_answer.append({
            "type": "prose",
            "content": f"**{t_clean}** is an essential subject in **{category}**. As a Java developer, mastering this topic provides deep clarity into JVM execution, memory allocation, and software architecture."
        })

        comp_tbl = generate_comparison_table(t_clean)
        if comp_tbl:
            parsed_answer.append(comp_tbl)

        parsed_answer.append({
            "type": "bullet_list",
            "items": [
                "Memory & Reference Layout: Dictates how variables, stack frames, and heap reference pointers are allocated and resolved at runtime.",
                "State Isolation & Thread Invariants: Guarantees type safety, lock isolation, or exception boundaries across method invocations.",
                "Production Best Practice: Write clean, defensive code and account for Garbage Collection throughput and thread execution overhead."
            ]
        })

        code_snippet = generate_relevant_code(t_clean, category)
        if code_snippet:
            parsed_answer.append({
                "type": "code",
                "content": code_snippet
            })

        parsed_answer.append({
            "type": "note",
            "content": f"Engineering Advice: Always evaluate the performance and concurrency impact of **{t_clean}** under realistic production workloads."
        })

    return parsed_answer

def generate_module_html(mod_cfg, module_topics):
    mod_id = mod_cfg["id"]
    title = mod_cfg["title"]
    short_title = title.split(':')[0] if ':' in title else title
    category = mod_cfg["category"]
    icon = mod_cfg["icon"]
    desc = mod_cfg["desc"]

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — Java Deep Dive</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg: #F8F8F6;
    --surface: #FFFFFF;
    --surface2: #F2F2F0;
    --border: #E8E8E4;
    --accent: #E25C1A;
    --accent-glow: rgba(226, 92, 26, 0.12);
    --green: #22C55E;
    --green-glow: rgba(34, 197, 94, 0.12);
    --red: #EF4444;
    --yellow: #F59E0B;
    --purple: #8B5CF6;
    --text: #1A1A18;
    --muted: #6B6B65;
    --mono: 'JetBrains Mono', SFMono-Regular, Consolas, monospace;
    --sans: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    --radius: 14px;
    --radius-sm: 8px;
  }}

  body.dark-mode {{
    --bg: #0F1117;
    --surface: #1A1D27;
    --surface2: #232638;
    --border: #2E3247;
    --accent: #FF6B35;
    --accent-glow: rgba(255, 107, 53, 0.18);
    --green: #00D4AA;
    --green-glow: rgba(0,212,170,0.15);
    --red: #FF6B6B;
    --yellow: #FFD166;
    --text: #E8EAF0;
    --muted: #7A7F9A;
  }}

  * {{ box-sizing: border-box; margin: 0; padding: 0; }}

  body {{
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    min-height: 100vh;
    line-height: 1.6;
  }}

  /* HEADER NAV */
  .dayflow-nav-header {{
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }}
  .nav-back-btn {{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    background: var(--surface2);
    border: 1px solid var(--border);
    padding: 7px 14px;
    border-radius: 20px;
    transition: all 0.2s ease;
    cursor: pointer;
  }}
  .nav-back-btn:hover {{
    background: var(--accent-glow);
    border-color: var(--accent);
    color: var(--accent);
    transform: translateX(-2px);
  }}
  .nav-title {{
    font-weight: 700;
    font-size: 15px;
    color: var(--text);
  }}
  .theme-toggle-btn {{
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 16px;
  }}
  .theme-toggle-btn:hover {{
    background: var(--accent-glow);
    border-color: var(--accent);
  }}

  /* HERO HEADER */
  header {{
    padding: 48px 24px 32px;
    text-align: center;
    border-bottom: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }}
  header::before {{
    content: '';
    position: absolute;
    top: -80px; left: 50%;
    transform: translateX(-50%);
    width: 500px; height: 500px;
    background: radial-gradient(circle, var(--accent-glow) 0%, transparent 65%);
    pointer-events: none;
  }}

  .eyebrow {{
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.2em;
    color: var(--accent);
    text-transform: uppercase;
    margin-bottom: 12px;
  }}

  h1 {{
    font-size: clamp(24px, 4vw, 36px);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text);
    margin-bottom: 8px;
  }}

  .subtitle {{
    color: var(--muted);
    font-size: 14.5px;
    font-weight: 400;
    max-width: 600px;
    margin: 0 auto 32px;
  }}

  /* PROGRESS RING */
  .progress-hub {{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 40px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }}
  .ring-wrap {{
    position: relative;
    width: 100px; height: 100px;
  }}
  .ring-wrap svg {{ transform: rotate(-90deg); }}
  .ring-bg {{ fill: none; stroke: var(--surface2); stroke-width: 8; }}
  .ring-fill {{
    fill: none;
    stroke: var(--accent);
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1);
  }}
  .ring-label {{
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: var(--mono);
  }}
  .ring-num {{ font-size: 22px; font-weight: 700; color: var(--text); line-height: 1; }}
  .ring-total {{ font-size: 11px; color: var(--muted); margin-top: 2px; }}

  /* CONTROLS */
  .controls {{
    max-width: 900px;
    margin: 28px auto 0;
    padding: 0 24px;
  }}
  .search-box {{
    position: relative;
    margin-bottom: 24px;
  }}
  .search-input {{
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: var(--sans);
    font-size: 14px;
    padding: 12px 18px 12px 42px;
    border-radius: var(--radius-sm);
    outline: none;
    transition: all 0.2s;
  }}
  .search-input:focus {{
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }}
  .search-icon {{
    position: absolute;
    left: 14px; top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    font-size: 16px;
  }}

  /* CARD LIST */
  .cards-list {{
    max-width: 900px;
    margin: 0 auto 80px;
    padding: 0 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }}

  .q-card {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    transition: all 0.2s ease;
  }}
  .q-card:hover {{
    border-color: var(--accent);
  }}
  .q-card.done {{
    border-color: var(--green);
  }}

  .q-header {{
    padding: 18px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    cursor: pointer;
    user-select: none;
  }}
  .q-header-left {{
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex: 1;
  }}
  .q-checkbox {{
    width: 18px;
    height: 18px;
    min-width: 18px;
    min-height: 18px;
    accent-color: var(--green);
    cursor: pointer;
    margin-top: 2px;
    flex-shrink: 0;
  }}
  .q-num {{
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    background: var(--accent-glow);
    padding: 2px 7px;
    border-radius: 5px;
    flex-shrink: 0;
    line-height: 1.3;
    margin-top: 1px;
  }}
  .q-title {{
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.45;
  }}
  .q-chevron {{
    color: var(--muted);
    font-size: 12px;
    transition: transform 0.2s ease;
  }}
  .q-card.open .q-chevron {{
    transform: rotate(180deg);
  }}

  .q-body {{
    display: none;
    padding: 0 24px 24px;
    border-top: 1px solid var(--border);
    background: var(--surface);
  }}
  .q-card.open .q-body {{
    display: block;
  }}

  /* ANSWER STYLING */
  .ans-prose {{
    margin-top: 20px;
    font-size: 14.5px;
    color: var(--text);
    line-height: 1.7;
  }}

  .ans-note {{
    margin-top: 16px;
    padding: 14px 18px;
    background: var(--accent-glow);
    border-left: 4px solid var(--accent);
    border-radius: var(--radius-sm);
    font-size: 13.5px;
    color: var(--text);
  }}

  .ans-bullets {{
    margin-top: 16px;
    padding-left: 20px;
  }}
  .ans-bullets li {{
    font-size: 14px;
    margin-bottom: 8px;
    color: var(--text);
  }}

  .table-container {{
    margin-top: 18px;
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }}
  .ans-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
    text-align: left;
  }}
  .ans-table th {{
    background: var(--surface2);
    padding: 10px 14px;
    font-weight: 600;
    border-bottom: 1px solid var(--border);
    color: var(--text);
  }}
  .ans-table td {{
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    color: var(--text);
  }}
  .ans-table tr:last-child td {{
    border-bottom: none;
  }}

  .code-container {{
    position: relative;
    margin-top: 18px;
    background: #1E1E1E;
    border-radius: var(--radius-sm);
    padding: 16px;
    overflow-x: auto;
  }}
  .code-container pre {{
    margin: 0;
    font-family: var(--mono);
    font-size: 13px;
    color: #D4D4D4;
    line-height: 1.5;
  }}
  .copy-btn {{
    position: absolute;
    top: 10px; right: 10px;
    background: rgba(255,255,255,0.1);
    border: none;
    color: #AAA;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }}
  .copy-btn:hover {{
    background: rgba(255,255,255,0.2);
    color: #FFF;
  }}

  .card-footer {{
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }}
  .toggle-done-btn {{
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 12.5px;
    font-weight: 600;
    padding: 8px 18px; border-radius: var(--radius-sm); cursor: pointer;
  }}
  .q-card.done .toggle-done-btn {{
    background: var(--green-glow); border-color: var(--green); color: var(--green);
  }}
</style>
</head>
<body>

<div class="dayflow-nav-header">
  <a href="../index.html" class="nav-back-btn">←</a>
  <div class="nav-title">{icon} {short_title}</div>
  <button class="theme-toggle-btn" onclick="toggleTheme()">🌙</button>
</div>

<header>
  <div class="eyebrow">{icon} Java Deep Dive Module</div>
  <h1>{title}</h1>
  <div class="subtitle">{desc}</div>

  <div class="progress-hub">
    <div class="ring-wrap">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle class="ring-bg" cx="50" cy="50" r="42" />
        <circle class="ring-fill" id="ringCircle" cx="50" cy="50" r="42" stroke-dasharray="263.89" stroke-dashoffset="263.89" />
      </svg>
      <div class="ring-label">
        <span class="ring-num" id="ringNum">0%</span>
        <span class="ring-total" id="ringTotal">0/{len(module_topics)}</span>
      </div>
    </div>
  </div>
</header>

<div class="controls">
  <input type="text" class="search-box" id="searchInput" placeholder="🔍 Search topics in this module..." oninput="renderContent()">
</div>

<main id="mainContainer"></main>

<script src="../course_data.js"></script>
<script>
  const MODULE_CAT = "{category}";
  let MODULE_TOPICS = (window.JAVA_IN_DETAILS_DATA || []).filter(q => q.category === MODULE_CAT);
  let doneSet = new Set();

  function loadProgress() {{
    try {{
      const raw = localStorage.getItem('java_in_details_done_v1');
      if (raw) {{
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) doneSet = new Set(arr);
      }}
    }} catch(e) {{}}
  }}

  function saveProgress() {{
    try {{
      const arr = Array.from(doneSet);
      localStorage.setItem('java_in_details_done_v1', JSON.stringify(arr));
      if (window.parent && typeof window.parent.syncLearnState === 'function') {{
        window.parent.syncLearnState();
      }}
    }} catch(e) {{}}
  }}

  function toggleDone(id, event) {{
    if (event) event.stopPropagation();
    if (doneSet.has(id)) {{
      doneSet.delete(id);
    }} else {{
      doneSet.add(id);
    }}
    saveProgress();
    updateStats();
    
    const card = document.getElementById(`card-${{id}}`);
    if (card) {{
      card.classList.toggle('done', doneSet.has(id));
      const chk = card.querySelector('.q-checkbox');
      if (chk) chk.checked = doneSet.has(id);
      const btn = card.querySelector('.toggle-done-btn');
      if (btn) btn.textContent = doneSet.has(id) ? '✓ Completed' : 'Mark as Completed';
    }}
  }}

  function toggleCard(id) {{
    const card = document.getElementById(`card-${{id}}`);
    if (card) card.classList.toggle('open');
  }}

  function copyCode(btn) {{
    const codeEl = btn.closest('.code-container').querySelector('code');
    if (codeEl) {{
      navigator.clipboard.writeText(codeEl.textContent);
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.style.background = 'var(--green)';
      btn.style.color = '#FFF';
      setTimeout(() => {{
        btn.textContent = orig;
        btn.style.background = '';
        btn.style.color = '';
      }}, 2000);
    }}
  }}

  function updateStats() {{
    const total = MODULE_TOPICS.length;
    const doneCount = MODULE_TOPICS.filter(q => doneSet.has(q.id)).length;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    const circle = document.getElementById('ringCircle');
    if (circle) {{
      const circumference = 263.89;
      const offset = circumference - (pct / 100) * circumference;
      circle.style.strokeDashoffset = offset;
    }}

    const ringNum = document.getElementById('ringNum');
    if (ringNum) ringNum.textContent = `${{pct}}%`;

    const ringTotal = document.getElementById('ringTotal');
    if (ringTotal) ringTotal.textContent = `${{doneCount}}/${{total}}`;
  }}

  function escapeHtml(str) {{
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }}

  function formatMarkdown(str) {{
    if (!str) return '';
    let esc = escapeHtml(str);
    esc = esc.replace(/\\*\\*(.*?)\\*\\*/g, '<strong style="color: var(--accent); font-weight:700;">$1</strong>');
    esc = esc.replace(/`([^`]+)`/g, '<code style="background:var(--surface2); padding:2px 6px; border-radius:4px; font-family:var(--mono); font-size:12px;">$1</code>');
    return esc;
  }}

  function formatParsedAnswer(parsedAnswer) {{
    if (!parsedAnswer || !parsedAnswer.length) return '<p class="ans-prose">No detailed explanation provided.</p>';
    let html = '';
    parsedAnswer.forEach(part => {{
      if (part.type === 'code') {{
        html += `
          <div class="code-container">
            <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            <pre><code>${{escapeHtml(part.content)}}</code></pre>
          </div>
        `;
      }} else if (part.type === 'table') {{
        html += `
          <div class="table-container">
            <table class="ans-table">
              <thead><tr>${{part.headers.map(h => `<th>${{formatMarkdown(h)}}</th>`).join('')}}</tr></thead>
              <tbody>${{part.rows.map(row => `<tr>${{row.map(cell => `<td>${{formatMarkdown(cell)}}</td>`).join('')}}</tr>`).join('')}}</tbody>
            </table>
          </div>
        `;
      }} else if (part.type === 'bullet_list') {{
        html += `<ul class="ans-bullets">${{part.items.map(item => `<li>${{formatMarkdown(item)}}</li>`).join('')}}</ul>`;
      }} else if (part.type === 'note') {{
        html += `<div class="ans-note">💡 <strong>Note:</strong> ${{formatMarkdown(part.content)}}</div>`;
      }} else {{
        html += `<p class="ans-prose">${{formatMarkdown(part.content)}}</p>`;
      }}
    }});
    return html;
  }}

  function renderContent() {{
    const container = document.getElementById('mainContainer');
    const searchVal = document.getElementById('searchInput').value.toLowerCase().trim();

    const filtered = MODULE_TOPICS.filter(q => {{
      if (searchVal) {{
        const inTitle = q.title.toLowerCase().includes(searchVal);
        const inAnswer = q.parsed_answer && JSON.stringify(q.parsed_answer).toLowerCase().includes(searchVal);
        if (!inTitle && !inAnswer) return false;
      }}
      return true;
    }});

    if (filtered.length === 0) {{
      container.innerHTML = `<div class="empty-state">No microtopics found in this module matching your search.</div>`;
      return;
    }}

    container.innerHTML = filtered.map(q => {{
      const isDone = doneSet.has(q.id);
      const answerHtml = formatParsedAnswer(q.parsed_answer);

      return `
        <div class="q-card ${{isDone ? 'done' : ''}}" id="card-${{q.id}}">
          <div class="q-header" onclick="toggleCard('${{q.id}}')">
            <div class="q-header-left">
              <input type="checkbox" class="q-checkbox" ${{isDone ? 'checked' : ''}} onclick="toggleDone('${{q.id}}', event)">
              <span class="q-num">#${{q.num}}</span>
              <div class="q-title">${{q.title}}</div>
            </div>
            <div class="q-meta">
              <span class="diff-badge ${{q.difficulty}}">${{q.difficulty}}</span>
            </div>
          </div>
          <div class="q-body">
            ${{answerHtml}}
            <div class="q-actions">
              <button class="toggle-done-btn" onclick="toggleDone('${{q.id}}', event)">
                ${{isDone ? '✓ Completed' : 'Mark as Completed'}}
              </button>
            </div>
          </div>
        </div>
      `;
    }}).join('');
  }}

  function toggleTheme() {{
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  }}

  function init() {{
    loadProgress();
    updateStats();
    renderContent();
    if (localStorage.getItem('theme') === 'dark') {{
      document.body.classList.add('dark-mode');
    }}
  }}

  window.addEventListener('DOMContentLoaded', init);
</script>
</body>
</html>"""
    return html

def main():
    psv_file = r'c:\Users\raksh\Desktop\DayFLow\_deploy\learn\Java_in_details\microtopics.psv'
    js_output = r'c:\Users\raksh\Desktop\DayFLow\_deploy\learn\Java_in_details\course_data.js'
    json_output = r'c:\Users\raksh\Desktop\DayFLow\_deploy\learn\Java_in_details\course_data.json'
    modules_dir = r'c:\Users\raksh\Desktop\DayFLow\_deploy\learn\Java_in_details\modules'
    
    os.makedirs(modules_dir, exist_ok=True)
    
    if not os.path.exists(psv_file):
        print(f"Error: {psv_file} not found.")
        return

    with open(psv_file, 'r', encoding='utf-8') as f:
        content = f.read()

    ai_notes_dir = r'c:\Users\raksh\Desktop\DayFLow\_deploy\learn\Java_in_details\ai_generated_notes'
    ai_notes_by_idx = {}
    if os.path.exists(ai_notes_dir):
        for fname in os.listdir(ai_notes_dir):
            if fname.endswith('.json'):
                parts = fname.split('_')
                if len(parts) >= 2 and parts[0] == 'topic':
                    try:
                        t_idx = int(parts[1])
                        fpath = os.path.join(ai_notes_dir, fname)
                        with open(fpath, 'r', encoding='utf-8') as f:
                            ai_notes_by_idx[t_idx] = json.load(f)
                    except Exception:
                        pass

    raw_items = [item.strip() for item in content.split('|') if item.strip()]
    
    course_items = []
    seen = set()
    ai_used_count = 0
    
    for idx, item in enumerate(raw_items):
        if item in seen:
            continue
        seen.add(item)
        
        cat, diff = determine_category_and_difficulty(idx, item)
        
        # Only include topics that have valid, detailed AI notes!
        if idx in ai_notes_by_idx and "parsed_answer" in ai_notes_by_idx[idx] and len(ai_notes_by_idx[idx]["parsed_answer"]) > 0:
            ai_data = ai_notes_by_idx[idx]
            parsed_answer = ai_data["parsed_answer"]
            ai_used_count += 1
        else:
            # Skip any topic missing details as requested
            continue
        
        item_obj = {
            "id": f"jd_{len(course_items) + 1}",
            "num": len(course_items) + 1,
            "global_num": len(course_items) + 1,
            "title": item,
            "category": cat,
            "difficulty": diff,
            "parsed_answer": parsed_answer
        }
        course_items.append(item_obj)

    print(f"Processed {len(course_items)} topics strictly with detailed AI notes (filtered out missing topics).")
    
    # Write master JSON and JS
    with open(json_output, 'w', encoding='utf-8') as f:
        json.dump(course_items, f, indent=2, ensure_ascii=False)

    js_content = "window.JAVA_IN_DETAILS_DATA = " + json.dumps(course_items, indent=2, ensure_ascii=False) + ";"
    with open(js_output, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print("Successfully built course_data.js and course_data.json for all topics!")

    # Write separate HTML file for each module in modules/
    for mod_cfg in MODULE_CONFIG:
        cat = mod_cfg["category"]
        mod_topics = [t for t in course_items if t["category"] == cat]
        mod_html = generate_module_html(mod_cfg, mod_topics)
        mod_file_path = os.path.join(modules_dir, mod_cfg["file"])
        with open(mod_file_path, 'w', encoding='utf-8') as f:
            f.write(mod_html)
        print(f"Generated module HTML: {mod_cfg['file']} ({len(mod_topics)} topics)")

    print("All 15 module HTML files generated in modules/ directory!")

if __name__ == "__main__":
    main()
