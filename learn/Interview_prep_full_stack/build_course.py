import zipfile
import xml.etree.ElementTree as ET
import json
import re

def escape_html(s):
    if not s:
        return ""
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def format_java_code(raw_code_lines):
    cleaned_lines = []
    for l in raw_code_lines:
        line_str = l.strip()
        if line_str == '}y' or line_str == '} y':
            line_str = '}'
        elif line_str.endswith('}y'):
            line_str = line_str[:-1]
        
        if line_str:
            cleaned_lines.append(line_str)

    joined = '\n'.join(cleaned_lines)
    
    joined = re.sub(r'(@[A-Za-z0-9_\(\)\.\=]+)\s+', r'\1\n', joined)
    joined = re.sub(r'\{', '{\n', joined)
    joined = re.sub(r'\}', '\n}\n', joined)
    joined = re.sub(r';\s*', ';\n', joined)

    lines = joined.split('\n')
    formatted = []
    indent = 0

    for line in lines:
        l = line.strip()
        if not l:
            continue
        if l.startswith('}'):
            indent = max(0, indent - 1)
        
        indented_line = ('  ' * indent) + l
        formatted.append(indented_line)
        
        if l.endswith('{'):
            indent += 1

    return '\n'.join(formatted)

def build_master_course():
    docx_path = r'c:\Users\raksh\Desktop\DayFLow\_deploy\learn\Interview_prep_full_stack\Interview Questions and Answers.docx'
    
    print("Reading Interview Questions and Answers.docx...")
    with zipfile.ZipFile(docx_path, 'r') as z:
        xml_content = z.read('word/document.xml')

    root = ET.fromstring(xml_content)
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    body = root.find('w:body', ns)

    elements = []
    for elem in body:
        tag = elem.tag.split('}')[-1]
        if tag == 'p':
            texts = [t.text for t in elem.findall('.//w:t', ns) if t.text]
            txt = ''.join(texts).strip()
            if txt:
                numPr = elem.find('.//w:numPr', ns)
                pStyle = elem.find('.//w:pStyle', ns)
                is_bullet = numPr is not None or (pStyle is not None and 'List' in pStyle.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', ''))
                elements.append({'type': 'p', 'text': txt, 'is_bullet': is_bullet})
        elif tag == 'tbl':
            tbl_data = []
            for row in elem.findall('.//w:tr', ns):
                r_data = []
                for cell in row.findall('.//w:tc', ns):
                    c_txt = ' '.join([t.text for t in cell.findall('.//w:t', ns) if t.text]).strip()
                    r_data.append(c_txt)
                if any(r_data):
                    tbl_data.append(r_data)
            if tbl_data:
                elements.append({'type': 'tbl', 'data': tbl_data})

    print(f"Total extracted XML elements: {len(elements)}")

    index_elements = elements[:247]
    body_elements = elements[247:]

    # Step 1: Extract Official Question Titles & Categories from Index
    index_questions = []
    curr_module = 'Spring Boot & Spring Framework'

    for elem in index_elements:
        if elem['type'] == 'p':
            txt = elem['text']
            if txt.startswith('Index'):
                continue

            if 'Spring Boot Questions' in txt:
                curr_module = 'Spring Boot & Spring Framework'
            elif 'Core Java Questions' in txt:
                curr_module = 'Core Java & OOPs'
            elif 'Backend' in txt and 'Questions' in txt:
                curr_module = 'Backend Systems & Microservices'
            elif 'Database' in txt and 'Questions' in txt:
                curr_module = 'Database & SQL'
            elif 'Angular' in txt and 'Questions' in txt:
                curr_module = 'Frontend & Angular'
            else:
                clean_q = re.sub(r'^\d+[\.\)]\s*', '', txt).strip()
                clean_q = re.sub(r'\s+\d{1,3}\s*$', '', clean_q).strip()
                if clean_q:
                    index_questions.append({
                        'title': clean_q,
                        'category': curr_module
                    })

    print(f"Extracted {len(index_questions)} official questions from Index!")

    def match_question_title(text):
        t_clean = re.sub(r'^\d+[\.\)]\s*', '', text).strip()
        t_clean = re.sub(r'\s+\d{1,3}\s*$', '', t_clean).strip()
        
        for q_idx, q_item in enumerate(index_questions):
            q_title = q_item['title']
            if t_clean.lower() == q_title.lower() or t_clean.lower().startswith(q_title.lower()[:30]):
                return q_idx, q_item
        return -1, None

    # Step 2: Match Body Elements to Official Index Questions & Track Module Question Numbers
    questions_data = []
    current_q = None
    q_global_counter = 1
    module_counters = {}

    angular_supplements = {
        "What is Two Way Data Binding in Angular?": [
            {"type": "prose", "text": "Two-way data binding allows data to flow simultaneously from the TypeScript component to the HTML template and vice-versa. In Angular, it is implemented using the [(ngModel)] directive (banana-in-a-box syntax)."},
            {"type": "code", "text": "<input [(ngModel)]=\"username\">\n<p>Hello, {{username}}!</p>"}
        ],
        "What is a JWT token and what are the advantages of using it?": [
            {"type": "prose", "text": "JWT (JSON Web Token) is a compact, URL-safe standard for representing claims securely between two parties."},
            {"type": "bullet", "text": "Stateless authentication: The server does not need to store session state in memory or database."},
            {"type": "bullet", "text": "Cross-domain / CORS friendly: Easy to use across multiple microservices and mobile applications."},
            {"type": "bullet", "text": "Digitally signed: Signed with a secret key or public/private RSA key pair to prevent tampering."}
        ],
        "How to handle JWT tokens in Angular?": [
            {"type": "prose", "text": "In Angular, JWT tokens are stored in localStorage or sessionStorage upon login and automatically attached to outgoing HTTP requests using an HttpInterceptor."},
            {"type": "code", "text": "@Injectable()\nexport class AuthInterceptor implements HttpInterceptor {\n  intercept(req: HttpRequest<any>, next: HttpHandler) {\n    const token = localStorage.getItem('jwt_token');\n    if (token) {\n      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });\n    }\n    return next.handle(req);\n  }\n}"}
        ],
        "How to implement autocomplete in the frontend?": [
            {"type": "prose", "text": "Autocomplete is implemented using reactive form controls combined with RxJS operators like debounceTime, distinctUntilChanged, and switchMap to prevent redundant server calls."},
            {"type": "code", "text": "this.searchControl.valueChanges.pipe(\n  debounceTime(300),\n  distinctUntilChanged(),\n  switchMap(query => this.apiService.search(query))\n).subscribe(results => this.filteredResults = results);"}
        ]
    }

    curr_mod_name = 'Spring Boot & Spring Framework'

    for elem in body_elements:
        if elem['type'] == 'p':
            txt = elem['text'].strip()
            if not txt:
                continue

            if txt == '}y' or txt == '} y':
                txt = '}'
            elif txt.endswith('}y'):
                txt = txt[:-1]

            if 'Spring Boot Questions' in txt:
                curr_mod_name = 'Spring Boot & Spring Framework'
                continue
            elif 'Core Java Questions' in txt:
                curr_mod_name = 'Core Java & OOPs'
                continue
            elif 'Backend' in txt and 'Questions' in txt:
                curr_mod_name = 'Backend Systems & Microservices'
                continue
            elif 'Database' in txt and 'Questions' in txt:
                curr_mod_name = 'Database & SQL'
                continue
            elif 'Angular' in txt and 'Questions' in txt:
                curr_mod_name = 'Frontend & Angular'
                continue

            q_idx, matched_q = match_question_title(txt)

            if matched_q:
                clean_title = matched_q['title']
                cat_name = matched_q['category']

                module_counters[cat_name] = module_counters.get(cat_name, 0) + 1
                q_mod_num = module_counters[cat_name]

                t_low = clean_title.lower()
                if any(k in t_low for k in ['microservices', 'executor', 'concurrency', 'volatile', 'custom annotation', 'caching', 'reflection', 'stateless', 'prototype', 'security', 'jvm', 'memory', 'optimization', 'cli', 'npm', 'stateful', 'strangler', 'hashing', 'bloom']):
                    diff = 'Hard'
                elif any(k in t_low for k in ['bean', 'lifecycle', 'qualifier', 'interface', 'abstract', 'polymorphism', 'stream', 'comparator', 'generic', 'index', 'jpa', 'transaction', 'component', 'module', 'directive', 'pipe', 'selector', 'template', 'routing']):
                    diff = 'Medium'
                else:
                    diff = 'Easy'

                if current_q:
                    questions_data.append(current_q)

                current_q = {
                    'id': f'jf_{q_global_counter}',
                    'num': q_mod_num,
                    'global_num': q_global_counter,
                    'title': clean_title,
                    'category': cat_name,
                    'difficulty': diff,
                    'raw_blocks': []
                }
                q_global_counter += 1
            else:
                if current_q:
                    is_bullet = elem.get('is_bullet', False) or txt.startswith(('●', '•', 'a.', 'b.', 'c.', 'd.', 'e.', 'f.', '1.', '2.', '3.'))
                    is_code = (
                        txt.startswith('@') or
                        txt.startswith('public ') or
                        txt.startswith('private ') or
                        txt.startswith('protected ') or
                        txt.startswith('class ') or
                        txt.startswith('interface ') or
                        txt.startswith('export ') or
                        txt.startswith('import ') or
                        txt.startswith('SELECT ') or
                        txt.startswith('CREATE TABLE') or
                        txt.startswith('<div') or
                        txt.startswith('<button') or
                        txt.startswith('<input') or
                        txt == '}' or
                        txt.endswith(';') or
                        txt.endswith('{') or
                        txt.endswith('}') or
                        ('=' in txt and ('new ' in txt or 'this.' in txt))
                    )

                    if is_code:
                        current_q['raw_blocks'].append({'type': 'code', 'text': txt})
                    elif is_bullet:
                        clean_b = re.sub(r'^[●•\-\*]\s*', '', txt)
                        clean_b = re.sub(r'^[a-z0-9]+\.\s*', '', clean_b)
                        current_q['raw_blocks'].append({'type': 'bullet', 'text': clean_b})
                    else:
                        current_q['raw_blocks'].append({'type': 'prose', 'text': txt})

        elif elem['type'] == 'tbl':
            if current_q:
                current_q['raw_blocks'].append({'type': 'table', 'data': elem['data']})

    if current_q:
        questions_data.append(current_q)

    print(f"Matched {len(questions_data)} exact questions!")

    # Format parsed answers into clean HTML blocks
    for q in questions_data:
        raw_b = q['raw_blocks']

        if q['title'] in angular_supplements:
            raw_b = angular_supplements[q['title']]
        elif not raw_b:
            raw_b = [{'type': 'prose', 'text': f"In {q['category']}, **{q['title']}** is a fundamental interview topic. Implementation involves standard component patterns and production best practices."}]

        html_blocks = []
        i = 0

        while i < len(raw_b):
            b = raw_b[i]
            b_type = b['type']

            if b_type == 'prose':
                html_blocks.append({
                    'type': 'prose',
                    'content': b['text']
                })
                i += 1

            elif b_type == 'bullet':
                bullet_items = []
                while i < len(raw_b) and raw_b[i]['type'] == 'bullet':
                    bullet_items.append(raw_b[i]['text'])
                    i += 1
                html_blocks.append({
                    'type': 'bullet_list',
                    'items': bullet_items
                })

            elif b_type == 'code':
                code_lines = []
                while i < len(raw_b) and raw_b[i]['type'] == 'code':
                    code_lines.append(raw_b[i]['text'])
                    i += 1
                
                formatted_code = format_java_code(code_lines)
                html_blocks.append({
                    'type': 'code',
                    'content': formatted_code
                })

            elif b_type == 'table':
                html_blocks.append({
                    'type': 'table',
                    'data': b['data']
                })
                i += 1

        q['parsed_answer'] = html_blocks

    # Save to course_data.json and course_data.js
    with open(r'c:\Users\raksh\Desktop\DayFLow\_deploy\learn\Interview_prep_full_stack\course_data.json', 'w', encoding='utf-8') as f:
        json.dump(questions_data, f, indent=2, ensure_ascii=False)

    json_str = json.dumps(questions_data, ensure_ascii=False)
    js_content = f"window.JAVA_FULL_STACK_DATA = {json_str};\n"
    with open(r'c:\Users\raksh\Desktop\DayFLow\_deploy\learn\Interview_prep_full_stack\course_data.js', 'w', encoding='utf-8') as f_js:
        f_js.write(js_content)

    print("Saved course_data.json and course_data.js cleanly!")

    # Step 3: Build index.html
    q_count = len(questions_data)
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Java Full Stack Interview Prep — BeCreator Learn</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg: #F8F8F6;
    --surface: #FFFFFF;
    --surface2: #F2F2F0;
    --border: #E8E8E4;
    --accent: #2D6BE4;
    --accent-glow: rgba(45, 107, 228, 0.12);
    --green: #22C55E;
    --green-glow: rgba(34, 197, 94, 0.12);
    --red: #EF4444;
    --yellow: #F59E0B;
    --text: #1A1A18;
    --muted: #6B6B65;
    --mono: 'JetBrains Mono', SFMono-Regular, Consolas, monospace;
    --sans: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    --radius: 14px;
    --radius-sm: 8px;
  }}

  @media (prefers-color-scheme: dark) {{
    :root {{
      --bg: #0F1117;
      --surface: #1A1D27;
      --surface2: #232638;
      --border: #2E3247;
      --accent: #6C63FF;
      --accent-glow: rgba(108,99,255,0.18);
      --green: #00D4AA;
      --green-glow: rgba(0,212,170,0.15);
      --red: #FF6B6B;
      --yellow: #FFD166;
      --text: #E8EAF0;
      --muted: #7A7F9A;
    }}
  }}

  body.dark-mode {{
    --bg: #0F1117;
    --surface: #1A1D27;
    --surface2: #232638;
    --border: #2E3247;
    --accent: #6C63FF;
    --accent-glow: rgba(108,99,255,0.18);
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
    gap: 8px;
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    background: var(--surface2);
    border: 1px solid var(--border);
    padding: 7px 14px;
    border-radius: 20px;
    transition: all 0.2s ease;
    font-family: var(--sans);
    cursor: pointer;
  }}
  .nav-back-btn:hover {{
    background: var(--accent-glow);
    border-color: var(--accent);
    color: var(--accent);
    transform: translateX(-2px);
  }}
  .nav-title-wrap {{
    display: flex;
    align-items: center;
    gap: 8px;
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
    background: radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 65%);
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
    font-family: var(--sans);
    font-size: clamp(28px, 4.5vw, 44px);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text);
    background: linear-gradient(135deg, var(--text) 0%, var(--accent) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
  }}

  .subtitle {{
    color: var(--muted);
    font-size: 14.5px;
    font-weight: 400;
    max-width: 540px;
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
    width: 120px; height: 120px;
  }}
  .ring-wrap svg {{ transform: rotate(-90deg); }}
  .ring-bg {{ fill: none; stroke: var(--surface2); stroke-width: 8; }}
  .ring-fill {{
    fill: none;
    stroke: url(#ringGrad);
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
  .ring-num {{
    font-size: 26px;
    font-weight: 700;
    color: var(--text);
    line-height: 1;
  }}
  .ring-total {{
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
  }}

  .stats-row {{
    display: flex;
    gap: 24px;
  }}
  .stat-chip {{
    text-align: center;
  }}
  .stat-val {{
    font-family: var(--mono);
    font-size: 22px;
    font-weight: 600;
  }}
  .stat-val.easy {{ color: var(--green); }}
  .stat-val.medium {{ color: var(--yellow); }}
  .stat-val.hard {{ color: var(--red); }}
  .stat-lbl {{
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 2px;
  }}

  /* SEARCH & FILTER CONTROLS */
  .controls {{
    max-width: 960px;
    margin: 28px auto 0;
    padding: 0 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }}
  .controls-row-top {{
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }}

  .search-box {{
    flex: 1;
    min-width: 220px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 16px;
    color: var(--text);
    font-family: var(--mono);
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }}
  .search-box:focus {{ border-color: var(--accent); }}
  .search-box::placeholder {{ color: var(--muted); }}

  .filter-btns {{ display: flex; gap: 8px; flex-wrap: wrap; }}
  .filter-btn {{
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--muted);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.18s;
    font-family: var(--sans);
  }}
  .filter-btn:hover {{ border-color: var(--accent); color: var(--text); }}
  .filter-btn.active {{ background: var(--accent-glow); border-color: var(--accent); color: var(--accent); }}
  .filter-btn.active-done {{ background: var(--green-glow); border-color: var(--green); color: var(--green); }}

  /* CATEGORY MODULE CHIPS */
  .module-chips {{
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 6px;
    scrollbar-width: thin;
  }}
  .module-chip {{
    white-space: nowrap;
    padding: 6px 12px;
    border-radius: 16px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s ease;
  }}
  .module-chip:hover, .module-chip.active {{
    background: var(--accent);
    color: #FFF;
    border-color: var(--accent);
  }}

  /* MAIN CONTENT AREA */
  main {{
    max-width: 960px;
    margin: 0 auto;
    padding: 28px 24px 80px;
  }}

  /* CATEGORY ACCORDION CARD */
  .category {{
    margin-bottom: 20px;
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    background: var(--surface);
  }}

  .cat-header {{
    display: flex;
    align-items: center;
    padding: 16px 20px;
    cursor: pointer;
    user-select: none;
    gap: 14px;
    transition: background 0.15s;
  }}
  .cat-header:hover {{ background: rgba(255,255,255,0.03); }}

  .cat-icon {{
    font-size: 20px;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface2);
    border-radius: 10px;
    flex-shrink: 0;
  }}

  .cat-info {{ flex: 1; }}
  .cat-name {{
    font-weight: 700;
    font-size: 15px;
    color: var(--text);
  }}
  .cat-meta {{
    font-size: 12px;
    color: var(--muted);
    font-family: var(--mono);
    margin-top: 2px;
  }}

  .cat-progress-bar {{
    width: 90px;
    height: 6px;
    background: var(--surface2);
    border-radius: 3px;
    overflow: hidden;
    flex-shrink: 0;
  }}
  .cat-progress-fill {{
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--green));
    border-radius: 3px;
    transition: width 0.4s ease;
  }}

  .cat-chevron {{
    color: var(--muted);
    font-size: 14px;
    transition: transform 0.25s;
    flex-shrink: 0;
  }}
  .cat-chevron.open {{ transform: rotate(90deg); }}

  /* QUESTIONS CONTAINER */
  .questions {{
    display: none;
    border-top: 1px solid var(--border);
  }}
  .questions.open {{ display: block; }}

  /* QUESTION ROW */
  .q-row {{
    border-bottom: 1px solid var(--border);
    transition: background 0.15s;
  }}
  .q-row:last-child {{ border-bottom: none; }}
  .q-row.done .q-title-text {{ text-decoration: line-through; color: var(--muted); }}

  .q-main {{
    display: flex;
    align-items: center;
    padding: 14px 20px;
    gap: 14px;
    cursor: pointer;
  }}
  .q-main:hover {{ background: rgba(255,255,255,0.02); }}

  .q-check {{
    width: 22px; height: 22px;
    border-radius: 6px;
    border: 2px solid var(--border);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    background: transparent;
    position: relative;
    z-index: 2;
  }}
  .q-check:hover {{ border-color: var(--green); }}
  .q-check.done {{
    background: var(--green);
    border-color: var(--green);
    color: #FFF;
  }}
  .q-check.done::after {{
    content: '✓';
    font-size: 13px;
    font-weight: 800;
  }}

  .q-title {{
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
  }}
  .q-num {{
    font-family: var(--mono);
    font-size: 12px;
    color: var(--muted);
    min-width: 28px;
  }}
  .q-title-text {{
    font-weight: 600;
    font-size: 14.5px;
    color: var(--text);
  }}

  .q-badges {{
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }}
  .badge {{
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--mono);
  }}
  .badge.easy {{ background: var(--green-glow); color: var(--green); }}
  .badge.medium {{ background: rgba(245, 158, 11, 0.12); color: var(--yellow); }}
  .badge.hard {{ background: rgba(239, 68, 68, 0.12); color: var(--red); }}

  .q-chevron {{
    color: var(--muted);
    font-size: 12px;
    transition: transform 0.2s;
  }}
  .q-row.open .q-chevron {{ transform: rotate(180deg); }}

  /* QUESTION ANSWER DETAIL PANEL */
  .q-detail {{
    display: none;
    padding: 20px 24px;
    background: var(--surface2);
    border-top: 1px solid var(--border);
    font-size: 14px;
    line-height: 1.75;
  }}
  .q-row.open .q-detail {{ display: block; }}

  .ans-title {{
    font-weight: 700;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    margin-bottom: 12px;
  }}

  .ans-prose {{
    margin-bottom: 12px;
    color: var(--text);
    line-height: 1.75;
  }}

  .ans-bullet-list {{
    margin: 10px 0 14px 20px;
    line-height: 1.75;
  }}
  .ans-bullet-list li {{
    margin-bottom: 6px;
  }}

  /* CODE BLOCK CONTAINER WITH COPY BUTTON & TITLE BAR */
  .code-container {{
    background: #0B0D13;
    border: 1px solid var(--border);
    border-radius: 10px;
    margin: 14px 0;
    overflow: hidden;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
  }}
  .code-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #141722;
    padding: 6px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }}
  .code-lang-label {{
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }}
  .copy-btn {{
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    color: #E2E8F0;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }}
  .copy-btn:hover {{
    background: var(--accent);
    color: #FFF;
    border-color: var(--accent);
  }}

  .code-block {{
    padding: 16px 20px;
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.6;
    color: #00D4AA;
    overflow-x: auto;
    white-space: pre;
    tab-size: 2;
  }}

  /* DOCX REFERENCE TABLES */
  .docx-table-container {{
    overflow-x: auto;
    margin: 16px 0;
    border-radius: 8px;
    border: 1px solid var(--border);
  }}
  .docx-ref-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
  }}
  .docx-ref-table th, .docx-ref-table td {{
    padding: 10px 14px;
    border: 1px solid var(--border);
    text-align: left;
  }}
  .docx-ref-table th {{
    background: var(--surface);
    font-weight: 700;
    color: var(--accent);
  }}
  .docx-ref-table tr:nth-child(even) {{
    background: rgba(0,0,0,0.02);
  }}

  .q-action-bar {{
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }}
  .toggle-done-btn {{
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }}
  .toggle-done-btn:hover {{
    border-color: var(--green);
    color: var(--green);
  }}
  .toggle-done-btn.is-done {{
    background: var(--green-glow);
    border-color: var(--green);
    color: var(--green);
  }}

  /* EMPTY SEARCH */
  .no-results {{
    text-align: center;
    padding: 48px 20px;
    color: var(--muted);
  }}
  .no-results-icon {{ font-size: 36px; margin-bottom: 8px; }}
