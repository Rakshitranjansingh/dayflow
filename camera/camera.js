// ============================================================
// MODULAR CINEMATIC CAMERA SYSTEM ENGINE
// ============================================================
let camState = {
  facingMode: 'user', 
  stream: null, 
  filter: 'none',
  exposure: 100, 
  brightness: 100, 
  saturation: 100,
  locked: false, 
  lockedValues: null, 
  flashOn: false,
  flashColor: '255,255,255', 
  mode: 'photo', 
  recording: false,
  recorder: null, 
  chunks: [], 
  recordStart: 0, 
  recordTimerId: null, 
  drawLoopId: null
};

function openCinematicCamera() {
  const overlay = document.getElementById('camera-viewfinder-overlay');
  if (overlay) overlay.classList.add('open');
  initCinematicEngine();
}

function closeCinematicCamera() {
  if (camState.recording) stopCamRecording();
  if (camState.stream) {
    camState.stream.getTracks().forEach(t => t.stop());
    camState.stream = null;
  }
  if (camState.drawLoopId) {
    cancelAnimationFrame(camState.drawLoopId);
    camState.drawLoopId = null;
  }
  const overlay = document.getElementById('camera-viewfinder-overlay');
  if (overlay) overlay.classList.remove('open');
}

async function initCinematicEngine() {
  const video = document.getElementById('cam-source');
  const canvas = document.getElementById('cam-preview');
  if (!video || !canvas) return;
  const ctx = canvas.getContext('2d');
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true, 
      video: { 
        facingMode: camState.facingMode, 
        // Request highest possible resolution dynamically
        width: { ideal: 3840 }, 
        height: { ideal: 2160 } 
      }
    });
    camState.stream = stream;
    video.srcObject = stream;
    await video.play();
    
    // Configure Canvas aspect ratio to true 9:16 portrait
    const vidW = video.videoWidth || 1920;
    const vidH = video.videoHeight || 1080;
    
    if (vidW > vidH) {
      // Landscape stream input -> center crop 9:16 portrait canvas
      canvas.height = vidH;
      canvas.width = Math.round(vidH * (9 / 16));
    } else {
      // Portrait stream input
      canvas.width = vidW;
      canvas.height = vidH;
    }
    
    function drawLoop() {
      const overlay = document.getElementById('camera-viewfinder-overlay');
      if (!overlay || !overlay.classList.contains('open')) return;
      
      if (video.readyState >= 2) {
        ctx.save();
        const v = camState.locked ? camState.lockedValues : camState;
        
        let baseFilter = '';
        if (camState.filter === 'cinematic') {
          // Hollywood warm vintage look: desaturated, high shadow contrast, subtle warm tint
          baseFilter = 'contrast(1.22) saturate(0.8) sepia(0.12) hue-rotate(-4deg) ';
        } else if (camState.filter === 'ultra8k') {
          // Sharp, vibrant color pop: increased highlights, vivid colors, rich contrast
          baseFilter = 'contrast(1.26) saturate(1.32) brightness(1.04) ';
        } else if (camState.filter === 'podcast') {
          // Studio portrait look: soft shadows, warm glowing skin tones
          baseFilter = 'contrast(1.08) saturate(0.92) brightness(1.06) sepia(0.18) ';
        }
        
        const filterString = `${baseFilter}brightness(${(v.exposure/100) * (v.brightness/100)}) saturate(${v.saturation/100})`;
        ctx.filter = filterString;
        canvas.style.filter = filterString;

        const currentVidW = video.videoWidth || 1920;
        const currentVidH = video.videoHeight || 1080;
        
        let sourceX = 0;
        let sourceY = 0;
        let sourceW = currentVidW;
        let sourceH = currentVidH;
        
        if (currentVidW > currentVidH) {
          // Crop center landscape segment to fit portrait canvas
          sourceW = Math.round(currentVidH * (9 / 16));
          sourceX = Math.round((currentVidW - sourceW) / 2);
        }

        if (camState.facingMode === 'user') {
          ctx.translate(canvas.width, 0); 
          ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        if (camState.filter === 'cinematic') {
          ctx.fillStyle = '#000'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height * 0.065);
          ctx.fillRect(0, canvas.height - (canvas.height * 0.065), canvas.width, canvas.height * 0.065);
        }
      }
      camState.drawLoopId = requestAnimationFrame(drawLoop);
    }
    drawLoop();
  } catch(e) { 
    console.error('Camera initialization failed:', e);
    if (typeof showToast === 'function') showToast("Camera initialization blocked or missing permissions."); 
  }
}

