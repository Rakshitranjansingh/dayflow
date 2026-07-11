// ============================================================
// DAYFLOW COURSE BUILDER ENGINE
// ============================================================

// Local state for the course being built
let builderCourse = {
  id: '',
  title: '',
  emoji: '📚',
  description: '',
  estimatedHours: 4,
  totalLessons: 0,
  quizzesCount: 0,
  publisher: {
    name: '',
    email: '',
    github: ''
  },
  sections: []
};

// Initial page load bindings
function initBuilder() {
  // Pre-fill publisher details from logged in user if available
  if (state.name) builderCourse.publisher.name = state.name;
  if (state.userEmail) builderCourse.publisher.email = state.userEmail;

  // Retrieve saved GitHub config from local storage
  document.getElementById('git-owner').value = localStorage.getItem('df_git_owner') || 'Rakshitranjansingh';
  document.getElementById('git-repo').value = localStorage.getItem('df_git_repo') || 'becreator';
  document.getElementById('git-pat').value = localStorage.getItem('df_git_pat') || '';

  renderBuilderSections();
  updateBuilderPreview();
}

/**
 * Toggles the help overlay sidebar.
 */
function toggleHelpDrawer(show) {
  const drawer = document.getElementById('help-drawer');
  const overlay = document.getElementById('help-overlay');
  if (show) {
    drawer.classList.add('open');
    overlay.classList.add('show');
  } else {
    drawer.classList.remove('open');
    overlay.classList.remove('show');
  }
}

/**
 * Renders the sections and lessons form list.
 */
