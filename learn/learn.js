function syncLearnState() {
  try {
    let raw = localStorage.getItem('becreator_v1') || localStorage.getItem('dayflow_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.learning) {
        if (typeof state !== 'undefined') {
          if (!state.learning) state.learning = { enrollments: {} };
          state.learning.enrollments = { ...state.learning.enrollments, ...parsed.learning.enrollments };
        }
      }
    }
  } catch(e) {}

    // Backup state sync directly from java_at_a_glance_done_v1
  try {
    const javaRefDoneStr = localStorage.getItem('java_at_a_glance_done_v1');
    if (javaRefDoneStr) {
      const parsedProgress = JSON.parse(javaRefDoneStr);
      if (parsedProgress && typeof parsedProgress === 'object') {
        if (typeof state !== 'undefined') {
          if (!state.learning) state.learning = { enrollments: {} };
          if (!state.learning.enrollments) state.learning.enrollments = {};
          
          const dsRead = Object.keys(parsedProgress.ds || {}).filter(k=>parsedProgress.ds[k]).length;
          const algoRead = Object.keys(parsedProgress.algo || {}).filter(k=>parsedProgress.algo[k]).length;
          const cheatsheetRead = parsedProgress.cheatsheet ? 1 : 0;
          const readTotal = dsRead + algoRead + cheatsheetRead;
          const pct = Math.round((readTotal / 24) * 100);
          
          const existing = state.learning.enrollments.java_at_a_glance || {};
          state.learning.enrollments.java_at_a_glance = {
            enrolled: true,
            enrolledDate: existing.enrolledDate || new Date().toISOString().split('T')[0],
            completed: Object.keys(parsedProgress.ds || {}).filter(k=>parsedProgress.ds[k]).concat(Object.keys(parsedProgress.algo || {}).filter(k=>parsedProgress.algo[k])),
            progress: pct,
            lastStudied: existing.lastStudied || new Date().toISOString()
          };
        }
      }
    }
  } catch(e) {}

  // Backup state sync directly from blind75_done_v1
  try {
    const b75DoneStr = localStorage.getItem('blind75_done_v1');
    if (b75DoneStr) {
      const doneArr = JSON.parse(b75DoneStr);
      if (Array.isArray(doneArr)) {
        if (typeof state !== 'undefined') {
          if (!state.learning) state.learning = { enrollments: {} };
          if (!state.learning.enrollments) state.learning.enrollments = {};
          
          const existing = state.learning.enrollments.blind75 || {};
          const pct = Math.round((doneArr.length / 75) * 100);
          state.learning.enrollments.blind75 = {
            enrolled: true,
            enrolledDate: existing.enrolledDate || new Date().toISOString().split('T')[0],
            completed: doneArr,
            progress: pct,
            lastStudied: existing.lastStudied || new Date().toISOString()
          };
        }
      }
    }
  } catch(e) {}
}

// ============================================================
// DAYFLOW LEARN PLATFORM ENGINE
// ============================================================

let pendingLearnCourse = null;

/**
 * Hides the main dashboard and opens the full-screen Learn platform page.
 */
function openLearnApp() {
  // Hide main app container
  const mainApp = document.getElementById('app');
  if (mainApp) mainApp.style.display = 'none';

  // Show learn app container
  const learnApp = document.getElementById('learn-app');
  if (learnApp) {
    learnApp.style.display = 'flex';
  }

  // Render content
  renderLearnContent();
}

/**
 * Closes the full-screen Learn platform page and returns to the main dashboard.
 */
function closeLearnApp() {
  // Hide learn app container
  const learnApp = document.getElementById('learn-app');
  if (learnApp) learnApp.style.display = 'none';

  // Show main app container
  const mainApp = document.getElementById('app');
  if (mainApp) mainApp.style.display = 'block';

  // Clear query parameters in the address bar if present
  if (window.location.search.includes('page=learn') || window.location.search.includes('panel=learn')) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  // Refresh progress badge on dashboard platform icon
  updateLearnBadge();
}

/**
 * Renders the HTML content for the Learn courses hub dynamically based on state.
 */
