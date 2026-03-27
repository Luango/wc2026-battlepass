// ═══════════════════════════════════════════════════════════
// MATCH VIEWER — Live 2D tactical match simulation UI
// ═══════════════════════════════════════════════════════════
import { state, saveState, saveMatches } from './state.js?v=9';
import { T, flagImg } from './data/teams.js?v=9';
import { simulateMatch, EVT, SUBSTEPS } from './match-engine.js?v=9';
import { SFX } from './audio-fx.js?v=9';
import { simResult, simScore, simMatchStats } from './matches.js?v=9';
import { resolveBet } from './betting/settlement.js?v=9';
import { addXP } from './xp.js?v=9';
import { advanceWinner } from './simulation.js?v=9';

let _deps = {};
export function setViewerDeps({ updateAll, renderMatches, toast }) {
  _deps = { updateAll, renderMatches, toast };
}

// ── Viewer State ─────────────────────────────────────────
let simData = null;        // Result from simulateMatch()
let currentFrame = 0;      // Current frame index into positionSnapshots
let currentMinute = 0;     // Display minute (derived from frame)
let playSpeed = 1;         // 1=normal, 2=fast, 4=vfast, 8=ultra
let isPlaying = false;
let playTimer = null;
let currentMatch = null;   // The match object being simulated
let eventLogEntries = [];  // Rendered event log
let overlay = null;        // DOM reference
let lastEventMinute = -1;  // Track which minute's events have been processed

const TICK_MS = 800;       // Base ms per minute at 1x speed
const FRAME_MS = TICK_MS / SUBSTEPS; // ms per frame at 1x

// ── Open the match viewer ────────────────────────────────
// lineupConfig: { homeFormation, awayFormation, homeLineup, awayLineup }
export function openMatchViewer(matchId, lineupConfig) {
  const m = state.MS.find(x => x.id === matchId);
  if (!m || m.status !== 'pending' || m.home === 'TBD' || m.away === 'TBD') {
    if (_deps.toast) _deps.toast('Cannot simulate this match');
    return;
  }

  currentMatch = m;
  const hf = lineupConfig?.homeFormation || state.previewFormations?.home || '4-3-3';
  const af = lineupConfig?.awayFormation || state.previewFormations?.away || '4-3-3';
  const hLineup = lineupConfig?.homeLineup || null;
  const aLineup = lineupConfig?.awayLineup || null;

  // Run the full simulation with user's lineup
  simData = simulateMatch(m, hf, af, hLineup, aLineup);
  if (!simData) return;

  currentFrame = 0;
  currentMinute = 0;
  lastEventMinute = -1;
  playSpeed = 1;
  isPlaying = false;
  eventLogEntries = [];

  SFX.sim();
  createOverlay();
  renderFrame();
  // Auto-start after a brief delay
  setTimeout(() => startPlay(), 600);
}