// Bind UI actions cleanly inside the main app execution cycle
document.addEventListener('DOMContentLoaded', () => {
  const switchBtn = document.getElementById('cam-switchBtn');
  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      camState.facingMode = camState.facingMode === 'user' ? 'environment' : 'user';
      if (camState.stream) { 
        camState.stream.getTracks().forEach(t => t.stop()); 
      }
      initCinematicEngine();
    });
  }
  
  document.querySelectorAll('#cam-filterStrip .filterChip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#cam-filterStrip .filterChip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected'); 
      camState.filter = chip.dataset.filter;
    });
  });

  const expInput = document.getElementById('cam-exposure');
  if (expInput) {
    expInput.addEventListener('input', (e) => {
      camState.exposure = e.target.value;
      const valEl = document.getElementById('cam-exposure-val');
      if (valEl) valEl.textContent = e.target.value + '%';
    });
  }
  
  const brightInput = document.getElementById('cam-brightness');
  if (brightInput) {
    brightInput.addEventListener('input', (e) => {
      camState.brightness = e.target.value;
      const valEl = document.getElementById('cam-brightness-val');
      if (valEl) valEl.textContent = e.target.value + '%';
    });
  }
  
  const satInput = document.getElementById('cam-saturation');
  if (satInput) {
    satInput.addEventListener('input', (e) => {
      camState.saturation = e.target.value;
      const valEl = document.getElementById('cam-saturation-val');
      if (valEl) valEl.textContent = e.target.value + '%';
    });
  }

  const lockBtn = document.getElementById('cam-lockBtn');
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      camState.locked = !camState.locked;
      lockBtn.classList.toggle('active', camState.locked);
      const badge = document.getElementById('cam-lockBadge');
      if (badge) badge.style.display = camState.locked ? 'block' : 'none';
      
      if (camState.locked) {
        camState.lockedValues = { 
          exposure: camState.exposure, 
          brightness: camState.brightness, 
          saturation: camState.saturation 
        };
      }
      
      ['cam-exposure', 'cam-brightness', 'cam-saturation'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = camState.locked;
      });
    });
  }

  const flashBtn = document.getElementById('cam-flashBtn');
  if (flashBtn) {
    flashBtn.addEventListener('click', (e) => {
      e.stopPropagation(); 
      const pop = document.getElementById('cam-flashPop');
      if (pop) pop.classList.toggle('show');
    });
    
    flashBtn.addEventListener('dblclick', () => {
      const aura = document.getElementById('cam-flashAura');
      if (aura) aura.classList.remove('on');
      flashBtn.classList.remove('active');
    });
  }

  document.querySelectorAll('#cam-flashPop .swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      camState.flashColor = sw.dataset.color;
      document.documentElement.style.setProperty('--flash-color', camState.flashColor);
      const aura = document.getElementById('cam-flashAura');
      if (aura) aura.classList.add('on');
      const fBtn = document.getElementById('cam-flashBtn');
      if (fBtn) fBtn.classList.add('active');
      const pop = document.getElementById('cam-flashPop');
      if (pop) pop.classList.remove('show');
    });
  });

  const modeBtn = document.getElementById('cam-modeToggle');
  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      if (camState.recording) return;
      camState.mode = camState.mode === 'photo' ? 'video' : 'photo';
      modeBtn.textContent = camState.mode.toUpperCase();
    });
  }

  const shutterBtn = document.getElementById('cam-shutter');
  if (shutterBtn) {
    shutterBtn.addEventListener('click', () => {
      if (camState.mode === 'photo') {
        const canvas = document.getElementById('cam-preview');
        if (!canvas) return;
        // Output with maximum JPEG compression quality (1.0)
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'BeCreator Photo' });
          } else {
            const a = document.createElement('a'); 
            a.href = URL.createObjectURL(blob);
            a.download = `capture-${Date.now()}.jpg`; 
            a.click();
          }
        }, 'image/jpeg', 1.0);
      } else {
        if (camState.recording) stopCamRecording(); else startCamRecording();
      }
    });
  }
});

function startCamRecording() {
  const canvas = document.getElementById('cam-preview');
  if (!canvas || !camState.stream) return;
  const canvasStream = canvas.captureStream(30);
  const combined = new MediaStream([...canvasStream.getVideoTracks(), ...camState.stream.getAudioTracks()]);
  
  camState.chunks = [];
  camState.recorder = new MediaRecorder(combined, { mimeType: 'video/webm' });
  camState.recorder.ondataavailable = e => { if(e.data.size) camState.chunks.push(e.data); };
  camState.recorder.onstop = () => {
    const blob = new Blob(camState.chunks, { type: 'video/webm' });
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob);
    a.download = `video-${Date.now()}.webm`; 
    a.click();
  };
  camState.recorder.start();
  camState.recording = true; 
  camState.recordStart = Date.now();
  
  const shutter = document.getElementById('cam-shutter');
  if (shutter) shutter.classList.add('recording');
  const indicator = document.getElementById('cam-recIndicator');
  if (indicator) indicator.style.display = 'flex';
  
  camState.recordTimerId = setInterval(() => {
    const secs = Math.floor((Date.now() - camState.recordStart) / 1000);
    const timeEl = document.getElementById('cam-recTime');
    if (timeEl) {
      timeEl.textContent = `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
    }
  }, 250);
}

function stopCamRecording() {
  if (camState.recorder && camState.recording) {
    camState.recorder.stop(); 
    camState.recording = false;
    clearInterval(camState.recordTimerId);
    
    const shutter = document.getElementById('cam-shutter');
    if (shutter) shutter.classList.remove('recording');
    const indicator = document.getElementById('cam-recIndicator');
    if (indicator) indicator.style.display = 'none';
  }
}
