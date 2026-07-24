// Thoughts Status Generator Feature Logic

const THOUGHTS_IMAGES = [
  'thoughts/images/bg1.jpg',
  'thoughts/images/bg2.jpg',
  'thoughts/images/bg3.jpg',
  'thoughts/images/bg4.jpg',
  'thoughts/images/bg5.jpg',
  'thoughts/images/bg6.jpg',
  'thoughts/images/bg7.jpg',
  'thoughts/images/bg8.jpg',
  'thoughts/images/bg9.jpg',
  'thoughts/images/bg10.jpg',
  'thoughts/images/bg11.jpg'
];

const THOUGHTS_VIDEOS = [
  'thoughts/videos/vid1.mp4',
  'thoughts/videos/vid3.mp4',
  'thoughts/videos/vid5.mp4',
  'thoughts/videos/vid6.mp4',
  'thoughts/videos/vid7.mp4'
];

const THOUGHTS_AUDIOS = {
  focus1: 'thoughts/audio/focus1.mp3',
  focus2: 'thoughts/audio/focus2.mp3'
};

// State representation
let thoughtsState = {
  text: 'Hustle in silence, let success make the noise.',
  bgType: 'image', // 'image' or 'video'
  bgIndex: 0,
  font: 'Merriweather',
  fontSize: 42,
  color: '#ffffff',
  align: 'center',
  valign: 50, // 0 - 100
  overlay: 40, // 0 - 100
  aspect: '1-1', // '1-1' or '9-16'
  audio: 'none' // 'none', 'vid', 'focus1', 'focus2'
};

// DOM references and elements
let thoughtsCanvas = null;
let thoughtsCtx = null;
let hiddenVideoElement = null;
let bgImageCache = {};
let drawLoopActive = false;
let audioContextInstance = null;
let audioSourceNode = null;
let audioDestNode = null;
let customAudioPlayer = null;

// Initialize panel and UI bindings
function initThoughtsPanel() {
  thoughtsCanvas = document.getElementById('thoughts-canvas');
  if (!thoughtsCanvas) return;
  thoughtsCtx = thoughtsCanvas.getContext('2d');
  
  // Set up hidden video element
  if (!hiddenVideoElement) {
    hiddenVideoElement = document.createElement('video');
    hiddenVideoElement.crossOrigin = 'anonymous';
    hiddenVideoElement.loop = true;
    hiddenVideoElement.muted = true;
    hiddenVideoElement.playsInline = true;
    
    hiddenVideoElement.addEventListener('play', () => {
      if (!drawLoopActive) {
        drawLoopActive = true;
        requestAnimationFrame(runThoughtsDrawLoop);
      }
    });
  }

  // Load state values from global state if exists
  if (state.lastThoughtsState) {
    thoughtsState = { ...thoughtsState, ...state.lastThoughtsState };
  }
  
  // Pre-load default assets
  loadBackgroundImage(thoughtsState.bgIndex);

  // Set values to inputs
  setThoughtsUIValues();
  bindThoughtsListeners();
  
  // Trigger initial render
  updateThoughtsCanvasDimensions();
  triggerThoughtsRender();

  // Setup vertical canvas dragging
  setupCanvasDragging();
}

function setThoughtsUIValues() {
  document.getElementById('t-input').value = thoughtsState.text;
  document.getElementById('t-font').value = thoughtsState.font;
  document.getElementById('t-size').value = thoughtsState.fontSize;
  document.getElementById('t-valign').value = thoughtsState.valign;
  document.getElementById('t-overlay').value = thoughtsState.overlay;
  document.getElementById('t-audio').value = thoughtsState.audio;

  // Active ratio tab
  document.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-ratio') === thoughtsState.aspect);
  });

  const wrapper = document.querySelector('.thoughts-canvas-wrapper');
  if (wrapper) {
    wrapper.className = `thoughts-canvas-wrapper ratio-${thoughtsState.aspect}`;
  }

  // Active media tab
  document.querySelectorAll('.media-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === thoughtsState.bgType);
  });

  // Render media grid
  renderMediaPickerGrid();

  // Active color circle
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.toggle('active', opt.getAttribute('data-color') === thoughtsState.color);
  });

  // Active align button
  document.querySelectorAll('.align-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-align') === thoughtsState.align);
  });
}