// ── Create the fullscreen overlay ────────────────────────
function createOverlay() {
  // Remove old one if any
  const old = document.getElementById('match-viewer-overlay');
  if (old) old.remove();

  const h = T[currentMatch.home], a = T[currentMatch.away];

  const el = document.createElement('div');
  el.id = 'match-viewer-overlay';
  el.innerHTML = `
    <div class="mv-container">
      <!-- FINAL BANNER -->
      ${currentMatch.phaseId === 'final' ? `<div class="mv-final-banner">⭐ THE FINAL ⭐</div>` : ''}

      <!-- TOP BAR -->
      <div class="mv-topbar">
        <div class="mv-topbar-left">
          <span class="mv-phase-badge${currentMatch.phaseId === 'final' ? ' mv-phase-badge-final' : ''}">${currentMatch.phase}</span>
          <span class="mv-venue-text">${currentMatch.date}</span>
        </div>
        <div class="mv-topbar-right">
          <button class="mv-close-btn" id="mv-close-btn">✕ EXIT</button>
        </div>
      </div>

      <!-- SCOREBOARD -->
      <div class="mv-scoreboard">
        <div class="mv-sb-team mv-sb-home">
          <span class="mv-sb-flag">${flagImg(currentMatch.home, 'mv-flag')}</span>
          <span class="mv-sb-name">${h.name}</span>
        </div>
        <div class="mv-sb-center">
          <div class="mv-sb-score"><span id="mv-score-h">0</span> – <span id="mv-score-a">0</span></div>
          <div class="mv-sb-clock" id="mv-clock">0'</div>
        </div>
        <div class="mv-sb-team mv-sb-away">
          <span class="mv-sb-name">${a.name}</span>
          <span class="mv-sb-flag">${flagImg(currentMatch.away, 'mv-flag')}</span>
        </div>
      </div>

      <!-- MAIN AREA -->
      <div class="mv-main">
        <!-- PITCH -->
        <div class="mv-pitch-area">
          <div class="mv-pitch" id="mv-pitch">
            <!-- Pitch markings — field div is the outer touchline -->
            <div class="mv-pitch-field">
              <div class="mv-pitch-center-line"></div>
              <div class="mv-pitch-center-circle"></div>
              <div class="mv-pitch-center-dot"></div>
              <!-- Penalty areas (attached to left/right field edge) -->
              <div class="mv-pitch-penalty mv-pen-left"></div>
              <div class="mv-pitch-penalty mv-pen-right"></div>
              <!-- 6-yard boxes -->
              <div class="mv-pitch-6yard mv-6y-left"></div>
              <div class="mv-pitch-6yard mv-6y-right"></div>
              <!-- Goal areas -->
              <div class="mv-pitch-goal mv-goal-left"></div>
              <div class="mv-pitch-goal mv-goal-right"></div>
              <!-- Penalty spots -->
              <div class="mv-pitch-pen-spot mv-ps-left"></div>
              <div class="mv-pitch-pen-spot mv-ps-right"></div>
              <!-- Penalty arcs -->
              <div class="mv-pitch-arc mv-arc-left"></div>
              <div class="mv-pitch-arc mv-arc-right"></div>
            </div>
            <!-- Ball -->
            <div class="mv-ball" id="mv-ball"></div>
            <!-- Player dots will be injected -->
            <div id="mv-players"></div>
          </div>

          <!-- MINI STATS BAR -->
          <div class="mv-stats-bar" id="mv-stats-bar">
            <div class="mv-stat">
              <span class="mv-stat-val mv-stat-h" id="mv-poss-h">50%</span>
              <span class="mv-stat-lbl">POSS</span>
              <span class="mv-stat-val mv-stat-a" id="mv-poss-a">50%</span>
            </div>
            <div class="mv-stat">
              <span class="mv-stat-val mv-stat-h" id="mv-shots-h">0</span>
              <span class="mv-stat-lbl">SHOTS</span>
              <span class="mv-stat-val mv-stat-a" id="mv-shots-a">0</span>
            </div>
            <div class="mv-stat">
              <span class="mv-stat-val mv-stat-h" id="mv-fouls-h">0</span>
              <span class="mv-stat-lbl">FOULS</span>
              <span class="mv-stat-val mv-stat-a" id="mv-fouls-a">0</span>
            </div>
            <div class="mv-stat">
              <span class="mv-stat-val mv-stat-h" id="mv-corners-h">0</span>
              <span class="mv-stat-lbl">CORNERS</span>
              <span class="mv-stat-val mv-stat-a" id="mv-corners-a">0</span>
            </div>
          </div>
        </div>

        <!-- EVENT LOG -->
        <div class="mv-log-panel">
          <div class="mv-log-head">MATCH LOG</div>
          <div class="mv-log-list" id="mv-log-list"></div>
        </div>
      </div>

      <!-- CONTROLS -->
      <div class="mv-controls">
        <button class="mv-ctrl-btn" id="mv-btn-play" title="Play/Pause">▶</button>
        <button class="mv-ctrl-btn mv-speed ${playSpeed === 1 ? 'active' : ''}" data-speed="1">1x</button>
        <button class="mv-ctrl-btn mv-speed ${playSpeed === 2 ? 'active' : ''}" data-speed="2">2x</button>
        <button class="mv-ctrl-btn mv-speed ${playSpeed === 4 ? 'active' : ''}" data-speed="4">4x</button>
        <button class="mv-ctrl-btn mv-speed ${playSpeed === 8 ? 'active' : ''}" data-speed="8">8x</button>
        <div class="mv-progress-wrap">
          <div class="mv-progress-bar" id="mv-progress-bar">
            <div class="mv-progress-fill" id="mv-progress-fill"></div>
          </div>
          <span class="mv-progress-lbl" id="mv-progress-lbl">0 / 90</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(el);
  overlay = el;

  // Wire button events
  el.querySelector('#mv-close-btn').onclick = () => closeMatchViewer();
  el.querySelector('#mv-btn-play').onclick = () => togglePlay();

  el.querySelectorAll('.mv-speed').forEach(btn => {
    btn.onclick = () => setSpeed(parseInt(btn.dataset.speed));
  });

  // Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') { closeMatchViewer(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}

// ── Playback controls ────────────────────────────────────
function startPlay() {
  if (isPlaying) return;
  isPlaying = true;
  updatePlayBtn();
  tick();
}

function stopPlay() {
  isPlaying = false;
  if (playTimer) { clearTimeout(playTimer); playTimer = null; }
  updatePlayBtn();
}

function togglePlay() {
  if (currentMinute >= 90) {
    // Restart
    currentFrame = 0;
    currentMinute = 0;
    lastEventMinute = -1;
    eventLogEntries = [];
    startPlay();
    return;
  }
  if (isPlaying) stopPlay(); else startPlay();
}

function setSpeed(s) {
  playSpeed = s;
  if (!overlay) return;
  overlay.querySelectorAll('.mv-speed').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.speed) === s);
  });
}

function updatePlayBtn() {
  const btn = overlay?.querySelector('#mv-btn-play');
  if (btn) btn.textContent = isPlaying ? '⏸' : (currentMinute >= 90 ? '↻' : '▶');
}

function tick() {
  if (!isPlaying || !simData) return;

  const totalFrames = simData.positionSnapshots.length;

  if (currentFrame >= totalFrames - 1) {
    currentMinute = 90;
    stopPlay();
    renderFrame();
    // Process any remaining events
    processEventsUpTo(90);
    handleMatchEnd();
    return;
  }

  currentFrame++;
  const snap = simData.positionSnapshots[currentFrame];
  if (snap) currentMinute = snap.minute;

  renderFrame();

  // Process events for the current minute (only once per minute)
  processEventsUpTo(currentMinute);

  const delay = Math.max(20, FRAME_MS / playSpeed);
  playTimer = setTimeout(tick, delay);
}

function processEventsUpTo(minute) {
  if (minute <= lastEventMinute) return;

  // Process all events from lastEventMinute+1 to current minute
  for (let m = lastEventMinute + 1; m <= minute; m++) {
    const minuteEvents = simData.events.filter(e => e.minute === m);
    minuteEvents.forEach(e => addLogEntry(e));

    // Play SFX for important events
    minuteEvents.forEach(e => {
      if (e.type === EVT.GOAL || e.type === EVT.PEN_GOAL) {
        SFX.bigWin();
        flashPitch('goal');
        showGoalPopup(e);
      } else if (e.type === EVT.RED) {
        SFX.error();
        flashPitch('red');
      } else if (e.type === EVT.YELLOW) {
        SFX.click();
      } else if (e.type === EVT.PENALTY) {
        SFX.sim();
      } else if (e.type === EVT.HALFTIME) {
        SFX.nav();
      } else if (e.type === EVT.CORNER) {
        SFX.tab();
      }
    });
  }
  lastEventMinute = minute;
}

// ── Render current frame ─────────────────────────────────
function renderFrame() {
  if (!overlay || !simData) return;

  // Find the position snapshot for this frame
  const snap = simData.positionSnapshots[currentFrame] || simData.positionSnapshots[0];
  if (!snap) return;

  // Update scoreboard
  const sh = overlay.querySelector('#mv-score-h');
  const sa = overlay.querySelector('#mv-score-a');
  if (sh) sh.textContent = snap.score[0];
  if (sa) sa.textContent = snap.score[1];

  // Clock
  const clock = overlay.querySelector('#mv-clock');
  if (clock) {
    if (currentMinute <= 45) clock.textContent = `${currentMinute}'`;
    else if (currentMinute === 45) clock.textContent = `HT`;
    else clock.textContent = `${currentMinute}'`;
  }

  // Progress bar
  const fill = overlay.querySelector('#mv-progress-fill');
  const lbl = overlay.querySelector('#mv-progress-lbl');
  if (fill) fill.style.width = `${(currentMinute / 90) * 100}%`;
  if (lbl) lbl.textContent = `${currentMinute} / 90`;

  // Render players on pitch (reuse DOM elements for CSS transitions)
  const playersEl = overlay.querySelector('#mv-players');
  if (playersEl) {
    const allPlayers = [
      ...snap.home.map((p, i) => ({ ...p, side: 'home', idx: i })),
      ...snap.away.map((p, i) => ({ ...p, side: 'away', idx: i })),
    ];

    // Create player elements once, then just update positions
    if (!playersEl.children.length || playersEl.children.length !== allPlayers.length) {
      playersEl.innerHTML = allPlayers.map(p => {
        const isGK = p.pos === 'GK';
        const cls = `mv-player ${p.side} ${isGK ? 'gk' : ''}`;
        return `<div class="${cls}" data-pid="${p.side}-${p.idx}" style="left:${(p.x * 100).toFixed(1)}%;top:${(p.y * 100).toFixed(1)}%" title="${p.name} (#${p.num})">
          <span class="mv-player-num">${p.num}</span>
          <span class="mv-player-name">${p.name.split(' ').pop()}</span>
        </div>`;
      }).join('');
    } else {
      // Update existing positions (CSS transitions will animate)
      allPlayers.forEach((p, i) => {
        const el = playersEl.children[i];
        if (el) {
          el.style.left = `${(p.x * 100).toFixed(1)}%`;
          el.style.top = `${(p.y * 100).toFixed(1)}%`;
        }
      });
    }
  }

  // Render ball
  const ballEl = overlay.querySelector('#mv-ball');
  if (ballEl && snap.ball) {
    ballEl.style.left = `${(snap.ball.x * 100).toFixed(1)}%`;
    ballEl.style.top = `${(snap.ball.y * 100).toFixed(1)}%`;
  }

  // Update mini stats
  updateMiniStats();
}