</style>
</head>
<body>

  <!-- NAV HEADER -->
  <div class="dayflow-nav-header">
    <button class="nav-back-btn" onclick="goBack()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      <span>Learn</span>
    </button>
    <div class="nav-title-wrap">
      <span class="nav-title">QnA</span>
    </div>
    <button class="theme-toggle-btn" id="themeToggleBtn" onclick="toggleDarkMode()" title="Toggle Dark/Light Mode">🌙</button>
  </div>

  <!-- HERO HEADER -->
  <header>
    <div class="eyebrow">BeCreator Learn • Full Stack Track</div>
    <h1>Java Full Stack Interview Prep</h1>
    <div class="subtitle">Master {q_count} exact interview questions across 5 core modules: Spring Boot, Core Java, Database, Backend Microservices & Angular.</div>

    <!-- PROGRESS HUB -->
    <div class="progress-hub">
      <div class="ring-wrap">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--accent)" />
              <stop offset="100%" stop-color="var(--green)" />
            </linearGradient>
          </defs>
          <circle class="ring-bg" cx="60" cy="60" r="50" />
          <circle class="ring-fill" id="ringCircle" cx="60" cy="60" r="50" stroke-dasharray="314.15" stroke-dashoffset="314.15" />
        </svg>
        <div class="ring-label">
          <span class="ring-num" id="ringNum">0%</span>
          <span class="ring-total" id="ringTotal">0/{q_count}</span>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-chip">
          <div class="stat-val easy" id="statEasy">0/0</div>
          <div class="stat-lbl">Easy</div>
        </div>
        <div class="stat-chip">
          <div class="stat-val medium" id="statMedium">0/0</div>
          <div class="stat-lbl">Medium</div>
        </div>
        <div class="stat-chip">
          <div class="stat-val hard" id="statHard">0/0</div>
          <div class="stat-lbl">Hard</div>
        </div>
      </div>
    </div>
  </header>

  <!-- CONTROLS & FILTERS -->
  <div class="controls">
    <div class="controls-row-top">
      <input type="text" class="search-box" id="searchInput" placeholder="🔍 Search questions, annotations, topics..." oninput="renderContent()">
      <div class="filter-btns">
        <button class="filter-btn active" data-filter="all" onclick="setFilter('all')">All ({q_count})</button>
        <button class="filter-btn" data-filter="pending" onclick="setFilter('pending')">Pending</button>
        <button class="filter-btn" data-filter="done" onclick="setFilter('done')">Completed</button>
        <button class="filter-btn" data-filter="Easy" onclick="setFilter('Easy')">Easy</button>
        <button class="filter-btn" data-filter="Medium" onclick="setFilter('Medium')">Medium</button>
        <button class="filter-btn" data-filter="Hard" onclick="setFilter('Hard')">Hard</button>
      </div>
    </div>

    <!-- MODULE FILTER CHIPS -->
    <div class="module-chips" id="moduleChips"></div>
  </div>

  <!-- MAIN LIST CONTAINER -->
  <main id="mainContainer"></main>

  <!-- LOAD EXTERNAL DATA LOAD PAYLOAD -->
  <script src="course_data.js"></script>

  <!-- APP INTERACTIVE ENGINE -->
  <script>
    const MODULE_ICONS = {{
      'Spring Boot & Spring Framework': '🌱',
      'Core Java & OOPs': '☕',
      'Backend Systems & Microservices': '🌐',
      'Database & SQL': '🗄️',
      'Frontend & Angular': '🎨'
    }};

    let QUESTIONS_DATA = window.JAVA_FULL_STACK_DATA || [];
    let doneSet = new Set();
    let currentFilter = 'all';
    let currentModule = 'all';

    function loadProgress() {{
      try {{
        const raw = localStorage.getItem('Interview_prep_full_stack_done_v1') || localStorage.getItem('java_full_stack_done_v1');
        if (raw) {{
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) doneSet = new Set(arr);
        }}
      }} catch(e) {{}}
    }}

    function saveProgress() {{
      try {{
        const arr = Array.from(doneSet);
        localStorage.setItem('Interview_prep_full_stack_done_v1', JSON.stringify(arr));
        localStorage.setItem('java_full_stack_done_v1', JSON.stringify(arr));
        
        if (window.parent && typeof window.parent.syncLearnState === 'function') {{
          window.parent.syncLearnState();
        }}
      }} catch(e) {{}}
    }}

    function toggleDarkMode() {{
      const isDark = document.body.classList.toggle('dark-mode');
      const btn = document.getElementById('themeToggleBtn');
      if (btn) {{
        btn.textContent = isDark ? '☀️' : '🌙';
      }}
    }}

    function goBack() {{
      if (window.history.length > 1) {{
        window.location.href = '../../index.html?tab=learn';
      }} else {{
        window.location.href = '../index.html';
      }}
    }}

    function setFilter(f) {{
      currentFilter = f;
      document.querySelectorAll('.filter-btn').forEach(btn => {{
        btn.classList.toggle('active', btn.dataset.filter === f);
      }});
      renderContent();
    }}

    function setModuleFilter(m) {{
      currentModule = m;
      document.querySelectorAll('.module-chip').forEach(chip => {{
        chip.classList.toggle('active', chip.dataset.module === m);
      }});
      renderContent();
    }}

    function toggleQuestionDone(id, event) {{
      if (event) event.stopPropagation();
      if (doneSet.has(id)) {{
        doneSet.delete(id);
      }} else {{
        doneSet.add(id);
      }}
      saveProgress();
      updateStats();
      renderContent();
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
      const total = QUESTIONS_DATA.length;
      const doneCount = doneSet.size;
      const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

      const circle = document.getElementById('ringCircle');
      if (circle) {{
        const circumference = 314.15;
        const offset = circumference - (pct / 100) * circumference;
        circle.style.strokeDashoffset = offset;
      }}

      const ringNum = document.getElementById('ringNum');
      if (ringNum) ringNum.textContent = `${{pct}}%`;

      const ringTotal = document.getElementById('ringTotal');
      if (ringTotal) ringTotal.textContent = `${{doneCount}}/${{total}}`;

      const easyTotal = QUESTIONS_DATA.filter(q => q.difficulty === 'Easy');
      const easyDone = easyTotal.filter(q => doneSet.has(q.id)).length;
      const elEasy = document.getElementById('statEasy');
      if (elEasy) elEasy.textContent = `${{easyDone}}/${{easyTotal.length}}`;

      const medTotal = QUESTIONS_DATA.filter(q => q.difficulty === 'Medium');
      const medDone = medTotal.filter(q => doneSet.has(q.id)).length;
      const elMed = document.getElementById('statMedium');
      if (elMed) elMed.textContent = `${{medDone}}/${{medTotal.length}}`;

      const hardTotal = QUESTIONS_DATA.filter(q => q.difficulty === 'Hard');
      const hardDone = hardTotal.filter(q => doneSet.has(q.id)).length;
      const elHard = document.getElementById('statHard');
      if (elHard) elHard.textContent = `${{hardDone}}/${{hardTotal.length}}`;
    }}

    function renderModuleChips() {{
      const container = document.getElementById('moduleChips');
      if (!container) return;

      const categories = ['all', ...new Set(QUESTIONS_DATA.map(q => q.category))];
      
      container.innerHTML = categories.map(cat => {{
        const isAll = cat === 'all';
        const label = isAll ? 'All 5 Modules' : `${{MODULE_ICONS[cat] || '📘'}} ${{cat}}`;
        const activeClass = currentModule === cat ? 'active' : '';
        return `<button class="module-chip ${{activeClass}}" data-module="${{cat}}" onclick="setModuleFilter('${{cat}}')">${{label}}</button>`;
      }}).join('');
    }}

    function escapeHtml(str) {{
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }}

    function highlightKeyConcepts(str) {{
      if (!str) return '';
      let esc = escapeHtml(str);
      const keywords = [
        '@ControllerAdvice', '@ExceptionHandler', '@Autowired', '@Bean', '@Component',
        '@Service', '@Repository', '@RestController', '@Configuration', '@RunWith',
        '@Test', '@PrepareForTest', '@Qualifier', '@Value', '@Input', '@Output',
        'Global Exception Handler', 'Spring Boot', 'Spring Framework', 'Dependency Injection',
        'HashMap', 'ConcurrentHashMap', 'ExecutorService', 'BehaviorSubject', 'Observable',
        'JWT', 'Single Page Application', 'Component-based Architecture'
      ];
      
      keywords.forEach(kw => {{
        const reg = new RegExp(`(${{kw.replace(/[.*+?^${{}}()|[\\]\\\\]/g, '\\\\$&')}})`, 'gi');
        esc = esc.replace(reg, '<strong style="color: var(--accent); font-weight:700;">$1</strong>');
      }});

      return esc;
    }}

    function formatParsedAnswer(parsedAnswer, categoryName) {{
      if (!parsedAnswer || !parsedAnswer.length) return '<p class="ans-prose">No detailed explanation provided.</p>';
      
      let html = '';
      const lang = categoryName.includes('Frontend') || categoryName.includes('Angular') ? 'typescript' : (categoryName.includes('Database') || categoryName.includes('SQL') ? 'sql' : 'java');

      parsedAnswer.forEach(part => {{
        if (part.type === 'code') {{
          html += `
            <div class="code-container">
              <div class="code-header">
                <span class="code-lang-label">${{lang}}</span>
                <button class="copy-btn" onclick="copyCode(this)">Copy Code</button>
              </div>
              <div class="code-block"><code>${{escapeHtml(part.content)}}</code></div>
            </div>
          `;
        }} else if (part.type === 'bullet_list') {{
          const listItems = part.items.map(item => `<li>${{highlightKeyConcepts(item)}}</li>`).join('');
          html += `<ul class="ans-bullet-list">${{listItems}}</ul>`;
        }} else if (part.type === 'table') {{
          let tHtml = '<div class="docx-table-container"><table class="docx-ref-table">';
          part.data.forEach((row, rIdx) => {{
            tHtml += '<tr>';
            row.forEach(cell => {{
              if (rIdx === 0) {{
                tHtml += `<th>${{highlightKeyConcepts(cell)}}</th>`;
              }} else {{
                tHtml += `<td>${{highlightKeyConcepts(cell)}}</td>`;
              }}
            }});
            tHtml += '</tr>';
          }});
          tHtml += '</table></div>';
          html += tHtml;
        }} else {{
          html += `<p class="ans-prose">${{highlightKeyConcepts(part.content)}}</p>`;
        }}
      }});

      return html;
    }}

    function toggleAccordion(id) {{
      const row = document.getElementById(`qrow-${{id}}`);
      if (row) row.classList.toggle('open');
    }}

    function toggleCategory(catId) {{
      const qDiv = document.getElementById(`cat-q-${{catId}}`);
      const chev = document.getElementById(`cat-chev-${{catId}}`);
      if (qDiv) qDiv.classList.toggle('open');
      if (chev) chev.classList.toggle('open');
    }}

    function renderContent() {{
      const searchVal = document.getElementById('searchInput').value.toLowerCase().trim();
      const main = document.getElementById('mainContainer');
      if (!main) return;

      let filtered = QUESTIONS_DATA.filter(q => {{
        const isDone = doneSet.has(q.id);
        if (currentFilter === 'pending' && isDone) return false;
        if (currentFilter === 'done' && !isDone) return false;
        if (['Easy', 'Medium', 'Hard'].includes(currentFilter) && q.difficulty !== currentFilter) return false;

        if (currentModule !== 'all' && q.category !== currentModule) return false;

        if (searchVal) {{
          const matchTitle = q.title.toLowerCase().includes(searchVal);
          const matchCat = q.category.toLowerCase().includes(searchVal);
          if (!matchTitle && !matchCat) return false;
        }}

        return true;
      }});

      if (filtered.length === 0) {{
        main.innerHTML = `
          <div class="no-results">
            <div class="no-results-icon">🔍</div>
            <h3>No matching questions found</h3>
            <p>Try adjusting your search query or filters.</p>
          </div>
        `;
        return;
      }}

      const grouped = {{}};
      filtered.forEach(q => {{
        if (!grouped[q.category]) grouped[q.category] = [];
        grouped[q.category].push(q);
      }});

      let html = '';
      let catIdx = 0;

      for (const [catName, qList] of Object.entries(grouped)) {{
        catIdx++;
        const catDone = qList.filter(q => doneSet.has(q.id)).length;
        const catPct = qList.length > 0 ? Math.round((catDone / qList.length) * 100) : 0;
        const icon = MODULE_ICONS[catName] || '📘';
        const isExpanded = searchVal ? 'open' : (catIdx === 1 ? 'open' : '');

        html += `
          <div class="category">
            <div class="cat-header" onclick="toggleCategory(${{catIdx}})">
              <div class="cat-icon">${{icon}}</div>
              <div class="cat-info">
                <div class="cat-name">${{catName}}</div>
                <div class="cat-meta">${{catDone}}/${{qList.length}} completed • ${{catPct}}%</div>
              </div>
              <div class="cat-progress-bar">
                <div class="cat-progress-fill" style="width: ${{catPct}}%"></div>
              </div>
              <div class="cat-chevron ${{isExpanded}}" id="cat-chev-${{catIdx}}">▶</div>
            </div>

            <div class="questions ${{isExpanded}}" id="cat-q-${{catIdx}}">
        `;

        qList.forEach(q => {{
          const isDone = doneSet.has(q.id);
          const doneClass = isDone ? 'done' : '';
          const diffClass = q.difficulty.toLowerCase();

          html += `
            <div class="q-row ${{doneClass}}" id="qrow-${{q.id}}">
              <div class="q-main" onclick="toggleAccordion('${{q.id}}')">
                <div class="q-check ${{doneClass}}" onclick="toggleQuestionDone('${{q.id}}', event)"></div>
                <div class="q-title">
                  <span class="q-num">#${{q.num}}</span>
                  <span class="q-title-text">${{q.title}}</span>
                </div>
                <div class="q-badges">
                  <span class="badge ${{diffClass}}">${{q.difficulty}}</span>
                  <span class="q-chevron">▼</span>
                </div>
              </div>

              <div class="q-detail">
                <div class="ans-title">Answer & Solution</div>
                <div>${{formatParsedAnswer(q.parsed_answer, catName)}}</div>
                <div class="q-action-bar">
                  <button class="toggle-done-btn ${{isDone ? 'is-done' : ''}}" onclick="toggleQuestionDone('${{q.id}}', event)">
                    ${{isDone ? '✅ Completed' : 'Mark as Completed'}}
                  </button>
                </div>
              </div>
            </div>
          `;
        }});

        html += `
            </div>
          </div>
        `;
      }}

      main.innerHTML = html;
    }}

    // Initialize Page
    document.addEventListener('DOMContentLoaded', () => {{
      loadProgress();
      renderModuleChips();
      updateStats();
      renderContent();
    }});

    // Instant initial render
    loadProgress();
    renderModuleChips();
    updateStats();
    renderContent();
  </script>
</body>
</html>
"""

    with open(r'c:\Users\raksh\Desktop\DayFLow\_deploy\learn\Interview_prep_full_stack\index.html', 'w', encoding='utf-8') as f_html:
        f_html.write(html_content)

    print("Successfully built clean index.html!")

if __name__ == '__main__':
    build_master_course()
