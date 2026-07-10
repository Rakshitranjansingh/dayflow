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
  const contentWrap = document.getElementById('learn-app-content');
  if (!contentWrap) return;

  // Retrieve state or fallback
  const enrollments = state.learning?.enrollments || {};
  const enrolled = Object.values(enrollments).filter(e => e.enrolled).length;
  const completed = Object.values(enrollments).filter(e => e.progress >= 100).length;
  const streak = Math.max(...Object.values(enrollments).map(e => e.streak || 0), 0);

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

  contentWrap.innerHTML = `
    <!-- HERO -->
    <div class="learn-hero">
      <div class="learn-hero-label">DayFlow Learn</div>
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

      <!-- Java -->
      <div class="learn-course-card" id="learn-card-java">
        <div class="learn-course-banner">☕</div>
        <div class="learn-course-body">
          <div class="learn-course-header">
            <div class="learn-course-title" style="color: var(--orange);">Java Development</div>
            ${javaBadgeHtml}
          </div>
          <div class="learn-course-desc">Master Java from basics to advanced. Variables, OOP, Collections, and more.</div>
          <div class="learn-course-meta">
            <span>📚 12 lessons</span>
            <span>📝 3 quizzes</span>
            <span>⏱️ ~4 hrs</span>
          </div>
          ${javaProgressHtml}
          <div class="learn-course-footer">
            ${javaProgressTextHtml}
            ${javaBtnHtml}
          </div>
        </div>
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
    // Already enrolled — navigate to the course directory page
    window.location.href = `learn/Java/index.html`;
  } else {
    // Launch enrollment overlay modal
    pendingLearnCourse = courseId;
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

  state.learning.enrollments[pendingLearnCourse] = {
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
    const alreadyExists = skillCat.items?.find(i => i.name === '☕ Study Java');
    if (!alreadyExists) {
      skillCat.items.push({ id: 'learn-java', name: '☕ Study Java', done: {} });
    }
  }

  saveState();
  closeLearnModal();
  renderLearnContent();
  updateLearnBadge();

  if (typeof showToast === 'function') {
    showToast('✅ Enrolled! Starting Java journey...');
  }
  
  setTimeout(() => {
    window.location.href = `learn/Java/index.html`;
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
  const java = state.learning?.enrollments?.java;
  const badge = document.getElementById('learn-badge');
  if (!badge) return;

  if (!java?.enrolled) {
    badge.style.display = 'none';
    return;
  }

  badge.style.display = 'block';
  badge.textContent = `${java.progress || 0}%`;
}