// ── Update live stats ────────────────────────────────────
function updateMiniStats() {
  if (!overlay || !simData) return;

  const evts = simData.events.filter(e => e.minute <= currentMinute);
  let possH = 0, possA = 0;
  let shotsH = 0, shotsA = 0;
  let foulsH = 0, foulsA = 0;
  let cornersH = 0, cornersA = 0;

  // Count possession frames
  simData.positionSnapshots.slice(0, currentFrame + 1).forEach(s => {
    if (s.possession === 'home') possH++; else possA++;
  });

  evts.forEach(e => {
    if (e.type === EVT.SHOT || e.type === EVT.SHOT_SAVED || e.type === EVT.SHOT_WIDE || e.type === EVT.GOAL || e.type === EVT.PEN_GOAL || e.type === EVT.PEN_MISS) {
      if (e.team === 'home') shotsH++; else shotsA++;
    }
    if (e.type === EVT.FOUL) {
      if (e.team === 'home') foulsH++; else foulsA++;
    }
    if (e.type === EVT.CORNER) {
      if (e.team === 'home') cornersH++; else cornersA++;
    }
  });

  const totalPoss = possH + possA || 1;
  const set = (id, val) => { const el = overlay.querySelector(`#${id}`); if (el) el.textContent = val; };
  set('mv-poss-h', Math.round(possH / totalPoss * 100) + '%');
  set('mv-poss-a', Math.round(possA / totalPoss * 100) + '%');
  set('mv-shots-h', shotsH);
  set('mv-shots-a', shotsA);
  set('mv-fouls-h', foulsH);
  set('mv-fouls-a', foulsA);
  set('mv-corners-h', cornersH);
  set('mv-corners-a', cornersA);
}