function bindThoughtsListeners() {
  // Input text
  document.getElementById('t-input').addEventListener('input', (e) => {
    thoughtsState.text = e.target.value;
    triggerThoughtsRender();
    saveThoughtsConfig();
  });

  // Font family
  document.getElementById('t-font').addEventListener('change', (e) => {
    thoughtsState.font = e.target.value;
    triggerThoughtsRender();
    saveThoughtsConfig();
  });

  // Font size
  document.getElementById('t-size').addEventListener('input', (e) => {
    thoughtsState.fontSize = parseInt(e.target.value);
    triggerThoughtsRender();
    saveThoughtsConfig();
  });

  // Vertical Align slider
  document.getElementById('t-valign').addEventListener('input', (e) => {
    thoughtsState.valign = parseInt(e.target.value);
    triggerThoughtsRender();
    saveThoughtsConfig();
  });

  // Overlay transparency slider
  document.getElementById('t-overlay').addEventListener('input', (e) => {
    thoughtsState.overlay = parseInt(e.target.value);
    triggerThoughtsRender();
    saveThoughtsConfig();
  });

  // Audio track picker
  document.getElementById('t-audio').addEventListener('change', (e) => {
    thoughtsState.audio = e.target.value;
    handleAmbientAudioPlayback();
    saveThoughtsConfig();
  });
}

// Handle aspect ratios
function selectThoughtsRatio(ratio) {
  thoughtsState.aspect = ratio;
  const wrapper = document.querySelector('.thoughts-canvas-wrapper');
  if (wrapper) {
    wrapper.className = `thoughts-canvas-wrapper ratio-${ratio}`;
  }
  document.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-ratio') === ratio);
  });
  
  updateThoughtsCanvasDimensions();
  triggerThoughtsRender();
  saveThoughtsConfig();
}

// Handle media tabs
function selectMediaTab(tabType) {
  thoughtsState.bgType = tabType;
  thoughtsState.bgIndex = 0; // reset index when changing type
  
  document.querySelectorAll('.media-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabType);
  });

  renderMediaPickerGrid();
  
  if (tabType === 'video') {
    loadBackgroundVideo(0);
  } else {
    hiddenVideoElement.pause();
    loadBackgroundImage(0);
  }
  
  triggerThoughtsRender();
  saveThoughtsConfig();
}

function renderMediaPickerGrid() {
  const grid = document.getElementById('thoughts-media-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const list = thoughtsState.bgType === 'image' ? THOUGHTS_IMAGES : THOUGHTS_VIDEOS;
  
  // Prepend "Add Own Image" button if image tab is active
  if (thoughtsState.bgType === 'image') {
    const uploadItem = document.createElement('div');
    const userImg = bgImageCache['user_upload'];
    
    uploadItem.className = `media-item ${thoughtsState.bgIndex === 'user_upload' ? 'active' : ''}`;
    uploadItem.onclick = () => {
      document.getElementById('t-file-input').click();
    };

    if (userImg) {
      uploadItem.innerHTML = `<img src="${userImg.src}">`;
    } else {
      uploadItem.style.display = 'flex';
      uploadItem.style.alignItems = 'center';
      uploadItem.style.justifyContent = 'center';
      uploadItem.style.background = 'rgba(255,255,255,0.05)';
      uploadItem.style.border = '1px dashed rgba(255,255,255,0.2)';
      uploadItem.innerHTML = `<div style="font-size: 16px; font-weight: bold; color: rgba(255,255,255,0.6)">➕</div>`;
    }
    grid.appendChild(uploadItem);
  }

  list.forEach((path, index) => {
    const item = document.createElement('div');
    item.className = `media-item ${thoughtsState.bgIndex === index ? 'active' : ''}`;
    item.onclick = () => selectMediaItem(index);

    if (thoughtsState.bgType === 'image') {
      item.innerHTML = `<img src="${path}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect width=%22100%%22 height=%22100%%22 fill=%22%232c3e50%22/><text x=%2250%%22 y=%2250%%22 fill=%22%23fff%22 font-size=%2211%22 font-family=%22sans-serif%22 text-anchor=%22middle%22 dy=%22.3em%22>Img ${index+1}</text></svg>'">`;
    } else {
      item.innerHTML = `
        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#2c3e50;color:#fff;font-size:10px;font-weight:700">
          📹 Vid ${index+1}
        </div>
      `;
    }
    grid.appendChild(item);
  });
}

function selectMediaItem(index) {
  thoughtsState.bgIndex = index;

  if (thoughtsState.bgType === 'image') {
    loadBackgroundImage(index);
  } else {
    loadBackgroundVideo(index);
  }

  triggerThoughtsRender();
  saveThoughtsConfig();
  renderMediaPickerGrid();
}

function selectThoughtsColor(color) {
  thoughtsState.color = color;
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.toggle('active', opt.getAttribute('data-color') === color);
  });
  triggerThoughtsRender();
  saveThoughtsConfig();
}