function renderLearnContent() {
  syncLearnState();
  const contentWrap = document.getElementById('learn-app-content');
  if (!contentWrap) return;

  // Retrieve state or fallback
  const enrollments = state.learning?.enrollments || {};
  const enrolled = Object.values(enrollments).filter(e => e.enrolled).length;
  const completed = Object.values(enrollments).filter(e => e.progress >= 100).length;
  const streak = Math.max(...Object.values(enrollments).map(e => e.streak || 0), 0);

  // Java Course State
  const javaEnrollment = enrollments.java;
  let javaBadgeHtml = '<span class="learn-course-badge learn-badge-new" id="learn-badge-java">New</span>';
  let javaBtnHtml = '<button class="learn-enroll-btn learn-btn-enroll" id="learn-btn-java" onclick="handleCourseAction(\'java\')">Enroll Free</button>';
  let javaProgressHtml = `
    <div class="learn-course-progress" id="learn-progress-java" style="display:none">
      <div class="learn-course-progress-fill" id="learn-progress-fill-java" style="width:0%"></div>
    </div>
  `;
  let javaProgressTextHtml = '<span class="learn-course-progress-text" id="learn-progress-text-java"></span>';

  if (javaEnrollment?.enrolled) {
    const done = javaEnrollment.completed?.length || 0;
    const progressVal = javaEnrollment.progress || 0;
    javaBadgeHtml = '<span class="learn-course-badge learn-badge-enrolled" id="learn-badge-java">✅ Enrolled</span>';
    javaBtnHtml = '<button class="learn-enroll-btn learn-btn-continue" id="learn-btn-java" onclick="handleCourseAction(\'java\')">Continue →</button>';
    javaProgressHtml = `
      <div class="learn-course-progress" id="learn-progress-java" style="display:block">
        <div class="learn-course-progress-fill" id="learn-progress-fill-java" style="width:${progressVal}%"></div>
      </div>
    `;
    javaProgressTextHtml = `<span class="learn-course-progress-text" id="learn-progress-text-java">${done}/12 lessons · ${progressVal}%</span>`;
  }

  // Java at a glance Course State
  const javaRefEnrollment = enrollments.java_at_a_glance;
  let javaRefBadgeHtml = '<span class="learn-course-badge learn-badge-new" id="learn-badge-java_at_a_glance">New</span>';
  let javaRefBtnHtml = '<button class="learn-enroll-btn learn-btn-enroll" id="learn-btn-java_at_a_glance" onclick="handleCourseAction(\'java_at_a_glance\')">Enroll Free</button>';
  let javaRefProgressHtml = `
    <div class="learn-course-progress" id="learn-progress-java_at_a_glance" style="display:none">
      <div class="learn-course-progress-fill" id="learn-progress-fill-java_at_a_glance" style="width:0%"></div>
    </div>
  `;
  let javaRefProgressTextHtml = '<span class="learn-course-progress-text" id="learn-progress-text-java_at_a_glance"></span>';

  if (javaRefEnrollment?.enrolled) {
    const done = javaRefEnrollment.completed?.length || 0;
    const progressVal = javaRefEnrollment.progress || 0;
    javaRefBadgeHtml = '<span class="learn-course-badge learn-badge-enrolled" id="learn-badge-java_at_a_glance">✅ Enrolled</span>';
    javaRefBtnHtml = '<button class="learn-enroll-btn learn-btn-continue" id="learn-btn-java_at_a_glance" onclick="handleCourseAction(\'java_at_a_glance\')">Continue →</button>';
    javaRefProgressHtml = `
      <div class="learn-course-progress" id="learn-progress-java_at_a_glance" style="display:block">
        <div class="learn-course-progress-fill" id="learn-progress-fill-java_at_a_glance" style="width:${progressVal}%"></div>
      </div>
    `;
    javaRefProgressTextHtml = `<span class="learn-course-progress-text" id="learn-progress-text-java_at_a_glance">${done} items read · ${progressVal}%</span>`;
  }

  // Blind 75 Course State
  const b75Enrollment = enrollments.blind75;
  let b75BadgeHtml = '<span class="learn-course-badge learn-badge-new" id="learn-badge-blind75">New</span>';
  let b75BtnHtml = '<button class="learn-enroll-btn learn-btn-enroll" id="learn-btn-blind75" onclick="handleCourseAction(\'blind75\')">Enroll Free</button>';
  let b75ProgressHtml = `
    <div class="learn-course-progress" id="learn-progress-blind75" style="display:none">
      <div class="learn-course-progress-fill" id="learn-progress-fill-blind75" style="width:0%"></div>
    </div>
  `;
  let b75ProgressTextHtml = '<span class="learn-course-progress-text" id="learn-progress-text-blind75"></span>';

  if (b75Enrollment?.enrolled) {
    const done = b75Enrollment.completed?.length || 0;
    const progressVal = b75Enrollment.progress || 0;
    b75BadgeHtml = '<span class="learn-course-badge learn-badge-enrolled" id="learn-badge-blind75">✅ Enrolled</span>';
    b75BtnHtml = '<button class="learn-enroll-btn learn-btn-continue" id="learn-btn-blind75" onclick="handleCourseAction(\'blind75\')">Continue →</button>';
    b75ProgressHtml = `
      <div class="learn-course-progress" id="learn-progress-blind75" style="display:block">
        <div class="learn-course-progress-fill" id="learn-progress-fill-blind75" style="width:${progressVal}%"></div>
      </div>
    `;
    b75ProgressTextHtml = `<span class="learn-course-progress-text" id="learn-progress-text-blind75">${done}/75 problems · ${progressVal}%</span>`;
  }

  contentWrap.innerHTML = `
    <!-- HERO -->
    <div class="learn-hero">
      <div class="learn-hero-label">BeCreator Learn</div>
      <div class="learn-hero-title">Level up your skills</div>
      <div class="learn-hero-sub">Structured learning paths with video, audio & quizzes. Track your progress automatically.</div>
      <div class="learn-hero-stats">
        <div class="learn-hero-stat">
          <div class="learn-hero-stat-val">${enrolled}</div>
          <div class="learn-hero-stat-lbl">Enrolled</div>
        </div>
        <div class="learn-hero-stat">
          <div class="learn-hero-stat-val">${completed}</div>
          <div class="learn-hero-stat-lbl">Completed</div>
        </div>
        <div class="learn-hero-stat">
          <div class="learn-hero-stat-val">${streak}${streak > 0 ? '🔥' : ''}</div>
          <div class="learn-hero-stat-lbl">Streak</div>
        </div>
      </div>
    </div>

    <!-- COURSES -->
    <div class="learn-section">
      <div class="learn-section-title">Available Courses</div>

      <!-- Blind 75 (Java) -->
      <!-- Java at a glance -->
      <div class="learn-course-card" id="learn-card-java_at_a_glance">
        <div class="learn-course-banner" style="background: linear-gradient(135deg, #FF9A3C 0%, #FF6B6B 100%); color: #fff;">☕</div>
        <div class="learn-course-body">
          <div class="learn-course-header">
            <div class="learn-course-title" style="color: var(--orange);">Java at a glance</div>
            ${javaRefBadgeHtml}
          </div>
          <div class="learn-course-desc">Master Java DSA references, data structures, algorithm patterns, complexity cheatsheet, and interview Q&A.</div>
          <div class="learn-course-meta">
            <span>📦 Data Structures</span>
            <span>⚙️ Algo Patterns</span>
            <span>🧠 Quiz & Interview</span>
          </div>
          ${javaRefProgressHtml}
          <div class="learn-course-footer">
            ${javaRefProgressTextHtml}
            ${javaRefBtnHtml}
          </div>
        </div>
      </div>

      
      <div class="learn-course-card" id="learn-card-blind75">
        <div class="learn-course-banner" style="background: linear-gradient(135deg, #6C63FF 0%, #2D6BE4 100%); color: #fff;">🎯</div>
        <div class="learn-course-body">
          <div class="learn-course-header">
            <div class="learn-course-title" style="color: var(--accent);">Blind 75 (DSA in Java)</div>
            ${b75BadgeHtml}
          </div>
          <div class="learn-course-desc">Master 75 essential LeetCode Data Structures & Algorithms problems with production-ready Java solutions.</div>
          <div class="learn-course-meta">
            <span>🎯 75 problems</span>
            <span>🏷️ 10 categories</span>
            <span>☕ Java</span>
          </div>
          ${b75ProgressHtml}
          <div class="learn-course-footer">
            ${b75ProgressTextHtml}
            ${b75BtnHtml}
          </div>
        </div>
      </div>

      <!-- Java (Disabled for now) -->
      </div>
    </div>
  `;
}