// ── Event log ────────────────────────────────────────────
function addLogEntry(event) {
  const h = T[currentMatch.home], a = T[currentMatch.away];
  const teamName = (side) => side === 'home' ? h.name : a.name;
  const teamFlag = (side) => side === 'home' ? currentMatch.home : currentMatch.away;

  let icon = '', text = '', cls = '';

  switch (event.type) {
    case EVT.KICKOFF:
      icon = '⚽'; text = 'Kick Off!'; cls = 'mv-log-kickoff';
      break;
    case EVT.GOAL:
      icon = '⚽'; cls = 'mv-log-goal';
      text = `<strong>GOAL!</strong> ${event.player} (${teamName(event.team)})`;
      if (event.assist) text += ` — Assist: ${event.assist}`;
      if (event.goalType === 'freekick') text += ' [Free Kick]';
      if (event.goalType === 'corner') text += ' [Corner]';
      text += ` <span class="mv-log-score">${event.score[0]} – ${event.score[1]}</span>`;
      break;
    case EVT.PEN_GOAL:
      icon = '⚽'; cls = 'mv-log-goal';
      text = `<strong>GOAL!</strong> ${event.player} (${teamName(event.team)}) [Penalty] <span class="mv-log-score">${event.score[0]} – ${event.score[1]}</span>`;
      break;
    case EVT.PEN_MISS:
      icon = '❌'; cls = 'mv-log-miss';
      text = `Penalty MISSED by ${event.player} (${teamName(event.team)})`;
      break;
    case EVT.PENALTY:
      icon = '⚠️'; cls = 'mv-log-penalty';
      text = `PENALTY awarded to ${teamName(event.team)}! ${event.player} steps up...`;
      break;
    case EVT.FOUL:
      icon = '🦶'; cls = 'mv-log-foul';
      text = `Foul by ${event.player} (${teamName(event.team)}) on ${event.fouled}`;
      break;
    case EVT.YELLOW:
      icon = '🟨'; cls = 'mv-log-card';
      text = `Yellow card — ${event.player} (${teamName(event.team)})`;
      break;
    case EVT.RED:
      icon = '🟥'; cls = 'mv-log-red';
      text = `RED CARD — ${event.player} (${teamName(event.team)})` +
        (event.reason === 'second_yellow' ? ' (2nd yellow)' : '');
      break;
    case EVT.CORNER:
      icon = '🚩'; cls = 'mv-log-corner';
      text = `Corner kick for ${teamName(event.team)}`;
      break;
    case EVT.FREEKICK:
      icon = '🎯'; cls = 'mv-log-freekick';
      text = `Free kick for ${teamName(event.team)} — ${event.player}`;
      break;
    case EVT.OFFSIDE:
      icon = '🚫'; cls = 'mv-log-offside';
      text = `Offside — ${event.player} (${teamName(event.team)})`;
      break;
    case EVT.SHOT_SAVED:
      icon = '🧤'; cls = 'mv-log-save';
      text = `Shot by ${event.player} saved by ${event.keeper}`;
      break;
    case EVT.SHOT_WIDE:
      icon = '💨'; cls = 'mv-log-wide';
      text = `Shot by ${event.player} (${teamName(event.team)}) goes wide`;
      break;
    case EVT.SUB:
      icon = '🔄'; cls = 'mv-log-sub';
      text = `Substitution (${teamName(event.team)}): ${event.playerIn} ⬆ for ${event.playerOut} ⬇`;
      break;
    case EVT.HALFTIME:
      icon = '⏸'; cls = 'mv-log-half';
      text = `<strong>HALF TIME</strong> — ${event.score[0]} – ${event.score[1]}`;
      break;
    case EVT.FULLTIME:
      icon = '🏁'; cls = 'mv-log-full';
      text = `<strong>FULL TIME</strong> — ${event.score[0]} – ${event.score[1]}`;
      break;
    default:
      return; // Skip non-notable events
  }

  eventLogEntries.unshift({ minute: event.minute, icon, text, cls });

  const list = overlay?.querySelector('#mv-log-list');
  if (list) {
    list.innerHTML = eventLogEntries.map(e =>
      `<div class="mv-log-entry ${e.cls}">
        <span class="mv-log-min">${e.minute}'</span>
        <span class="mv-log-icon">${e.icon}</span>
        <span class="mv-log-text">${e.text}</span>
      </div>`
    ).join('');
  }
}