function selectThoughtsAlign(align) {
  thoughtsState.align = align;
  document.querySelectorAll('.align-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-align') === align);
  });
  triggerThoughtsRender();
  saveThoughtsConfig();
}

// Media loaders
function loadBackgroundImage(index) {
  if (index === 'user_upload') return;
  const path = THOUGHTS_IMAGES[index];
  if (bgImageCache[path]) return;

  const img = new Image();
  img.src = path;
  img.onload = () => {
    bgImageCache[path] = img;
    triggerThoughtsRender();
  };
  img.onerror = () => {
    // If local file is missing, construct canvas fallback image dynamically
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 800;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0,0,800,800);
    grad.addColorStop(0, '#111827');
    grad.addColorStop(1, '#312e81');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,800,800);
    
    const fallbackImg = new Image();
    fallbackImg.src = canvas.toDataURL();
    fallbackImg.onload = () => {
      bgImageCache[path] = fallbackImg;
      triggerThoughtsRender();
    };
  };
}

function loadBackgroundVideo(index) {
  const path = THOUGHTS_VIDEOS[index];
  hiddenVideoElement.src = path;
  
  // Set muted state matching state
  hiddenVideoElement.muted = thoughtsState.audio !== 'vid';
  
  hiddenVideoElement.load();
  hiddenVideoElement.play().catch(e => {
    console.warn('Video autoplay block. Waiting for user interaction.', e);
  });
}

function handleAmbientAudioPlayback() {
  // Clear any existing local music players
  if (customAudioPlayer) {
    customAudioPlayer.pause();
    customAudioPlayer = null;
  }

  // Adjust video element audio settings
  if (thoughtsState.bgType === 'video' && hiddenVideoElement) {
    hiddenVideoElement.muted = thoughtsState.audio !== 'vid';
  }

  // Play custom audio if needed
  if (thoughtsState.audio.startsWith('focus')) {
    const audioPath = THOUGHTS_AUDIOS[thoughtsState.audio];
    customAudioPlayer = new Audio(audioPath);
    customAudioPlayer.loop = true;
    customAudioPlayer.play().catch(e => {
      console.warn('Audio playback blocked.', e);
    });
  }
}

// Save configuration state
function saveThoughtsConfig() {
  state.lastThoughtsState = thoughtsState;
  saveState();
}

function updateThoughtsCanvasDimensions() {
  if (!thoughtsCanvas) return;
  
  if (thoughtsState.aspect === '1-1') {
    thoughtsCanvas.width = 1080;
    thoughtsCanvas.height = 1080;
  } else {
    thoughtsCanvas.width = 1080;
    thoughtsCanvas.height = 1920;
  }
}

function triggerThoughtsRender() {
  if (thoughtsState.bgType === 'image') {
    renderCanvasFrame();
  }
}

function runThoughtsDrawLoop() {
  if (thoughtsState.bgType === 'video' && hiddenVideoElement && !hiddenVideoElement.paused) {
    renderCanvasFrame();
    requestAnimationFrame(runThoughtsDrawLoop);
  } else {
    drawLoopActive = false;
  }
}

