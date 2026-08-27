import os
import json
import time
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

API_KEYS = [
    'dummy'
]
current_key_idx = 0
key_lock = threading.Lock()

def configure_gemini(key_index):
    genai.configure(api_key=API_KEYS[key_index])

# Using both Flash Lite models to double the rate limit concurrency!
MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]

SYSTEM_INSTRUCTION = """
You are an elite, senior Java software engineer and technical educator writing a production-grade textbook.
Your goal is to write a highly detailed, authentic, domain-specific technical explanation for the provided topic.

CRITICAL RULES:
1. EXHAUSTIVE KEYWORD COVERAGE: If the topic title contains multiple keywords separated by commas or dashes, you MUST explicitly explain EVERY SINGLE keyword in deep detail.
2. NO ROBOTIC BOILERPLATE: Do not use generic phrases like "represents a fundamental technical requirement". Speak naturally like a senior engineer.
3. DOMAIN ACCURACY: If it's a JVM topic, talk about heap/stack/GC. If it's Spring, talk about beans/IoC/proxies. If Database, talk about indexes/locks/N+1.

You must output RAW JSON (no markdown formatting, no ```json) containing exactly one root object with a `parsed_answer` array. 
Structure the array exactly like this, flowing naturally without explicit section headings:
{
  "parsed_answer": [
    { "type": "prose", "content": "(Multi-paragraph explanation of what this is, why it exists, and the real-world problem it solves. Make sure you cover ALL keywords in the title!)" },
    { "type": "table", "headers": ["Aspect", "Comparison A", "Comparison B"], "rows": [["...", "...", "..."], ["...", "...", "..."]] }, 
    { "type": "bullet_list", "items": ["(Deep internal mechanics, invariants, memory layout, or framework execution flow)", "(Another mechanic...)"] },
    { "type": "code", "language": "java", "content": "(Syntax-accurate production code or config. Can be SQL/yaml/java. Keep it concise but realistic.)" },
    { "type": "note", "content": "(A 7+ YOE senior production gotcha, memory leak trap, or interview insight tailored to this exact topic.)" }
  ]
}
NOTE: If a table doesn't make sense for the topic, you can omit the table block. If code doesn't make sense, omit the code block.
"""

def determine_category_and_difficulty(index, topic):
    t_lower = topic.lower()
    if any(k in t_lower for k in ['virtual thread', 'loom', 'scopedvalue', 'structuredtaskscope', 'carrier thread', 'pinning']):
        return "Virtual Threads & Concurrency"
    elif any(k in t_lower for k in ['jvm', 'garbage', 'gc', 'metaspace', 'classloader', 'jit', 'c1/c2', 'tlab', 'graalvm', 'aot', 'heap dump', 'flight recorder', 'jfr']):
        return "JVM Architecture & Memory Tuning"
    elif any(k in t_lower for k in ['spring boot', 'auto-configuration', 'spring bean', 'applicationcontext', 'ioc', 'dependency injection', 'aop', 'aspect', '@transactional', 'beanpostprocessor']):
        return "Spring Boot & Spring Framework"
    elif any(k in t_lower for k in ['jpa', 'hibernate', 'entity', 'lazy', 'eager', 'n+1', 'persistencecontext', 'jpql', 'criteria', 'optimistic', 'pessimistic', 'hikaricp', 'schema migration', 'flyway', 'liquibase']):
        return "Spring Data JPA & Hibernate ORM"
    elif any(k in t_lower for k in ['security', 'oauth2', 'jwt', 'csrf', 'xss', 'owasp', 'authentication', 'securityfilterchain', 'bcrypt', 'vault']):
        return "Spring Security & Web Security"
    elif any(k in t_lower for k in ['webflux', 'reactive', 'graphql', 'grpc', 'rest', 'hateoas', 'swagger', 'openapi', 'proto', 'dispatcher-servlet', 'controlleradvice']):
        return "REST APIs, WebFlux & Microservices"
    elif any(k in t_lower for k in ['kafka', 'rabbitmq', 'redis', 'eureka', 'gateway', 'resilience4j', 'circuit breaker', 'saga', 'cqrs', 'outbox', 'microservices', 'sharding', 'consistent hashing', 'rate limiter', 'cdn']):
        return "Distributed Systems & Event-Driven Architecture"
    elif any(k in t_lower for k in ['synchronized', 'volatile', 'reentrantlock', 'completablefuture', 'executor', 'thread', 'concurrency', 'race condition', 'deadlock', 'cas', 'atomic', 'countdownlatch', 'forkjoinpool']):
        return "Multithreading & Java Concurrency"
    elif any(k in t_lower for k in ['java 8', 'java 9', 'java 11', 'java 17', 'java 21', 'lambda', 'stream', 'optional', 'record', 'sealed', 'pattern matching', 'var', 'text block', 'switch expression']):
        return "Modern Java Features (Java 8 - 21+)"
    elif any(k in t_lower for k in ['hashmap', 'concurrentmap', 'concurrenthashmap', 'arraylist', 'linkedlist', 'treemap', 'hashset', 'priorityqueue', 'collection', 'iterator', 'fail-fast', 'fail-safe', 'lru']):
        return "Collections Framework & Internals"
    elif any(k in t_lower for k in ['generic', 'wildcard', 'pecs', 'type erasure', 'bounded type']):
        return "Generics & Type System"
    elif any(k in t_lower for k in ['exception', 'try-with-resources', 'autocloseable', 'nio', 'io', 'file', 'path', 'channel', 'buffer', 'selector']):
        return "Exception Handling & I/O / NIO"
    elif any(k in t_lower for k in ['solid', 'singleton', 'factory', 'builder', 'decorator', 'proxy', 'strategy', 'observer', 'design pattern', 'encapsulation', 'polymorphism', 'inheritance', 'interface', 'abstract']):
        return "OOPs & Design Patterns"
    elif any(k in t_lower for k in ['junit', 'mockito', 'testcontainers', 'archunit', 'docker', 'kubernetes', 'aws', 'maven', 'gradle', 'ci/cd', 'prometheus', 'grafana', 'micrometer']):
        return "Testing, Observability & Cloud Native"
    return "Core Java & Fundamentals"