// ── Pitch flash effect ───────────────────────────────────
function flashPitch(type) {
  const pitch = overlay?.querySelector('.mv-pitch');
  if (!pitch) return;
  const cls = `mv-flash-${type}`;
  pitch.classList.add(cls);
  setTimeout(() => pitch.classList.remove(cls), 1200);
}

// ── Goal popup ───────────────────────────────────────────
function showGoalPopup(event) {
  if (!overlay) return;

  // Pause simulation
  stopPlay();

  // Determine scorer info
  const isHome = event.team === 'home';
  const teamName = isHome
    ? (T[currentMatch.home]?.name || currentMatch.home)
    : (T[currentMatch.away]?.name || currentMatch.away);
  const scorerName = event.player || '';
  const minute = event.minute || currentMinute;

  // Remove any existing goal popup
  overlay.querySelector('.mv-goal-popup')?.remove();

  const popup = document.createElement('div');
  popup.className = 'mv-goal-popup';
  popup.innerHTML = `
    <div class="mv-goal-burst"></div>
    <div class="mv-goal-content">
      <div class="mv-goal-label">GOAL!</div>
      <div class="mv-goal-team">${teamName}</div>
      ${scorerName ? `<div class="mv-goal-scorer">⚽ ${scorerName} ${minute}'</div>` : ''}
    </div>
  `;
  overlay.appendChild(popup);

  // Auto-dismiss after 2.8s then resume
  setTimeout(() => {
    popup.classList.add('mv-goal-popup-out');
    setTimeout(() => {
      popup.remove();
      startPlay();
    }, 400);
  }, 2800);
}

// ── Handle match end — settle the match ──────────────────
function handleMatchEnd() {
  if (!currentMatch || !simData) return;

  const m = currentMatch;
  m.status = 'settled';
  m.result = simData.result;
  m.score = [...simData.score];

  // Generate full stats using the engine's events
  m.stats = simMatchStats(m, m.score);

  // Resolve bet
  const bet = state.ST.bets[m.id];
  if (bet && bet.status === 'pending') {
    const outcome = resolveBet(bet, m, m.result, m.score, m.stats);
    if (outcome === 'won') {
      bet.payout = Math.round(bet.amount * bet.odds);
      bet.status = 'won';
      state.ST.coins += bet.payout;
      addXP(100);
    } else if (outcome === 'push') {
      bet.payout = bet.amount;
      bet.status = 'push';
      state.ST.coins += bet.amount;
      addXP(15);
    } else {
      bet.payout = 0;
      bet.status = 'lost';
      addXP(10);
    }
  }

  if (['r32', 'r16', 'qf', 'sf'].includes(m.phaseId)) advanceWinner(m);
  saveMatches();
  saveState();

  // Show end-of-match summary in the viewer
  showMatchSummary();
}

// ── End-of-match summary ─────────────────────────────────
function showMatchSummary() {
  if (!overlay || !simData || !currentMatch) return;
  const h = T[currentMatch.home], a = T[currentMatch.away];
  const m = currentMatch;
  const bet = state.ST.bets[m.id];

  let betHtml = '';
  if (bet) {
    const isWin = bet.status === 'won';
    const isPush = bet.status === 'push';
    const col = isWin ? 'var(--green)' : isPush ? 'var(--gold)' : 'var(--red)';
    const txt = isWin ? `WON +${bet.payout}🪙` : isPush ? `PUSH ↩${bet.amount}🪙` : `LOST −${bet.amount}🪙`;
    betHtml = `<div class="mv-summary-bet" style="color:${col}">${txt}</div>`;
  }

  const winText = m.result === 'draw' ? 'DRAW' :
    (m.result === 'home' ? `${h.name} WIN` : `${a.name} WIN`);

  const summaryEl = document.createElement('div');
  summaryEl.className = 'mv-summary-overlay';
  summaryEl.innerHTML = `
    <div class="mv-summary-card">
      <div class="mv-summary-title">FULL TIME</div>
      <div class="mv-summary-score">
        <span class="mv-summary-team">${flagImg(m.home, 'mv-flag')} ${h.name}</span>
        <span class="mv-summary-result">${m.score[0]} – ${m.score[1]}</span>
        <span class="mv-summary-team">${a.name} ${flagImg(m.away, 'mv-flag')}</span>
      </div>
      <div class="mv-summary-winner">${winText}</div>
      ${betHtml}
      <div class="mv-summary-actions">
        <button class="mv-summary-btn mv-summary-log-btn" id="mv-btn-view-log">VIEW FULL LOG</button>
        <button class="mv-summary-btn mv-summary-close-btn" id="mv-btn-done">CONTINUE</button>
      </div>
    </div>
  `;
  overlay.appendChild(summaryEl);

  summaryEl.querySelector('#mv-btn-done').onclick = () => closeMatchViewer();
  summaryEl.querySelector('#mv-btn-view-log').onclick = () => {
    summaryEl.remove();
    // Scroll log to bottom to show full time
    const list = overlay?.querySelector('#mv-log-list');
    if (list) list.scrollTop = 0;
  };

  if (bet) {
    if (bet.status === 'won') SFX.win();
    else if (bet.status === 'lost') SFX.lose();
    else SFX.push();
  } else {
    SFX.coins();
  }
}

// ── Close viewer ─────────────────────────────────────────
export function closeMatchViewer() {
  stopPlay();
  overlay = null;
  simData = null;
  currentMatch = null;
  currentFrame = 0;
  currentMinute = 0;
  lastEventMinute = -1;

  const el = document.getElementById('match-viewer-overlay');
  if (el) {
    el.classList.add('mv-closing');
    setTimeout(() => { try { el.remove(); } catch(e) {} }, 350);
  }

  // Refresh main UI
  if (_deps.updateAll) _deps.updateAll();
  if (_deps.renderMatches) _deps.renderMatches();
}