// Main compositing pipeline
function renderCanvasFrame() {
  if (!thoughtsCanvas || !thoughtsCtx) return;
  
  const w = thoughtsCanvas.width;
  const h = thoughtsCanvas.height;
  
  // 1. Draw Background (Image or Video Frame)
  let backgroundDrawn = false;
  
  if (thoughtsState.bgType === 'image') {
    let img = null;
    if (thoughtsState.bgIndex === 'user_upload') {
      img = bgImageCache['user_upload'];
    } else {
      img = bgImageCache[THOUGHTS_IMAGES[thoughtsState.bgIndex]];
    }
    if (img) {
      drawCoverImage(img, w, h);
      backgroundDrawn = true;
    }
  } else if (thoughtsState.bgType === 'video') {
    if (hiddenVideoElement.readyState >= 2) {
      drawCoverImage(hiddenVideoElement, w, h);
      backgroundDrawn = true;
    }
  }
  
  // Fallback dark gradient if asset loading
  if (!backgroundDrawn) {
    const grad = thoughtsCtx.createLinearGradient(0,0,w,h);
    grad.addColorStop(0, '#1f2937');
    grad.addColorStop(1, '#111827');
    thoughtsCtx.fillStyle = grad;
    thoughtsCtx.fillRect(0,0,w,h);
  }
  
  // 2. Draw Dark Overlay Opacity
  thoughtsCtx.fillStyle = `rgba(0, 0, 0, ${thoughtsState.overlay / 100})`;
  thoughtsCtx.fillRect(0, 0, w, h);
  
  // 3. Draw Watermark (Bottom centered - Permanent)
  thoughtsCtx.font = '600 24px Inter, sans-serif';
  thoughtsCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  thoughtsCtx.textAlign = 'center';
  thoughtsCtx.fillText('becreator.online', w / 2, h - 80);
  
  // 4. Draw Wrapped Quote Text
  if (thoughtsState.text.trim().length > 0) {
    thoughtsCtx.fillStyle = thoughtsState.color;
    thoughtsCtx.textAlign = thoughtsState.align;
    
    // Subtle premium text shadow
    thoughtsCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    thoughtsCtx.shadowBlur = 10;
    thoughtsCtx.shadowOffsetX = 2;
    thoughtsCtx.shadowOffsetY = 2;
    
    const fontStr = `${thoughtsState.fontSize * 1.5}px "${thoughtsState.font}", serif`;
    thoughtsCtx.font = fontStr;
    
    const maxTextWidth = w - 160; // 80px side margins
    const lines = wrapCanvasText(thoughtsCtx, thoughtsState.text.trim(), maxTextWidth);
    
    const lineHeight = thoughtsState.fontSize * 2.2;
    const totalHeight = lines.length * lineHeight;
    
    // Calculate vertical starting position based on slider
    const startY = (h - totalHeight) * (thoughtsState.valign / 100) + lineHeight / 2;
    
    // Draw Glassmorphic Transparent White Card Background
    const cardPaddingX = 40;
    const cardPaddingY = 30;
    const cardW = maxTextWidth + cardPaddingX * 2;
    const cardH = totalHeight - lineHeight + (thoughtsState.fontSize * 1.3) + cardPaddingY * 2;
    const cardX = (w - cardW) / 2;
    const cardY = startY - thoughtsState.fontSize - cardPaddingY;
    
    thoughtsCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    thoughtsCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    thoughtsCtx.lineWidth = 2;
    
    // Drop shadow on card itself (subtle)
    thoughtsCtx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    thoughtsCtx.shadowBlur = 15;
    thoughtsCtx.shadowOffsetY = 6;
    
    drawRoundedRect(thoughtsCtx, cardX, cardY, cardW, cardH, 16);
    
    // Reset shadow for text drawing
    thoughtsCtx.shadowColor = 'transparent';
    thoughtsCtx.shadowBlur = 0;
    thoughtsCtx.shadowOffsetY = 0;

    // Restore text color fillStyle (Fix for ignored text color!)
    thoughtsCtx.fillStyle = thoughtsState.color;

    lines.forEach((line, index) => {
      let x = w / 2;
      if (thoughtsState.align === 'left') x = 120;
      if (thoughtsState.align === 'right') x = w - 120;
      
      thoughtsCtx.fillText(line, x, startY + (index * lineHeight));
    });
    
    // Reset shadow parameters
    thoughtsCtx.shadowColor = 'transparent';
    thoughtsCtx.shadowBlur = 0;
    thoughtsCtx.shadowOffsetX = 0;
    thoughtsCtx.shadowOffsetY = 0;
  }
}