/**
 * Route button clicks or launch the enrollment modal.
 */
function handleCourseAction(courseId) {
  const enrollment = state.learning?.enrollments?.[courseId];
  if (enrollment?.enrolled) {
        if (courseId === 'java_at_a_glance') {
      if (modalIcon) modalIcon.textContent = '☕';
      if (modalTitle) modalTitle.textContent = 'Java at a glance';
      if (modalSub) modalSub.textContent = 'Complete Java DSA reference, key methods, time complexities, algorithm patterns, and bonus interview Q&A.';
      if (modalStats) {
        modalStats.innerHTML = `
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">5</div><div class="learn-modal-stat-lbl">Sections</div></div>
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">24</div><div class="learn-modal-stat-lbl">Topics</div></div>
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">Free</div><div class="learn-modal-stat-lbl">Cost</div></div>
        `;
      }
    } else if (courseId === 'blind75') {
      window.location.href = `learn/blind75/index.html`;
    } else if (courseId === 'java_at_a_glance') {
      window.location.href = `learn/java-at-a-glance/index.html`;
    } else {
      window.location.href = `learn/java-at-a-glance/index.html`;
    }
  } else {
    // Launch enrollment overlay modal
    pendingLearnCourse = courseId;
    const modalIcon = document.getElementById('learn-modal-icon');
    const modalTitle = document.getElementById('learn-modal-title');
    const modalSub = document.getElementById('learn-modal-sub');
    const modalStats = document.getElementById('learn-modal-stats');

        if (courseId === 'java_at_a_glance') {
      if (modalIcon) modalIcon.textContent = '☕';
      if (modalTitle) modalTitle.textContent = 'Java at a glance';
      if (modalSub) modalSub.textContent = 'Complete Java DSA reference, key methods, time complexities, algorithm patterns, and bonus interview Q&A.';
      if (modalStats) {
        modalStats.innerHTML = `
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">5</div><div class="learn-modal-stat-lbl">Sections</div></div>
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">24</div><div class="learn-modal-stat-lbl">Topics</div></div>
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">Free</div><div class="learn-modal-stat-lbl">Cost</div></div>
        `;
      }
    } else if (courseId === 'blind75') {
      if (modalIcon) modalIcon.textContent = '🎯';
      if (modalTitle) modalTitle.textContent = 'Blind 75 (DSA in Java)';
      if (modalSub) modalSub.textContent = 'Master the 75 most essential LeetCode Data Structures & Algorithms problems with full Java solutions.';
      if (modalStats) {
        modalStats.innerHTML = `
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">75</div><div class="learn-modal-stat-lbl">Problems</div></div>
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">10</div><div class="learn-modal-stat-lbl">Topics</div></div>
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">Free</div><div class="learn-modal-stat-lbl">Cost</div></div>
        `;
      }
    } else {
      if (modalIcon) modalIcon.textContent = '☕';
      if (modalTitle) modalTitle.textContent = 'Java Development';
      if (modalSub) modalSub.textContent = 'Start your Java learning journey today. Track your progress, earn streaks, and get certified.';
      if (modalStats) {
        modalStats.innerHTML = `
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">12</div><div class="learn-modal-stat-lbl">Lessons</div></div>
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">3</div><div class="learn-modal-stat-lbl">Quizzes</div></div>
          <div class="learn-modal-stat"><div class="learn-modal-stat-val">Free</div><div class="learn-modal-stat-lbl">Cost</div></div>
        `;
      }
    }

    const modal = document.getElementById('learn-enroll-modal');
    if (modal) modal.classList.add('show');
  }
}

