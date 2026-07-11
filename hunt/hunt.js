// ============================================================
// JOB FINDER (HUNT) PLATFORM ENGINE
// ============================================================

function saveHuntFormState() {
  if (typeof state === 'undefined') return;
  state.hunt = {
    title: document.getElementById('h-title').value.trim(),
    location: document.getElementById('h-location').value.trim(),
    skills: document.getElementById('h-skills').value.trim(),
    level: document.getElementById('h-level').value,
    workType: document.getElementById('h-workType').value,
    experience: document.getElementById('h-experience').value.trim()
  };
  if (typeof saveState === 'function') saveState();
}

function loadHuntFormState() {
  if (typeof state === 'undefined' || !state.hunt) return;
  const h = state.hunt;
  
  const titleEl = document.getElementById('h-title');
  const locEl = document.getElementById('h-location');
  const skillsEl = document.getElementById('h-skills');
  const levelEl = document.getElementById('h-level');
  const workEl = document.getElementById('h-workType');
  const expEl = document.getElementById('h-experience');
  
  if (titleEl) titleEl.value = h.title || '';
  if (locEl) locEl.value = h.location || '';
  if (skillsEl) skillsEl.value = h.skills || '';
  if (levelEl) levelEl.value = h.level || '';
  if (workEl) workEl.value = h.workType || '';
  if (expEl) expEl.value = h.experience || '';
}