def generate_single_topic(idx, title, output_dir, total_topics):
    global current_key_idx
    
    safe_title = re.sub(r'[^a-zA-Z0-9]+', '_', title.lower()).strip('_')
    topic_id = f"topic_{idx:04d}_{safe_title[:60]}"
    output_file = os.path.join(output_dir, f"{topic_id}.json")
    
    if os.path.exists(output_file):
        return True, idx, title
        
    category = determine_category_and_difficulty(idx, title)
    prompt = f"Topic Title: {title}\nCategory/Module: {category}\n\nGenerate the JSON educator notes for this topic now."
    
    model_name = MODELS[idx % len(MODELS)]
    model = genai.GenerativeModel(
        model_name=model_name,
        system_instruction=SYSTEM_INSTRUCTION,
        generation_config={"response_mime_type": "application/json", "temperature": 0.4}
    )

    retries = 0
    while retries < 5:
        try:
            response = model.generate_content(prompt)
            data = json.loads(response.text)
            data['num'] = idx + 1
            data['title'] = title
            data['category'] = category
            
            with open(output_file, 'w', encoding='utf-8') as out_f:
                json.dump(data, out_f, indent=2, ensure_ascii=False)
            
            safe_print_title = title.encode('ascii', 'ignore').decode('ascii')
            print(f"[{idx+1}/{total_topics}] Successfully generated: {safe_print_title}")
            return True, idx, title
            
        except ResourceExhausted:
            with key_lock:
                current_key_idx = (current_key_idx + 1) % len(API_KEYS)
                configure_gemini(current_key_idx)
                print(f"Rate limit hit! Switched to API Key #{current_key_idx + 1}. Waiting 20s...")
            time.sleep(20)
            retries += 1
        except Exception as e:
            time.sleep(5)
            retries += 1
            
    safe_print_title = title.encode('ascii', 'ignore').decode('ascii')
    print(f"FAILED: {safe_print_title}")
    return False, idx, title

def main():
    csv_file = "microtopics.psv"
    output_dir = "ai_generated_notes"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with open(csv_file, 'r', encoding='utf-8') as f:
        content = f.read().strip()
        topics = [t.strip() for t in content.split('|') if t.strip()]
    configure_gemini(current_key_idx)
    print(f"Found {len(topics)} topics in {csv_file}. Using models ({', '.join(MODELS)}) with 5 threads.")
    
    processed = 0
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        for idx, title in enumerate(topics):
            futures.append(executor.submit(generate_single_topic, idx, title, output_dir, len(topics)))
            
        for future in as_completed(futures):
            success, idx, title = future.result()
            if success:
                processed += 1

    print(f"\nCompleted {processed} topics.")

if __name__ == '__main__':
    main()
