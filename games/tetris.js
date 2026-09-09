/* ============================================================
   TETRIS GAME ENGINE — tetris.js
   Full classic Tetris: 10x20 board, all 7 tetrominoes,
   SRS rotation, ghost piece, touch + keyboard controls.
   ============================================================ */
(function () {
  'use strict';

  // ============================================================
  // CONSTANTS
  // ============================================================
  const COLS = 10;
  const ROWS = 20;
  const LOCK_DELAY = 500;    // ms before piece locks on ground
  const MAX_LOCK_MOVES = 15; // max lock-delay resets per piece
  const CLEAR_ANIM_MS = 280; // ms for line-clear flash

  // Drop speed (ms per row) indexed by level-1, capped at level 15
  const SPEEDS = [900, 750, 620, 500, 400, 330, 260, 210, 165, 130, 100, 82, 68, 55, 45];

  // Points per line(s) cleared × level
  const LINE_POINTS = [0, 100, 300, 500, 800];

  // Tetromino shapes (initial spawn orientations)
  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
  };
  const PIECE_TYPES = Object.keys(SHAPES);

  // ============================================================
  // GAME STATE
  // ============================================================
  let board, currentPiece, nextPiece;
  let score, bestScore, lines, level;
  let isPlaying, isPaused, isGameOver;
  let animFrame, lastTime, dropCounter, dropInterval;
  let isLocking, lockTimer, lockMoves;
  let clearingRows = null;   // array of row indices being cleared
  let clearAnimStart = null;

  // ============================================================
  // CANVAS
  // ============================================================
  let canvas, ctx, nextCanvas, nextCtx;
  let blockSize = 26; // calculated dynamically

  // ============================================================
  // TOUCH
  // ============================================================
  let touchStartX, touchStartY, touchStartTime;
  const SWIPE_THRESHOLD = 28;
  const TAP_MAX_MS = 220;
  const TAP_MAX_DIST = 12;

  // ============================================================
  // BOARD HELPERS
  // ============================================================
  function createBoard() {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  // ============================================================
  // PIECE HELPERS
  // ============================================================
  function createPiece(type) {
    const shape = SHAPES[type].map(row => [...row]);
    const spawnX = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
    const spawnY = type === 'I' ? -1 : 0;
    return { type, shape, x: spawnX, y: spawnY };
  }

  function randomPiece() {
    const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    return createPiece(type);
  }

  function rotateCW(shape) {
    const rows = shape.length, cols = shape[0].length;
    const out = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        out[c][rows - 1 - r] = shape[r][c];
    return out;
  }

  function rotateCCW(shape) {
    const rows = shape.length, cols = shape[0].length;
    const out = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        out[cols - 1 - c][r] = shape[r][c];
    return out;
  }

  // Check if piece (with optional dx/dy offset) fits on board
  function isValid(b, piece, dx, dy) {
    const s = piece.shape;
    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (!s[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && b[ny][nx]) return false;
      }
    }
    return true;
  }

  // SRS wall-kick offsets (simplified — works for all pieces)
  const KICKS = [[0,0],[1,0],[-1,0],[2,0],[-2,0],[0,-1],[1,-1],[-1,-1]];

  function tryRotate(dir) {
    if (!isPlayable()) return;
    const rotated = dir >= 0 ? rotateCW(currentPiece.shape) : rotateCCW(currentPiece.shape);
    for (const [kx, ky] of KICKS) {
      if (isValid(board, { ...currentPiece, shape: rotated }, kx, ky)) {
        currentPiece.shape = rotated;
        currentPiece.x += kx;
        currentPiece.y += ky;
        resetLockDelay();
        return;
      }
    }
  }

  function getGhostY() {
    let gy = currentPiece.y;
    while (isValid(board, currentPiece, 0, gy - currentPiece.y + 1)) gy++;
    return gy;
  }

  // ============================================================
  // GAME ACTIONS
  // ============================================================
  function isPlayable() {
    return isPlaying && !isPaused && !isGameOver && !clearingRows;
  }

  function resetLockDelay() {
    if (isLocking && lockMoves < MAX_LOCK_MOVES) {
      lockTimer = 0;
      lockMoves++;
    }
  }

  function moveLeft() {
    if (!isPlayable()) return;
    if (isValid(board, currentPiece, -1, 0)) { currentPiece.x--; resetLockDelay(); }
  }

  function moveRight() {
    if (!isPlayable()) return;
    if (isValid(board, currentPiece, 1, 0)) { currentPiece.x++; resetLockDelay(); }
  }

  function softDrop() {
    if (!isPlayable()) return;
    if (isValid(board, currentPiece, 0, 1)) {
      currentPiece.y++;
      dropCounter = 0;
      score += 1;
      updateHUD();
    } else {
      // Already on ground — trigger lock immediately
      lockPiece();
    }
  }

  function hardDrop() {
    if (!isPlayable()) return;
    let dropped = 0;
    while (isValid(board, currentPiece, 0, 1)) {
      currentPiece.y++;
      dropped++;
    }
    score += dropped * 2;
    updateHUD();
    lockPiece();
  }

  function lockPiece() {
    // Merge piece into board
    const s = currentPiece.shape;
    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (!s[r][c]) continue;
        const ny = currentPiece.y + r;
        const nx = currentPiece.x + c;
        if (ny < 0) { triggerGameOver(); return; }
        board[ny][nx] = currentPiece.type;
      }
    }

    // Find full rows
    const full = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every(cell => cell !== 0)) full.push(r);
    }

    if (full.length > 0) {
      clearingRows = full;
      clearAnimStart = null;
    } else {
      spawnNext();
    }
  }

  function completeLineClear() {
    // Remove rows (descending to preserve indices)
    const sorted = [...clearingRows].sort((a, b) => b - a);
    for (const row of sorted) {
      board.splice(row, 1);
      board.unshift(new Array(COLS).fill(0));
    }

    const n = clearingRows.length;
    lines += n;
    score += LINE_POINTS[n] * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = SPEEDS[Math.min(level - 1, SPEEDS.length - 1)];

    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem('df_tetris_best', String(bestScore)); } catch(e) {}
    }

    clearingRows = null;
    clearAnimStart = null;
    updateHUD();
    spawnNext();
  }

  function spawnNext() {
    currentPiece = nextPiece;
    nextPiece = randomPiece();
    isLocking = false;
    lockTimer = 0;
    lockMoves = 0;
    dropCounter = 0;

    if (!isValid(board, currentPiece, 0, 0)) {
      triggerGameOver();
      return;
    }
    renderNext();
    updateHUD();
  }

  function togglePause() {
    if (!isPlaying || isGameOver) return;
    isPaused = !isPaused;
    const pauseOverlay = document.getElementById('tetris-pause-overlay');
    if (pauseOverlay) pauseOverlay.style.display = isPaused ? 'flex' : 'none';
    // Update both possible pause button locations
    ['tetris-pause-btn', 'games-pause-btn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.textContent = isPaused ? '▶' : '⏸';
    });

    if (!isPaused) {
      lastTime = 0;
      animFrame = requestAnimationFrame(gameLoop);
    } else {
      cancelAnimationFrame(animFrame);
    }
  }

  function triggerGameOver() {
    isPlaying = false;
    isGameOver = true;
    cancelAnimationFrame(animFrame);

    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem('df_tetris_best', String(bestScore)); } catch(e) {}
    }

    const overlay = document.getElementById('tetris-gameover-overlay');
    if (overlay) {
      const fs = document.getElementById('tetris-final-score');
      const fb = document.getElementById('tetris-final-best');
      if (fs) fs.textContent = score.toLocaleString();
      if (fb) fb.textContent = bestScore.toLocaleString();
      overlay.style.display = 'flex';
    }
  }

  function startGame() {
    // Reset state
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = SPEEDS[0];
    dropCounter = 0;
    lastTime = 0;
    isPlaying = true;
    isPaused = false;
    isGameOver = false;
    isLocking = false;
    lockTimer = 0;
    lockMoves = 0;
    clearingRows = null;
    clearAnimStart = null;

    // Hide all overlays
    ['tetris-gameover-overlay', 'tetris-pause-overlay', 'tetris-start-overlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const btn = document.getElementById('tetris-pause-btn');
    if (btn) btn.textContent = '⏸';

    currentPiece = randomPiece();
    nextPiece = randomPiece();

    updateHUD();
    renderNext();
    animFrame = requestAnimationFrame(gameLoop);
  }

  // ============================================================
  // GAME LOOP
  // ============================================================
  function gameLoop(timestamp) {
    if (!isPlaying || isPaused) return;

    const delta = lastTime ? Math.min(timestamp - lastTime, 100) : 0;
    lastTime = timestamp;

    // Handle line-clear animation
    if (clearingRows) {
      if (!clearAnimStart) clearAnimStart = timestamp;
      const t = Math.min((timestamp - clearAnimStart) / CLEAR_ANIM_MS, 1);
      renderBoard(t);
      if (t >= 1) {
        completeLineClear();
      }
      // Always schedule next frame (unless game ended inside completeLineClear)
      if (isPlaying && !isGameOver) {
        animFrame = requestAnimationFrame(gameLoop);
      }
      return;
    }

    dropCounter += delta;
    const canFall = isValid(board, currentPiece, 0, 1);

    if (canFall) {
      isLocking = false;
      lockTimer = 0;
      if (dropCounter >= dropInterval) {
        dropCounter -= dropInterval;
        currentPiece.y++;
      }
    } else {
      // Piece resting on surface — start/continue lock timer
      if (!isLocking) {
        isLocking = true;
        lockTimer = 0;
        lockMoves = 0;
      }
      lockTimer += delta;
      if (lockTimer >= LOCK_DELAY) {
        lockPiece();
        // Restart loop after natural lock (gravity-triggered)
        if (isPlaying && !isGameOver) {
          lastTime = 0;
          animFrame = requestAnimationFrame(gameLoop);
        }
        return;
      }
    }

    renderBoard(0);
    animFrame = requestAnimationFrame(gameLoop);
  }

  // ============================================================
  // RENDERING
  // ============================================================
  function renderBoard(clearAnimT) {
    if (!ctx) return;
    const W = blockSize * COLS;
    const H = blockSize * ROWS;

    // Light background
    ctx.fillStyle = '#F8F8F6';
    ctx.fillRect(0, 0, W, H);

    // Faint dark grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.055)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * blockSize, 0); ctx.lineTo(c * blockSize, H); ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * blockSize); ctx.lineTo(W, r * blockSize); ctx.stroke();
    }

    // Ghost piece
    if (currentPiece) {
      const ghostY = getGhostY();
      if (ghostY !== currentPiece.y) drawGhost(ghostY);
    }

    // Board cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!board[r][c]) continue;
        const clearing = clearingRows && clearingRows.includes(r);
        if (clearing) {
          // Flash green on clear
          const alpha = Math.max(0.15, 1 - clearAnimT * 0.85);
          const g = Math.floor(200 * (1 - clearAnimT));
          drawBlock(c, r, `rgba(34, ${197 - g}, 94, ${alpha})`, true);
        } else {
          drawBlock(c, r, '#2A2A2A', false);
        }
      }
    }

    // Current piece (on top)
    if (currentPiece && !clearingRows) {
      const s = currentPiece.shape;
      for (let r = 0; r < s.length; r++) {
        for (let c = 0; c < s[r].length; c++) {
          if (!s[r][c]) continue;
          const row = currentPiece.y + r;
          if (row < 0 || row >= ROWS) continue;
          drawBlock(currentPiece.x + c, row, '#1A1A18', false);
        }
      }
    }
  }

  function drawBlock(col, row, color, isClearing) {
    const x = col * blockSize;
    const y = row * blockSize;
    const pad = 1;
    const inner = blockSize - pad * 2;

    ctx.fillStyle = color;
    ctx.fillRect(x + pad, y + pad, inner, inner);

    if (!isClearing) {
      // Top-left highlight (lighter)
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x + pad, y + pad, inner, 3);
      ctx.fillRect(x + pad, y + pad, 3, inner);
      // Bottom-right shadow (darker)
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + pad + inner - 3, y + pad, 3, inner);
      ctx.fillRect(x + pad, y + pad + inner - 3, inner, 3);
    }
  }

  function drawGhost(ghostY) {
    const s = currentPiece.shape;
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (!s[r][c]) continue;
        const row = ghostY + r;
        if (row < 0 || row >= ROWS) continue;
        ctx.strokeRect(
          (currentPiece.x + c) * blockSize + 1.5,
          row * blockSize + 1.5,
          blockSize - 3,
          blockSize - 3
        );
      }
    }
  }

  function renderNext() {
    if (!nextCtx || !nextCanvas || !nextPiece) return;
    const bs = 14;
    const W = nextCanvas.width, H = nextCanvas.height;
    nextCtx.fillStyle = '#F8F8F6';
    nextCtx.fillRect(0, 0, W, H);
    const s = nextPiece.shape;
    const cols = s[0].length, rows = s.length;
    const offX = Math.floor((W - cols * bs) / 2);
    const offY = Math.floor((H - rows * bs) / 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!s[r][c]) continue;
        const x = offX + c * bs, y = offY + r * bs;
        nextCtx.fillStyle = '#2A2A2A';
        nextCtx.fillRect(x + 1, y + 1, bs - 2, bs - 2);
        nextCtx.fillStyle = 'rgba(255,255,255,0.2)';
        nextCtx.fillRect(x + 1, y + 1, bs - 2, 2);
        nextCtx.fillRect(x + 1, y + 1, 2, bs - 2);
      }
    }
  }

  // ============================================================
  // HUD UPDATE
  // ============================================================
  function updateHUD() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('tetris-score', score.toLocaleString());
    set('tetris-best', bestScore.toLocaleString());
    set('tetris-level', level);
    set('tetris-lines', lines);
  }

  // ============================================================
  // INPUT — KEYBOARD
  // ============================================================
  function handleKey(e) {
    const app = document.getElementById('games-app');
    if (!app || app.style.display === 'none') return;
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); moveLeft(); break;
      case 'ArrowRight': e.preventDefault(); moveRight(); break;
      case 'ArrowDown':  e.preventDefault(); softDrop(); break;
      case 'ArrowUp':    e.preventDefault(); tryRotate(1); break;
      case ' ':          e.preventDefault(); hardDrop(); break;
      case 'z': case 'Z': tryRotate(-1); break;
      case 'p': case 'P': togglePause(); break;
    }
  }

  function attachKeyboard() { document.addEventListener('keydown', handleKey); }
  function detachKeyboard() { document.removeEventListener('keydown', handleKey); }

  // ============================================================
  // INPUT — TOUCH (on canvas)
  // ============================================================
  function attachTouch() {
    if (!canvas) return;
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  }

  function onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
  }

  function onTouchEnd(e) {
    e.preventDefault();
    if (touchStartX == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);

    if (dt < TAP_MAX_MS && absDx < TAP_MAX_DIST && absDy < TAP_MAX_DIST) {
      tryRotate(1); // tap = rotate clockwise
    } else if (absDy > absDx) {
      if (dy > SWIPE_THRESHOLD) {
        dy > blockSize * 4 ? hardDrop() : softDrop();
      }
    } else {
      if (dx > SWIPE_THRESHOLD) moveRight();
      else if (dx < -SWIPE_THRESHOLD) moveLeft();
    }
    touchStartX = touchStartY = null;
  }

  // ============================================================
  // CALCULATE BLOCK SIZE
  // ============================================================
  function calcBlockSize() {
    const container = document.getElementById('games-container');
    if (!container) return 26;
    // Use container width as the constraint (fills screen width properly)
    const availW = container.clientWidth - 32; // 16px padding each side
    const scoreH = 72;    // score panel height + gap
    const dpadH  = 110;   // d-pad controls + gap
    const headerH = 50;   // games header
    const padding = 20;
    const availH = window.innerHeight - headerH - scoreH - dpadH - padding;
    const byW = Math.floor(availW / COLS);
    const byH = Math.floor(availH / ROWS);
    return Math.max(Math.min(byW, byH, 32), 18);
  }

  // ============================================================
  // BUILD UI
  // ============================================================
  function buildUI() {
    const container = document.getElementById('games-container');
    if (!container) return;

    blockSize = calcBlockSize();
    const cw = blockSize * COLS;   // canvas / board width
    const ch = blockSize * ROWS;
    const gameW = cw + 2;          // +2 for canvas-wrap border

    // Inject pause button into header — pause btn is now static in HTML
    // (no injection needed)

    container.innerHTML = `
      <div class="tetris-layout">

        <!-- Stats strip — exact board width -->
        <div class="tetris-score-panel" style="width:${gameW}px">
          <div class="tetris-score-group">
            <div class="tetris-stat-label">SCORE</div>
            <div class="tetris-stat-value" id="tetris-score">0</div>
          </div>
          <div class="tetris-score-sep"></div>
          <div class="tetris-score-group">
            <div class="tetris-stat-label">BEST</div>
            <div class="tetris-stat-value" id="tetris-best">0</div>
          </div>
          <div class="tetris-score-sep"></div>
          <div class="tetris-score-group">
            <div class="tetris-stat-label">LVL</div>
            <div class="tetris-stat-value" id="tetris-level">1</div>
          </div>
          <div class="tetris-score-sep"></div>
          <div class="tetris-score-group">
            <div class="tetris-stat-label">LINES</div>
            <div class="tetris-stat-value" id="tetris-lines">0</div>
          </div>
          <div class="tetris-score-sep"></div>
          <div class="tetris-score-group" style="align-items:center">
            <div class="tetris-stat-label">NEXT</div>
            <canvas id="tetris-next-canvas" width="52" height="40"></canvas>
          </div>
        </div>

        <!-- Board — canvas -->
        <div class="tetris-canvas-wrap" style="width:${gameW}px;height:${ch + 2}px">
          <canvas id="tetris-canvas" width="${cw}" height="${ch}" style="width:${cw}px;height:${ch}px"></canvas>

          <!-- Pause overlay -->
          <div id="tetris-pause-overlay" class="tetris-overlay" style="display:none">
            <div class="tetris-overlay-card">
              <div class="tetris-overlay-title">PAUSED</div>
              <button class="tetris-play-btn" onclick="window._tPause()">▶ RESUME</button>
            </div>
          </div>

          <!-- Game over overlay -->
          <div id="tetris-gameover-overlay" class="tetris-overlay" style="display:none">
            <div class="tetris-overlay-card">
              <div class="tetris-overlay-title">GAME OVER</div>
              <div class="tetris-overlay-sub" style="margin-top:6px">YOUR SCORE</div>
              <div class="tetris-overlay-score" id="tetris-final-score">0</div>
              <div class="tetris-overlay-sub" style="margin-top:2px">BEST</div>
              <div class="tetris-overlay-score" style="font-size:13px" id="tetris-final-best">0</div>
              <button class="tetris-play-btn" onclick="window._tStart()">▶ PLAY AGAIN</button>
            </div>
          </div>

          <!-- Start overlay -->
          <div id="tetris-start-overlay" class="tetris-overlay" style="display:flex">
            <div class="tetris-overlay-card">
              <div class="tetris-overlay-emoji">🕹️</div>
              <div class="tetris-overlay-title">TETRIS</div>
              <div class="tetris-overlay-sub">Stack &amp; clear lines</div>
              <button class="tetris-play-btn" onclick="window._tStart()">▶ START</button>
              <div class="tetris-overlay-hint">Tap canvas = Rotate&nbsp;&nbsp;|&nbsp;&nbsp;Swipe = Move<br>Use buttons below to play</div>
            </div>
          </div>
        </div>

        <!-- D-Pad — 1 row: Left | Rotate | Right | Hard Drop -->
        <div class="tetris-dpad" style="width:${gameW}px">
          <div class="tetris-dpad-row">
            <button class="tetris-dpad-btn" onclick="window._tLeft()" aria-label="Left">◀</button>
            <button class="tetris-dpad-btn tetris-dpad-rotate" onclick="window._tRotate()" aria-label="Rotate">↺</button>
            <button class="tetris-dpad-btn" onclick="window._tRight()" aria-label="Right">▶</button>
            <button class="tetris-dpad-btn tetris-dpad-hard" onclick="window._tHard()" aria-label="Hard Drop">▼▼</button>
          </div>
        </div>

      </div>
    `;

    // Grab canvas references
    canvas = document.getElementById('tetris-canvas');
    ctx = canvas ? canvas.getContext('2d') : null;
    nextCanvas = document.getElementById('tetris-next-canvas');
    nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;

    // Wire global callbacks
    window._tStart  = startGame;
    window._tPause  = togglePause;
    window._tLeft   = moveLeft;
    window._tRight  = moveRight;
    window._tHard   = hardDrop;
    window._tRotate = () => tryRotate(1);

    attachTouch();
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  window.openTetrisGame = function () {
    const app = document.getElementById('games-app');
    if (!app) return;
    app.style.display = 'flex';

    try { bestScore = parseInt(localStorage.getItem('df_tetris_best') || '0', 10); } catch(e) { bestScore = 0; }

    // Build UI after brief layout pass so clientWidth is accurate
    setTimeout(() => {
      buildUI();
      updateHUD();
      attachKeyboard();
    }, 60);
  };

  window.closeTetrisGame = function () {
    isPlaying = false;
    cancelAnimationFrame(animFrame);
    detachKeyboard();

    const app = document.getElementById('games-app');
    if (app) app.style.display = 'none';

    // Clean up global callbacks
    ['_tStart','_tPause','_tLeft','_tRight','_tSoft','_tHard','_tRotate'].forEach(k => delete window[k]);
  };

})();