/**
 * Confirms user enrollment, creates the course state, adds a study habit, and navigates.
 */
function confirmLearnEnroll() {
  if (!pendingLearnCourse) return;

  // Initialize learning state structure if needed
  if (!state.learning) state.learning = { enrollments: {} };
  if (!state.learning.enrollments) state.learning.enrollments = {};

  const courseId = pendingLearnCourse;

  state.learning.enrollments[courseId] = {
    enrolled: true,
    enrolledDate: new Date().toISOString().split('T')[0],
    completed: [],
    quizScores: {},
    streak: 0,
    lastStudied: null,
    progress: 0,
    totalTimeMin: 0,
    certificateUnlocked: false
  };

  // Auto-add studying to habits list
  if (!state.habits) state.habits = { categories: [] };
  const skillCat = state.habits.categories?.find(c => c.id === 'skill');
  if (skillCat) {
    const habitName = courseId === 'blind75' ? '🎯 Study Blind 75' : '☕ Study Java';
    const habitId = `learn-${courseId}`;
    const alreadyExists = skillCat.items?.find(i => i.id === habitId || i.name === habitName);
    if (!alreadyExists) {
      if (!skillCat.items) skillCat.items = [];
      skillCat.items.push({ id: habitId, name: habitName, done: {} });
    }
  }

  saveState();
  closeLearnModal();
  renderLearnContent();
  updateLearnBadge();

  const isBlind75 = courseId === 'blind75';
  if (typeof showToast === 'function') {
    showToast(`✅ Enrolled! Starting ${isBlind75 ? 'Blind 75' : 'Java'} journey...`);
  }
  
  setTimeout(() => {
    window.location.href = courseId === 'blind75' ? `learn/blind75/index.html` : `learn/java-at-a-glance/index.html`;
  }, 1000);
}

/**
 * Closes the enrollment modal.
 */
function closeLearnModal() {
  const modal = document.getElementById('learn-enroll-modal');
  if (modal) modal.classList.remove('show');
  pendingLearnCourse = null;
}

/**
 * Updates the progress badge on the dashboard platforms button.
 */
function updateLearnBadge() {
  syncLearnState();
  const enrollments = state.learning?.enrollments || {};
  const activeEnrolled = Object.values(enrollments).filter(e => e.enrolled);
  const badge = document.getElementById('learn-badge');
  if (!badge) return;

  if (activeEnrolled.length === 0) {
    badge.style.display = 'none';
    return;
  }

  const maxProgress = Math.max(...activeEnrolled.map(e => e.progress || 0));
  badge.style.display = 'block';
  badge.textContent = `${maxProgress}%`;
}