// Centered Cover fitting helper
function drawCoverImage(media, targetW, targetH) {
  const mediaW = media.videoWidth || media.naturalWidth || media.width;
  const mediaH = media.videoHeight || media.naturalHeight || media.height;
  
  if (!mediaW || !mediaH) return;
  
  const aspectMedia = mediaW / mediaH;
  const aspectTarget = targetW / targetH;
  
  let sourceX, sourceY, sourceW, sourceH;
  
  if (aspectMedia > aspectTarget) {
    sourceH = mediaH;
    sourceW = mediaH * aspectTarget;
    sourceX = (mediaW - sourceW) / 2;
    sourceY = 0;
  } else {
    sourceW = mediaW;
    sourceH = mediaW / aspectTarget;
    sourceX = 0;
    sourceY = (mediaH - sourceH) / 2;
  }
  
  try {
    thoughtsCtx.drawImage(media, sourceX, sourceY, sourceW, sourceH, 0, 0, targetW, targetH);
  } catch (e) {
    console.error('Canvas drawImage failed:', e);
  }
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Trigger local JPG snapshot save
function downloadThoughtsImage() {
  if (!thoughtsCanvas) return;
  
  // Re-draw once to ensure current frame matches
  renderCanvasFrame();
  
  const dataUrl = thoughtsCanvas.toDataURL('image/jpeg', 0.95);
  
  // Convert DataURL to Blob for sharing
  fetch(dataUrl)
    .then(res => res.blob())
    .then(blob => {
      const file = new File([blob], `thought_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Try native share API first (supports iOS share sheet directly!)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: 'Thoughts status card'
        }).catch(err => {
          // If share cancelled or failed, fall back to modal overlay
          console.log('Share dismissed, loading fallback modal.', err);
          openThoughtsExportModal(dataUrl, 'image');
        });
      } else {
        // Fallback for browsers that don't support file sharing
        openThoughtsExportModal(dataUrl, 'image');
      }
    })
    .catch(err => {
      console.error('Blob conversion failed, loading fallback modal.', err);
      openThoughtsExportModal(dataUrl, 'image');
    });
}

// MediaRecorder canvas status video compilation
function downloadThoughtsVideo() {
  if (!thoughtsCanvas) return;
  
  const overlay = document.getElementById('record-progress-overlay');
  const bar = document.getElementById('record-progress-bar');
  if (overlay && bar) {
    overlay.style.display = 'flex';
    bar.style.width = '0%';
  }
  
  // Establish Web Audio API pipeline if audio is enabled
  let recorderStream = null;
  let canvasStream = thoughtsCanvas.captureStream(30); // 30 FPS
  
  let audioTracks = [];
  let isRecordingAudio = false;

  try {
    // If audio is configured, set up sound recording
    if (thoughtsState.audio !== 'none') {
      const activeAudioElement = thoughtsState.audio === 'vid' ? hiddenVideoElement : customAudioPlayer;
      
      if (activeAudioElement) {
        // Ensure browser AudioContext is running
        if (!audioContextInstance) {
          audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume context in case it was suspended
        if (audioContextInstance.state === 'suspended') {
          audioContextInstance.resume();
        }

        // Create Web Audio Node route
        audioDestNode = audioContextInstance.createMediaStreamDestination();
        audioSourceNode = audioContextInstance.createMediaElementSource(activeAudioElement);
        
        // Route audio both to speaker (destination) and recorder stream (destNode)
        audioSourceNode.connect(audioContextInstance.destination);
        audioSourceNode.connect(audioDestNode);
        
        audioTracks = audioDestNode.stream.getAudioTracks();
        isRecordingAudio = audioTracks.length > 0;
      }
    }
  } catch (e) {
    console.warn('Audio capture failed. Exporting silent status.', e);
  }

  // Combine canvas video track + Web Audio track (if any)
  const tracks = [...canvasStream.getVideoTracks(), ...audioTracks];
  recorderStream = new MediaStream(tracks);

  // Pick suitable browser codecs (webm falling back to mp4 / default)
  let options = { mimeType: 'video/webm;codecs=vp9' };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: 'video/webm;codecs=vp8' };
  }
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: 'video/webm' };
  }
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = {}; // use browser default
  }

  let chunks = [];
  let mediaRecorder = null;
  
  try {
    mediaRecorder = new MediaRecorder(recorderStream, options);
  } catch (e) {
    console.error('MediaRecorder initialization failed:', e);
    showToast('❌ Export failed: MediaRecorder is not supported in this browser.');
    if (overlay) overlay.style.display = 'none';
    return;
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    const videoBlob = new Blob(chunks, { type: 'video/webm' });
    const videoUrl = URL.createObjectURL(videoBlob);
    const file = new File([videoBlob], `thought_${Date.now()}.webm`, { type: 'video/webm' });
    
    // Try native share API first (supports iOS share sheet directly!)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: 'Thoughts status video loop'
      }).then(() => {
        if (overlay) overlay.style.display = 'none';
      }).catch(err => {
        // If share cancelled or failed, fall back to modal overlay
        console.log('Share dismissed, loading fallback modal.', err);
        openThoughtsExportModal(videoUrl, 'video');
        if (overlay) overlay.style.display = 'none';
      });
    } else {
      // Fallback for browsers that don't support file sharing
      openThoughtsExportModal(videoUrl, 'video');
      if (overlay) overlay.style.display = 'none';
    }

    // Auto-Sync to Google Drive if logged in
    saveThoughtsVideoToGoogleDrive(videoBlob);
    
    showToast('🎥 Video loop compiled!');
  };

  // Start recording
  mediaRecorder.start();
  
  // Progress tracker interval (5 seconds status duration)
  const duration = 5000;
  const start = Date.now();
  
  const timer = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.min(100, (elapsed / duration) * 100);
    
    if (bar) bar.style.width = `${pct}%`;
    
    if (elapsed >= duration) {
      clearInterval(timer);
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    }
  }, 100);
}

// Google Drive Sync Uploader
async function saveThoughtsVideoToGoogleDrive(videoBlob) {
  if (typeof isGoogleDriveLoggedIn !== 'function' || !isGoogleDriveLoggedIn()) {
    console.log('Google Drive is not logged in. Skipping background sync.');
    return;
  }

  const filename = `thought_${Date.now()}.webm`;
  
  try {
    // 1. Create or get /BeCreator/Thoughts/ folder
    const beCreatorFolderId = await getOrCreateDriveFolder('BeCreator');
    if (!beCreatorFolderId) return;

    const thoughtsFolderId = await getOrCreateDriveSubfolder('Thoughts', beCreatorFolderId);
    if (!thoughtsFolderId) return;

    // 2. Upload video blob
    await uploadBlobToDriveFolder(filename, videoBlob, thoughtsFolderId);
    showToast('☁️ Backed up video status to Drive!');
  } catch (err) {
    console.error('Error syncing thoughts video to Drive:', err);
  }
}

// Save thought to state history database
function saveThoughtToDatabase() {
  if (thoughtsState.text.trim().length === 0) {
    showToast('⚠️ Cannot save an empty thought.');
    return;
  }

  const d = state.selectedDate;
  state.thoughts = state.thoughts || {};
  state.thoughts[d] = state.thoughts[d] || [];
  
  // Prevent duplicate additions
  const currentText = thoughtsState.text.trim();
  if (!state.thoughts[d].includes(currentText)) {
    state.thoughts[d].push(currentText);
    saveState();
    showToast('💾 Thought saved to today\'s history!');
  } else {
    showToast('💡 This thought is already in today\'s history.');
  }
}

function toggleThoughtsDrawer(drawerId) {
  const drawer = document.getElementById('drawer-' + drawerId);
  const btn = document.querySelector(`.toolbar-btn[data-drawer="${drawerId}"]`);
  const wasOpen = drawer && drawer.style.display === 'flex';
  
  closeAllThoughtsDrawers();
  
  if (drawer && !wasOpen) {
    drawer.style.display = 'flex';
    if (btn) btn.classList.add('active');
  }
}

function closeAllThoughtsDrawers() {
  document.querySelectorAll('.thoughts-floating-drawer').forEach(d => {
    d.style.display = 'none';
  });
  document.querySelectorAll('.toolbar-btn').forEach(b => {
    b.classList.remove('active');
  });
}

let isDraggingText = false;

function setupCanvasDragging() {
  if (!thoughtsCanvas) return;

  const startDrag = (e) => {
    isDraggingText = true;
    updateDragPosition(e);
  };

  const moveDrag = (e) => {
    if (!isDraggingText) return;
    updateDragPosition(e);
  };

  const stopDrag = () => {
    isDraggingText = false;
  };

  thoughtsCanvas.addEventListener('mousedown', startDrag);
  thoughtsCanvas.addEventListener('mousemove', moveDrag);
  window.addEventListener('mouseup', stopDrag);

  // Mobile touch support
  thoughtsCanvas.addEventListener('touchstart', (e) => {
    startDrag(e);
    e.preventDefault();
  }, { passive: false });

  thoughtsCanvas.addEventListener('touchmove', (e) => {
    moveDrag(e);
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('touchend', stopDrag);
}

function updateDragPosition(e) {
  if (!thoughtsCanvas) return;
  const rect = thoughtsCanvas.getBoundingClientRect();
  const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  
  const relY = (clientY - rect.top) / rect.height;
  const pct = Math.round(relY * 100);
  
  thoughtsState.valign = Math.max(15, Math.min(85, pct));
  
  const slider = document.getElementById('t-valign');
  if (slider) slider.value = thoughtsState.valign;
  
  triggerThoughtsRender();
  saveThoughtsConfig();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function handleUserImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      bgImageCache['user_upload'] = img;
      thoughtsState.bgType = 'image';
      thoughtsState.bgIndex = 'user_upload';
      
      triggerThoughtsRender();
      saveThoughtsConfig();
      renderMediaPickerGrid();
      showToast('🖼️ Custom background image loaded!');
    };
  };
  reader.readAsDataURL(file);
}

function openThoughtsExportModal(mediaUrl, type) {
  const container = document.getElementById('export-modal-preview-container');
  if (container) {
    if (type === 'image') {
      container.innerHTML = `<img src="${mediaUrl}" alt="Thought Snapshot">`;
    } else {
      container.innerHTML = `<video src="${mediaUrl}" loop autoplay muted playsinline controls></video>`;
    }
  }
  
  const downloadBtn = document.getElementById('export-modal-direct-download');
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.download = `thought_${Date.now()}.${type === 'image' ? 'jpg' : 'webm'}`;
      link.href = mediaUrl;
      link.click();
    };
  }

  // Set iPhone-specific vs Desktop/Android instructions dynamically
  const instructions = document.getElementById('export-instructions');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (instructions) {
    if (isIOS) {
      if (type === 'image') {
        instructions.innerHTML = `<strong>📱 iPhone Instructions:</strong> Press and hold (long-press) on the image above and select <strong>"Add to Photos"</strong> to save it directly to your camera roll.`;
      } else {
        instructions.innerHTML = `<strong>📱 iPhone Instructions:</strong><br>1. Tap <strong>"Direct Download"</strong> below.<br>2. Open your iPhone's native <strong>Files app</strong>.<br>3. Go to the <strong>Downloads</strong> folder and tap the video.<br>4. Tap the <strong>Share button</strong> (bottom-left) and select <strong>"Save Video"</strong> to move it to your photos.`;
      }
    } else {
      if (type === 'image') {
        instructions.innerHTML = `<strong>💡 Save Instructions:</strong> Press and hold (long-press) the image above to save, or click the download button below.`;
      } else {
        instructions.innerHTML = `<strong>💡 Save Instructions:</strong> Click <strong>"Direct Download File"</strong> below to download the status video.`;
      }
    }
  }
  
  // Open the export modal
  const modal = document.getElementById('thoughts-export-modal');
  if (modal) modal.style.display = 'flex';
}

function closeThoughtsExportModal() {
  const modal = document.getElementById('thoughts-export-modal');
  if (modal) modal.style.display = 'none';
  const container = document.getElementById('export-modal-preview-container');
  if (container) container.innerHTML = '';
}

function handleThoughtsDownload() {
  if (thoughtsState.bgType === 'image') {
    downloadThoughtsImage();
  } else {
    downloadThoughtsVideo();
  }
}

function renderThoughtsPanelUI() {
  return `
    <div class="thoughts-container unified-view">
      <!-- Full Viewport Area -->
      <div class="thoughts-viewport">
        <!-- Floating Ratio Controls -->
        <div class="ratio-selector">
          <button class="ratio-btn active" data-ratio="1-1" onclick="selectThoughtsRatio('1-1')">1:1</button>
          <button class="ratio-btn" data-ratio="9-16" onclick="selectThoughtsRatio('9-16')">9:16</button>
        </div>
        
        <!-- Centered Mobile Canvas Frame -->
        <div class="thoughts-canvas-wrapper ratio-1-1">
          <canvas id="thoughts-canvas"></canvas>
          <div class="recording-progress-overlay" id="record-progress-overlay">
            <h3 style="font-size:14px;font-weight:700;margin-bottom:4px">🎥 Compiling Status Video...</h3>
            <div class="progress-track">
              <div class="progress-bar" id="record-progress-bar"></div>
            </div>
            <p style="font-size: 10px; margin-top: 6px; color: #aaa">Please wait. Recording takes 5 seconds.</p>
          </div>
        </div>

        <!-- Floating Glassmorphic Side Toolbar (Icons Only) -->
        <div class="thoughts-floating-toolbar">
          <button class="toolbar-btn" data-drawer="content" onclick="toggleThoughtsDrawer('content')" title="Your Thought">✍️</button>
          <button class="toolbar-btn" data-drawer="style" onclick="toggleThoughtsDrawer('style')" title="Layout & Style">🎨</button>
          <button class="toolbar-btn" data-drawer="background" onclick="toggleThoughtsDrawer('background')" title="Background Canvas">🖼️</button>
          <button class="toolbar-btn" data-drawer="audio" onclick="toggleThoughtsDrawer('audio')" title="Sound Track">🎵</button>
          <div class="toolbar-separator"></div>
          <button class="toolbar-btn action" onclick="saveThoughtToDatabase()" title="Save to History">💾</button>
          <button class="toolbar-btn action" onclick="handleThoughtsDownload()" title="Download Status">⬇️</button>
        </div>

        <!-- Floating Drawers Overlay -->
        <!-- Drawer 1: Text Content -->
        <div class="thoughts-floating-drawer" id="drawer-content">
          <div class="drawer-header">
            <span>✍️ Your Thought</span>
            <button class="drawer-close" onclick="closeAllThoughtsDrawers()">×</button>
          </div>
          <div class="drawer-body">
            <div class="thoughts-group">
              <label>Quote / Thought</label>
              <textarea id="t-input" class="input transparent-input" rows="3" placeholder="Type your thought here..."></textarea>
            </div>
          </div>
        </div>

        <!-- Hidden File Input for Custom Background Image -->
        <input type="file" id="t-file-input" accept="image/*" style="display:none" onchange="handleUserImageUpload(event)">

        <!-- Drawer 2: Typography & Styling -->
        <div class="thoughts-floating-drawer" id="drawer-style">
          <div class="drawer-header">
            <span>🎨 Layout & Style</span>
            <button class="drawer-close" onclick="closeAllThoughtsDrawers()">×</button>
          </div>
          <div class="drawer-body">
            <div class="thoughts-row">
              <div class="thoughts-group">
                <label>Font</label>
                <select id="t-font" class="input transparent-input">
                  <option value="Merriweather">Serif</option>
                  <option value="Inter">Sans</option>
                  <option value="Playfair Display">Elegant</option>
                  <option value="Caveat">Handwritten</option>
                </select>
              </div>
              <div class="thoughts-group">
                <label>Size</label>
                <input type="range" id="t-size" min="20" max="96" value="42" class="slider">
              </div>
            </div>

            <div class="thoughts-row">
              <div class="thoughts-group">
                <label>Position</label>
                <input type="range" id="t-valign" min="10" max="90" value="50" class="slider">
              </div>
              <div class="thoughts-group">
                <label>Overlay Tint</label>
                <input type="range" id="t-overlay" min="0" max="90" value="40" class="slider">
              </div>
            </div>

            <div class="thoughts-row">
              <div class="thoughts-group">
                <label>Align</label>
                <div class="alignment-picker transparent-picker">
                  <button class="align-btn" data-align="left" onclick="selectThoughtsAlign('left')">L</button>
                  <button class="align-btn active" data-align="center" onclick="selectThoughtsAlign('center')">C</button>
                  <button class="align-btn" data-align="right" onclick="selectThoughtsAlign('right')">R</button>
                </div>
              </div>
              <div class="thoughts-group">
                <label>Color</label>
                <div class="color-picker-row">
                  <div class="color-option active" data-color="#ffffff" style="background:#ffffff;" onclick="selectThoughtsColor('#ffffff')"></div>
                  <div class="color-option" data-color="#ffd700" style="background:#ffd700;" onclick="selectThoughtsColor('#ffd700')"></div>
                  <div class="color-option" data-color="#fbcfe8" style="background:#fbcfe8;" onclick="selectThoughtsColor('#fbcfe8')"></div>
                  <div class="color-option" data-color="#000000" style="background:#000000;" onclick="selectThoughtsColor('#000000')"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Drawer 3: Background Canvas -->
        <div class="thoughts-floating-drawer" id="drawer-background">
          <div class="drawer-header">
            <span>🖼️ Background</span>
            <button class="drawer-close" onclick="closeAllThoughtsDrawers()">×</button>
          </div>
          <div class="drawer-body">
            <div class="media-tabs transparent-tabs">
              <div class="media-tab active" data-tab="image" onclick="selectMediaTab('image')">Images</div>
              <div class="media-tab" data-tab="video" onclick="selectMediaTab('video')">Videos</div>
            </div>
            <div class="media-grid" id="thoughts-media-grid"></div>
          </div>
        </div>

        <!-- Drawer 4: Soundtrack Selection -->
        <div class="thoughts-floating-drawer" id="drawer-audio">
          <div class="drawer-header">
            <span>🎵 Sound</span>
            <button class="drawer-close" onclick="closeAllThoughtsDrawers()">×</button>
          </div>
          <div class="drawer-body">
            <div class="thoughts-group">
              <label>Track</label>
              <select id="t-audio" class="input transparent-input">
                <option value="none">🔇 None</option>
                <option value="vid">🔊 Video Sound</option>
                <option value="focus1">🎵 Lofi Track 1</option>
                <option value="focus2">🎵 Lofi Track 2</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      <!-- Export Modal Overlay (For mobile gallery saves) -->
      <div class="thoughts-modal" id="thoughts-export-modal">
        <div class="thoughts-modal-content">
          <div class="thoughts-modal-header">
            <span>📥 Save to Gallery</span>
            <button class="thoughts-modal-close" onclick="closeThoughtsExportModal()">×</button>
          </div>
          <div class="thoughts-modal-body">
            <p id="export-instructions" style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:12px;text-align:center;line-height:1.4"></p>
            <div id="export-modal-preview-container" style="width:100%;display:flex;justify-content:center;margin-bottom:16px"></div>
            <button class="btn btn-primary btn-full" id="export-modal-direct-download" style="font-size:12px;width:100%">📥 Direct Download File</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