async function searchJobsFromHunt() {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Please configure your Gemini API Key in Settings first.');
    } else {
      alert('Please configure your Gemini API Key in Settings first.');
    }
    return;
  }

  // Ensure state is saved before searching
  saveHuntFormState();

  const jobTitle = document.getElementById('h-title').value.trim();
  const location = document.getElementById('h-location').value.trim();
  const skills = document.getElementById('h-skills').value.trim();
  const level = document.getElementById('h-level').value;
  const workType = document.getElementById('h-workType').value;
  const experience = document.getElementById('h-experience').value.trim();

  if (!jobTitle && !skills && !experience) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Please fill in at least a target role, skills, or experience summary.');
    }
    return;
  }

  // Toggle loading state
  const statusDiv = document.getElementById('hunt-status');
  const resultsDiv = document.getElementById('hunt-results');
  if (statusDiv) statusDiv.style.display = 'block';
  if (resultsDiv) resultsDiv.style.display = 'none';
  
  const statusText = document.getElementById('hunt-status-text');
  if (statusText) statusText.innerHTML = '<div class="spinner" style="margin:0 auto 10px"></div>Searching Google for active job boards...';

  const prompt = `You are a professional job search assistant. Using Google Search grounding, find REAL, CURRENT job openings that match this candidate profile. Search major job boards (like Greenhouse, Lever, LinkedIn, Indeed) and company career pages.

CANDIDATE PROFILE:
- Target Role: ${jobTitle || 'Not specified'}
- Location Preference: ${location || 'Flexible / Remote'}
- Experience Level: ${level || 'Not specified'}
- Work Type: ${workType || 'Any'}
- Skills: ${skills || 'Not specified'}
- Experience Summary: ${experience || 'Not provided'}

YOUR TASK:
1. Search for actual current job openings matching this profile.
2. Find 6-10 real job listings with actual details.
3. For each job, provide a match score (0-100) based on how well it fits the candidate's profile.
4. Also write a brief 2-sentence profile analysis.

Respond ONLY with valid JSON in this exact format (no markdown, no backticks, no extra text):
{
  "analysis": "2-sentence analysis of the profile and market fit.",
  "jobs": [
    {
      "title": "Job title",
      "company": "Company name",
      "location": "City, Country or Remote",
      "workType": "Remote/Hybrid/On-site",
      "salary": "Salary range or null",
      "description": "Description of the role and fit.",
      "skills": ["skill1", "skill2"],
      "matchScore": 85,
      "applyUrl": "https://actual-job-url.com",
      "postedDate": "Recent",
      "source": "LinkedIn"
    }
  ]
}`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error ${response.status}`);
    }

    if (statusText) statusText.innerHTML = '<div class="spinner" style="margin:0 auto 10px"></div>Analyzing matches and scores...';

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No candidate responses returned from Gemini.');
    
    const fullText = (candidate.content?.parts || []).map(p => p.text || '').join('\n');
    if (!fullText) throw new Error('Empty text content received.');

    // Parse JSON - clean markdown formatting if present
    const cleanJson = fullText.replace(/```json|```/g, '').trim();
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON payload returned in text.');

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.jobs || !Array.isArray(parsed.jobs)) {
      throw new Error('Malformed jobs structure received.');
    }

    renderHuntResults(parsed);
  } catch(e) {
    console.error(e);
    if (typeof showToast === 'function') {
      showToast('❌ Job Search Error: ' + e.message);
    } else {
      alert('Job Search Error: ' + e.message);
    }
  } finally {
    if (statusDiv) statusDiv.style.display = 'none';
  }
}

function renderHuntResults(data) {
  const resultsDiv = document.getElementById('hunt-results');
  const jobsList = document.getElementById('hunt-jobs-list');
  const countBadge = document.getElementById('hunt-count-badge');
  const analysisCard = document.getElementById('hunt-analysis-card');
  const analysisText = document.getElementById('hunt-analysis-text');

  if (!resultsDiv || !jobsList || !countBadge) return;

  resultsDiv.style.display = 'block';
  countBadge.textContent = `${data.jobs.length} found`;

  if (data.analysis && analysisCard && analysisText) {
    analysisCard.style.display = 'block';
    analysisText.textContent = data.analysis;
  } else if (analysisCard) {
    analysisCard.style.display = 'none';
  }

  jobsList.innerHTML = '';
  
  // Sort by match score descending
  const sortedJobs = data.jobs.sort((a,b) => (b.matchScore || 0) - (a.matchScore || 0));

  sortedJobs.forEach(job => {
    const score = job.matchScore || 0;
    const scoreClass = score >= 75 ? 'hunt-match-high' : score >= 50 ? 'hunt-match-mid' : 'hunt-match-low';
    
    const skillsTags = (job.skills || []).slice(0, 4).map(s => 
      `<span class="hunt-tag">${escapeHtml(s)}</span>`
    ).join('');

    const jobCard = document.createElement('div');
    jobCard.className = 'hunt-job-card';
    jobCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px">
        <div class="hunt-job-title">${escapeHtml(job.title)}</div>
        <span class="hunt-match-badge ${scoreClass}">● ${score}% match</span>
      </div>
      <div class="hunt-job-meta">
        <span class="hunt-meta-item">🏢 ${escapeHtml(job.company)}</span>
        <span class="hunt-meta-item">📍 ${escapeHtml(job.location || 'Flexible')}</span>
        ${job.workType ? `<span class="hunt-meta-item">💻 ${escapeHtml(job.workType)}</span>` : ''}
        ${job.salary ? `<span class="hunt-meta-item">💰 ${escapeHtml(job.salary)}</span>` : ''}
      </div>
      <div class="hunt-job-desc">${escapeHtml(job.description || '')}</div>
      ${skillsTags ? `<div class="hunt-job-tags">${skillsTags}</div>` : ''}
      <div class="hunt-job-footer">
        <span style="font-size:11px;color:var(--text3)">via ${escapeHtml(job.source || 'Web')} · ${escapeHtml(job.postedDate || 'Recent')}</span>
        ${job.applyUrl && job.applyUrl !== 'null' && job.applyUrl !== '' ? `
          <a class="hunt-apply-link" href="${escapeHtml(job.applyUrl)}" target="_blank" rel="noopener">Apply ↗</a>
        ` : ''}
      </div>
    `;
    jobsList.appendChild(jobCard);
  });

  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function openHuntApp() {
  const mainApp = document.getElementById('app');
  if (mainApp) mainApp.style.display = 'none';
  const learnApp = document.getElementById('learn-app');
  if (learnApp) learnApp.style.display = 'none';
  const builderApp = document.getElementById('add-course-app');
  if (builderApp) builderApp.style.display = 'none';
  
  const huntApp = document.getElementById('hunt-app');
  if (huntApp) huntApp.style.display = 'flex';
  
  loadHuntFormState();
}

// Global exposure in case of direct onclick routing calls
window.openHuntApp = openHuntApp;
window.closeHuntApp = closeHuntApp;

function closeHuntApp() {
  const huntApp = document.getElementById('hunt-app');
  if (huntApp) huntApp.style.display = 'none';
  const mainApp = document.getElementById('app');
  if (mainApp) mainApp.style.display = 'block';
}

// Setup persistence listeners
function initHuntListeners() {
  const fields = ['h-title', 'h-location', 'h-skills', 'h-level', 'h-workType', 'h-experience'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', saveHuntFormState);
      el.addEventListener('change', saveHuntFormState);
    }
  });
  
  loadHuntFormState();
  
  const container = document.getElementById('hunt-app');
  if (container) {
    container.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') searchJobsFromHunt();
    });
  }
}

// Fallback or early execution
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHuntListeners);
} else {
  initHuntListeners();
}