function renderBuilderSections() {
  const container = document.getElementById('builder-sections-list');
  if (!container) return;

  if (builderCourse.sections.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 20px 0;"><div class="e-icon">📂</div><div class="e-text">No sections added yet. Click "Add Section" below.</div></div>`;
    return;
  }

  container.innerHTML = builderCourse.sections.map((sect, sIdx) => {
    const itemsHtml = sect.lessons.map((item, iIdx) => {
      if (item.isQuiz) {
        return `
          <div class="builder-lesson-item">
            <div class="builder-item-header">
              <span class="builder-item-title" style="color:var(--accent);">📝 Quiz: ${item.title || 'Untitled'}</span>
              <button class="builder-delete-btn" onclick="removeBuilderItem(${sIdx}, ${iIdx})">✕ Delete</button>
            </div>
            <div class="builder-form-group">
              <label class="builder-label">Quiz Title</label>
              <input class="builder-input" value="${item.title || ''}" placeholder="e.g. Basic Syntax Quiz" oninput="updateItemValue(${sIdx}, ${iIdx}, 'title', this.value)">
            </div>
            <div class="builder-form-group">
              <label class="builder-label">Estimated Duration</label>
              <input class="builder-input" value="${item.duration || ''}" placeholder="e.g. 5 questions" oninput="updateItemValue(${sIdx}, ${iIdx}, 'duration', this.value)">
            </div>
            <div class="builder-form-group">
              <label class="builder-label">Pass Mark (%)</label>
              <input class="builder-input" type="number" value="${item.passMark || 70}" oninput="updateItemValue(${sIdx}, ${iIdx}, 'passMark', parseInt(this.value) || 70)">
            </div>
            
            <!-- Quiz Questions Section -->
            <div style="margin-top:10px; border-top: 1px solid var(--border); padding-top:10px;">
              <span class="builder-label">Questions (${item.questions?.length || 0})</span>
              <div id="questions-${sIdx}-${iIdx}">
                ${renderQuizQuestions(sIdx, iIdx, item.questions)}
              </div>
              <button class="builder-add-btn" style="padding: 4px 8px; font-size: 11px;" onclick="addQuizQuestion(${sIdx}, ${iIdx})">➕ Add Question</button>
            </div>
          </div>
        `;
      }

      // Lesson block
      const pointItems = (item.keyPoints || []).map((p, pIdx) => `
        <div style="display:flex; gap:6px; margin-bottom: 4px;">
          <input class="builder-input" style="font-size:12px; padding: 6px;" value="${p}" oninput="updateKeyPoint(${sIdx}, ${iIdx}, ${pIdx}, this.value)">
          <button class="builder-delete-btn" style="padding:0 8px;" onclick="removeKeyPoint(${sIdx}, ${iIdx}, ${pIdx})">✕</button>
        </div>
      `).join('');

      return `
        <div class="builder-lesson-item">
          <div class="builder-item-header">
            <span class="builder-item-title">📖 Lesson: ${item.title || 'Untitled'}</span>
            <button class="builder-delete-btn" onclick="removeBuilderItem(${sIdx}, ${iIdx})">✕ Delete</button>
          </div>
          <div class="builder-form-group">
            <label class="builder-label">Lesson Title</label>
            <input class="builder-input" value="${item.title || ''}" placeholder="e.g. Variables & Types" oninput="updateItemValue(${sIdx}, ${iIdx}, 'title', this.value)">
          </div>
          <div class="builder-form-group">
            <label class="builder-label">Duration</label>
            <input class="builder-input" value="${item.duration || ''}" placeholder="e.g. 10 min" oninput="updateItemValue(${sIdx}, ${iIdx}, 'duration', this.value)">
          </div>
          <div class="builder-form-group">
            <label class="builder-label">YouTube Video ID (Optional)</label>
            <input class="builder-input" value="${item.videoId || ''}" placeholder="e.g. Y8Tko2yc5hA" oninput="updateItemValue(${sIdx}, ${iIdx}, 'videoId', this.value)">
          </div>
          <div class="builder-form-group">
            <label class="builder-label">Audio File URL (Optional)</label>
            <input class="builder-input" value="${item.audioFile || ''}" placeholder="e.g. audio/lesson1.mp3" oninput="updateItemValue(${sIdx}, ${iIdx}, 'audioFile', this.value)">
          </div>
          <div class="builder-form-group">
            <label class="builder-label">Lesson Notes (Text / Markdown)</label>
            <textarea class="builder-input builder-textarea" placeholder="Enter lesson content..." oninput="updateItemValue(${sIdx}, ${iIdx}, 'notes', this.value)">${item.notes || ''}</textarea>
          </div>
          
          <!-- Key Points -->
          <div class="builder-form-group">
            <label class="builder-label">Key Points Summary</label>
            <div id="keypoints-${sIdx}-${iIdx}">${pointItems}</div>
            <button class="builder-add-btn" style="padding: 4px 8px; font-size: 11px;" onclick="addKeyPoint(${sIdx}, ${iIdx})">➕ Add Point</button>
          </div>

          <div class="builder-form-group">
            <label class="builder-label">Code Example (Optional)</label>
            <textarea class="builder-input builder-textarea" style="font-family:monospace; font-size:12px; background:#1e1e1e; color:#d4d4d4;" placeholder="e.g. print('Hello World')" oninput="updateItemValue(${sIdx}, ${iIdx}, 'code', this.value)">${item.code || ''}</textarea>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="builder-section-item">
        <div class="builder-item-header">
          <span class="builder-item-title" style="font-size: 15px;">📁 Section ${sIdx + 1}: ${sect.title || 'Untitled'}</span>
          <button class="builder-delete-btn" onclick="removeBuilderSection(${sIdx})">✕ Remove Section</button>
        </div>
        <div class="builder-form-group">
          <label class="builder-label">Section Title</label>
          <input class="builder-input" value="${sect.title || ''}" placeholder="e.g. Module 1: Core Basics" oninput="updateSectionTitle(${sIdx}, this.value)">
        </div>
        
        <div style="margin-left: 14px; padding-left: 10px; border-left: 2px solid var(--border);">
          ${itemsHtml}
          <div style="display:flex; gap:10px;">
            <button class="builder-add-btn" onclick="addBuilderLesson(${sIdx})">📖 Add Lesson</button>
            <button class="builder-add-btn" style="border-color:var(--accent); color:var(--accent); background:var(--accent-soft);" onclick="addBuilderQuiz(${sIdx})">📝 Add Quiz</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Quiz question elements generator.
 */
function renderQuizQuestions(sIdx, iIdx, questions) {
  if (!questions || questions.length === 0) return '';
  return questions.map((q, qIdx) => `
    <div style="background:var(--surface2); padding:10px; border:1px solid var(--border); border-radius:6px; margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="font-size:12px; font-weight:700;">Question ${qIdx + 1}</span>
        <button class="builder-delete-btn" style="padding:2px 6px;" onclick="removeQuizQuestion(${sIdx}, ${iIdx}, ${qIdx})">✕ Remove</button>
      </div>
      <input class="builder-input" style="font-size:13px; margin-bottom:6px;" value="${q.q || ''}" placeholder="Question text..." oninput="updateQuestionValue(${sIdx}, ${iIdx}, ${qIdx}, 'q', this.value)">
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
        <input class="builder-input" style="font-size:12px;" value="${q.options?.[0] || ''}" placeholder="Option A" oninput="updateOptionValue(${sIdx}, ${iIdx}, ${qIdx}, 0, this.value)">
        <input class="builder-input" style="font-size:12px;" value="${q.options?.[1] || ''}" placeholder="Option B" oninput="updateOptionValue(${sIdx}, ${iIdx}, ${qIdx}, 1, this.value)">
        <input class="builder-input" style="font-size:12px;" value="${q.options?.[2] || ''}" placeholder="Option C" oninput="updateOptionValue(${sIdx}, ${iIdx}, ${qIdx}, 2, this.value)">
        <input class="builder-input" style="font-size:12px;" value="${q.options?.[3] || ''}" placeholder="Option D" oninput="updateOptionValue(${sIdx}, ${iIdx}, ${qIdx}, 3, this.value)">
      </div>

      <div style="display:flex; gap:10px; align-items:center; margin-bottom:6px;">
        <span style="font-size:11px; font-weight:600; color:var(--text2);">Correct Answer:</span>
        <select class="builder-input" style="width:70px; padding:4px;" onchange="updateQuestionValue(${sIdx}, ${iIdx}, ${qIdx}, 'correct', parseInt(this.value))">
          <option value="0" ${q.correct === 0 ? 'selected' : ''}>A</option>
          <option value="1" ${q.correct === 1 ? 'selected' : ''}>B</option>
          <option value="2" ${q.correct === 2 ? 'selected' : ''}>C</option>
          <option value="3" ${q.correct === 3 ? 'selected' : ''}>D</option>
        </select>
      </div>

      <input class="builder-input" style="font-size:12px;" value="${q.explanation || ''}" placeholder="Explanation (Optional)..." oninput="updateQuestionValue(${sIdx}, ${iIdx}, ${qIdx}, 'explanation', this.value)">
    </div>
  `).join('');
}

// ============================================================
// MUTATIONS & STATE updates
// ============================================================

function updateMeta(field, val) {
  if (field.startsWith('publisher.')) {
    const key = field.split('.')[1];
    builderCourse.publisher[key] = val;
  } else {
    builderCourse[field] = val;
  }
  updateBuilderPreview();
}

function addBuilderSection() {
  builderCourse.sections.push({
    title: '',
    lessons: []
  });
  renderBuilderSections();
  updateBuilderPreview();
}

function removeBuilderSection(sIdx) {
  builderCourse.sections.splice(sIdx, 1);
  renderBuilderSections();
  updateBuilderPreview();
}

function updateSectionTitle(sIdx, val) {
  builderCourse.sections[sIdx].title = val;
  updateBuilderPreview();
}

function addBuilderLesson(sIdx) {
  const count = getLessonsCount() + 1;
  builderCourse.sections[sIdx].lessons.push({
    id: `${builderCourse.id || 'course'}-lesson-${count}`,
    no: count,
    title: '',
    duration: '',
    types: ['notes'],
    videoId: '',
    audioFile: '',
    notes: '',
    keyPoints: [],
    code: ''
  });
  renderBuilderSections();
  updateBuilderPreview();
}

function addBuilderQuiz(sIdx) {
  const count = getQuizzesCount() + 1;
  builderCourse.sections[sIdx].lessons.push({
    id: `${builderCourse.id || 'course'}-quiz-${count}`,
    title: '',
    duration: '5 questions',
    types: ['quiz'],
    isQuiz: true,
    passMark: 70,
    questions: []
  });
  renderBuilderSections();
  updateBuilderPreview();
}

function removeBuilderItem(sIdx, iIdx) {
  builderCourse.sections[sIdx].lessons.splice(iIdx, 1);
  recalculateLessonNumbers();
  renderBuilderSections();
  updateBuilderPreview();
}

function updateItemValue(sIdx, iIdx, key, val) {
  const item = builderCourse.sections[sIdx].lessons[iIdx];
  item[key] = val;
  
  // Auto-sync types
  if (key === 'videoId' || key === 'audioFile') {
    const types = ['notes'];
    if (item.videoId) types.push('video');
    if (item.audioFile) types.push('audio');
    item.types = types;
  }
  updateBuilderPreview();
}

// Keypoints helpers
function addKeyPoint(sIdx, iIdx) {
  const item = builderCourse.sections[sIdx].lessons[iIdx];
  if (!item.keyPoints) item.keyPoints = [];
  item.keyPoints.push('');
  renderBuilderSections();
  updateBuilderPreview();
}

function updateKeyPoint(sIdx, iIdx, pIdx, val) {
  builderCourse.sections[sIdx].lessons[iIdx].keyPoints[pIdx] = val;
  updateBuilderPreview();
}

function removeKeyPoint(sIdx, iIdx, pIdx) {
  builderCourse.sections[sIdx].lessons[iIdx].keyPoints.splice(pIdx, 1);
  renderBuilderSections();
  updateBuilderPreview();
}

// Quiz questions helpers
function addQuizQuestion(sIdx, iIdx) {
  const item = builderCourse.sections[sIdx].lessons[iIdx];
  if (!item.questions) item.questions = [];
  item.questions.push({
    q: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: ''
  });
  renderBuilderSections();
  updateBuilderPreview();
}

function updateQuestionValue(sIdx, iIdx, qIdx, key, val) {
  builderCourse.sections[sIdx].lessons[iIdx].questions[qIdx][key] = val;
  updateBuilderPreview();
}

function updateOptionValue(sIdx, iIdx, qIdx, oIdx, val) {
  builderCourse.sections[sIdx].lessons[iIdx].questions[qIdx].options[oIdx] = val;
  updateBuilderPreview();
}

function removeQuizQuestion(sIdx, iIdx, qIdx) {
  builderCourse.sections[sIdx].lessons[iIdx].questions.splice(qIdx, 1);
  renderBuilderSections();
  updateBuilderPreview();
}

// Helpers
function getLessonsCount() {
  return builderCourse.sections.reduce((s, sect) => s + sect.lessons.filter(l => !l.isQuiz).length, 0);
}

function getQuizzesCount() {
  return builderCourse.sections.reduce((s, sect) => s + sect.lessons.filter(l => l.isQuiz).length, 0);
}

function recalculateLessonNumbers() {
  let count = 0;
  builderCourse.sections.forEach(sect => {
    sect.lessons.forEach(item => {
      if (!item.isQuiz) {
        count++;
        item.no = count;
      }
    });
  });
}

function updateBuilderPreview() {
  // Sync count fields
  builderCourse.totalLessons = getLessonsCount();
  builderCourse.quizzesCount = getQuizzesCount();

  const preview = document.getElementById('json-preview');
  if (preview) {
    preview.textContent = JSON.stringify(builderCourse, null, 2);
  }
}

/**
 * Downloads the courses.json config locally.
 */
function downloadBuilderConfig() {
  const data = JSON.stringify(builderCourse, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `course-${builderCourse.id || 'untitled'}.json`;
  a.click();
}

/**
 * Copies generated JSON config code block to clipboard.
 */
function copyBuilderConfig() {
  const code = JSON.stringify(builderCourse, null, 2);
  navigator.clipboard.writeText(code).then(() => {
    showToast('📋 JSON copied to clipboard!');
  });
}

// ============================================================
// GITHUB PR PUBLISHING FLOW
// ============================================================

async function publishCoursePR() {
  const owner = document.getElementById('git-owner').value.trim();
  const repo = document.getElementById('git-repo').value.trim();
  const pat = document.getElementById('git-pat').value.trim();
  const statusEl = document.getElementById('git-sync-status');

  if (!builderCourse.id) { showToast('⚠️ Please enter a unique Course ID'); return; }
  if (!owner || !repo || !pat) { showToast('⚠️ Owner, Repository, and GitHub PAT are required'); return; }

  // Save config values to cache
  localStorage.setItem('df_git_owner', owner);
  localStorage.setItem('df_git_repo', repo);
  localStorage.setItem('df_git_pat', pat);

  if (statusEl) {
    statusEl.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <span>Preparing PR. Connecting to GitHub...</span>
      </div>`;
  }

  try {
    const headers = {
      'Authorization': `token ${pat}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    // 1. Fetch current learn/courses.json from main branch
    let fileSha = null;
    let currentCoursesList = [];
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/learn/courses.json`;
    
    const fileRes = await fetch(fileUrl, { headers });
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      fileSha = fileData.sha;
      const decoded = atob(fileData.content.replace(/\s/g, ''));
      currentCoursesList = JSON.parse(decoded);
    } else if (fileRes.status !== 404) {
      throw new Error(`Failed to load courses.json from GitHub (${fileRes.status})`);
    }

    // 2. Validate Course ID duplicate and overwrite check
    const isOverwriting = currentCoursesList.some(c => c.id === builderCourse.id);
    const isAdmin = typeof ADMIN_CREATORS !== 'undefined' && ADMIN_CREATORS.includes(state.userEmail);

    if (isOverwriting && !isAdmin) {
      throw new Error(`Overwriting blocked. Course ID '${builderCourse.id}' already exists. Only Administrators can modify existing courses.`);
    }

    // 3. Append or update course in array
    if (isOverwriting) {
      // Admin update
      const idx = currentCoursesList.findIndex(c => c.id === builderCourse.id);
      currentCoursesList[idx] = builderCourse;
    } else {
      // Append new
      currentCoursesList.push(builderCourse);
    }

    const updatedJsonString = JSON.stringify(currentCoursesList, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(updatedJsonString)));

    // 4. Retrieve Main branch reference sha
    const mainRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`, { headers });
    if (!mainRefRes.ok) throw new Error(`Could not find main branch reference (${mainRefRes.status})`);
    const mainRefData = await mainRefRes.json();
    const mainSha = mainRefData.object.sha;

    // 5. Create a new branch
    const branchName = `add-course-${builderCourse.id}-${Date.now()}`;
    const createBranchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: mainSha
      })
    });
    if (!createBranchRes.ok) {
      const err = await createBranchRes.json();
      throw new Error(`Failed to create branch on repository: ${err.message}`);
    }

    // 6. Commit the updated courses.json file to the new branch
    const commitRes = await fetch(fileUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Add course: ${builderCourse.title} by ${builderCourse.publisher.name}`,
        content: base64Content,
        sha: fileSha || undefined, // undefined if creating courses.json first time
        branch: branchName
      })
    });
    if (!commitRes.ok) {
      const err = await commitRes.json();
      throw new Error(`Failed to commit file courses.json: ${err.message}`);
    }

    // 7. Create Pull Request
    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `📚 Add Course: ${builderCourse.title}`,
        body: `### Course Submission details:\n- **Course ID**: \`${builderCourse.id}\`\n- **Title**: ${builderCourse.title}\n- **Publisher**: ${builderCourse.publisher.name} (${builderCourse.publisher.email})\n- **Estimated Duration**: ${builderCourse.estimatedHours} hrs\n- **Lessons Count**: ${builderCourse.totalLessons}\n\n*Created visually via BeCreator Course Builder*`,
        head: branchName,
        base: 'main'
      })
    });
    if (!prRes.ok) {
      const err = await prRes.json();
      throw new Error(`Failed to open Pull Request: ${err.message}`);
    }

    const prData = await prRes.json();
    
    // 8. Render success message with PR link
    if (statusEl) {
      statusEl.innerHTML = `
        <div style="background:var(--green-soft); border: 1px solid var(--green); color:var(--green); border-radius:8px; padding:16px; margin-top: 14px;">
          <div style="font-size:16px; font-weight:700; margin-bottom:6px;">🎉 Pull Request Created Successfully!</div>
          <div style="font-size:13px; line-height:1.6; margin-bottom:12px;">Your course files have been committed to branch <code>${branchName}</code>. Review and merge the Pull Request on GitHub to go live.</div>
          <a class="btn btn-success btn-sm" href="${prData.html_url}" target="_blank" style="text-decoration:none;">View Pull Request on GitHub ↗</a>
        </div>`;
    }
    showToast('🎉 Course submitted! PR created.');

  } catch (error) {
    if (statusEl) {
      statusEl.innerHTML = `
        <div style="background:var(--red-soft); border: 1px solid var(--red); color:var(--red); border-radius:8px; padding:16px; margin-top: 14px;">
          <div style="font-size:14px; font-weight:700; margin-bottom:4px;">❌ PR Sync Failed</div>
          <div style="font-size:12px; line-height:1.5;">${error.message}</div>
        </div>`;
    }
    showToast('❌ Failed to create Pull Request');
    console.error(error);
  }
}
