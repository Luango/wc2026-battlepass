// ═══════════════════════════════════════════════════════════
// MAIN — Entry point: imports, dependency wiring, init
// ═══════════════════════════════════════════════════════════

// Data
import { state, initState, saveState, saveMatches } from './state.js?v=9';
import { TEAMS, T, flagImg } from './data/teams.js?v=9';
import { genMatches } from './matches.js?v=9';

// FX
import { registerGlobalRipple, spawnConfetti, spawnSparkles, animateElement } from './visual-fx.js?v=9';
import { SFX } from './audio-fx.js?v=9';

// Utils
import { toast, registerErrorHandlers } from './utils.js?v=9';

// Calendar
import { setCalendarDeps, getAllMatchDays, setActiveDay, navDay,
         calDragStart, calDragMove, calDragEnd, calTouchStart, calTouchMove } from './calendar.js?v=9';

// XP
import { setXpDeps, addXP, openRewardPopup, closeRewardPopup, collectReward } from './xp.js?v=9';

// Render
import { updateAll, renderCalendarHUD, renderMatches, setPhase } from './render.js?v=9';

// Betting
import { setBetDeps, pickOpt, placeBet, selectStake, switchBetTab, switchPreviewBetTab } from './betting/bet-actions.js?v=9';

// Simulation
import { setSimDeps, simDay, simNext, simAll, resetGame } from './simulation.js?v=9';

// Preview
import { setPreviewDeps, openPreview, closePreview, switchLineupTab,
         handlePlayerRowClick, lockPrediction, changeFormation,
         renderPreviewBetting, renderRightPanel, switchRightTab,
         aiAsk, aiSendChat, toggleAIChat, switchAIFloatTab,
         simulateTactical, showComparePopup, startCompareFromPopup,
         openQuickS11Bet, selectQuickS11Amount, confirmQuickS11Bet, closeQuickS11Bet } from './preview.js?v=9';

// Player Stats
import { toggleCompareMode, closeCompareOverlay } from './player-stats.js?v=9';

// Match Viewer
import { setViewerDeps, openMatchViewer, closeMatchViewer } from './match-viewer.js?v=9';

// Bracket
import { setBracketDeps, openBracket, closeBracket, bktOpenMatch } from './bracket.js?v=9';

// ── Wire late-binding dependencies ─────────────────────────
setCalendarDeps({ renderCalendarHUD, renderMatches });
setXpDeps({ updateAll, toast });
setSimDeps({ updateAll, renderMatches, toast, getAllMatchDays });
setBetDeps({ toast, renderMatches, renderPreviewBetting: renderRightPanel, addXP, saveState });
setPreviewDeps({ renderMatches, toast });
setViewerDeps({ updateAll, renderMatches, toast });
setBracketDeps({ openPreview });

// ── Expose functions to window for inline HTML handlers ────
Object.assign(window, {
  simDay, simNext, simAll, resetGame,
  openPreview, closePreview,
  pickOpt, placeBet, selectStake,
  switchBetTab, switchPreviewBetTab,
  navDay, setActiveDay, setPhase,
  calDragStart, calDragMove, calDragEnd, calTouchStart, calTouchMove,
  openBracket, closeBracket, bktOpenMatch,
  switchLineupTab, handlePlayerRowClick,
  lockPrediction, changeFormation,
  openRewardPopup, closeRewardPopup, collectReward,
  switchRightTab, aiAsk, aiSendChat, toggleAIChat, switchAIFloatTab, toggleCompareMode,
  closeCompareOverlay,
  cancelCompare() {}, startCompareFromPopup, showComparePopup,
  openMatchViewer, closeMatchViewer, simulateTactical,
  openQuickS11Bet, selectQuickS11Amount, confirmQuickS11Bet, closeQuickS11Bet,
});

// ── Register global handlers ───────────────────────────────
registerErrorHandlers();
registerGlobalRipple();

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const cmpOv = document.getElementById('compare-overlay');
    if (cmpOv && cmpOv.style.display === 'flex') {
      closeCompareOverlay();
    }
  }
});

// ── Level Strip (new module — avoids cache issues) ──────────
import { renderLevelStrip, updateLevelXpBar, triggerXpBarVFX } from './level-strip.js?v=9';

// Wrap updateAll to also render the level strip
const _origUpdateAll = updateAll;
function updateAllWithLevels() {
  _origUpdateAll();
  renderLevelStrip();
  updateLevelXpBar();
}

// Re-wire deps to use enhanced updateAll
setXpDeps({ updateAll: updateAllWithLevels, toast, onXpGain: triggerXpBarVFX });
setSimDeps({ updateAll: updateAllWithLevels, renderMatches, toast, getAllMatchDays, onReset: () => showChampionPick() });
setViewerDeps({ updateAll: updateAllWithLevels, renderMatches, toast });

// ── Champion Prediction Screen ─────────────────────────────
let _champPick = null;

function buildChampionGrid() {
  const grid = document.getElementById('champ-grid');
  if (!grid) return;
  // Sort teams by strength descending
  const sorted = [...TEAMS].sort((a, b) => b.str - a.str);
  grid.innerHTML = sorted.map(t => `
    <div class="champ-card" data-tid="${t.id}" onclick="selectChampion('${t.id}')">
      ${flagImg(t.id, 'champ-flag')}
      <span class="champ-name">${t.name}</span>
      <span class="champ-str">${t.str}</span>
    </div>
  `).join('');
}

function selectChampion(tid) {
  _champPick = tid;
  document.querySelectorAll('.champ-card').forEach(c => c.classList.toggle('champ-selected', c.dataset.tid === tid));
  const wrap = document.getElementById('champ-confirm-wrap');
  const preview = document.getElementById('champ-selected-preview');
  if (wrap && preview) {
    const t = T[tid];
    preview.innerHTML = `${flagImg(tid, 'champ-flag')} ${t.name}`;
    wrap.style.display = 'flex';
  }
}

function confirmChampion() {
  if (!_champPick) return;
  state.ST.champion = _champPick;
  saveState();
  // Ensure champion is in the knockout bracket — swap into R32 if needed
  ensureChampionInBracket(_champPick);
  showChampionBadge(_champPick);

  // ── Lock-in feedback animation ──
  const btn = document.getElementById('champ-confirm-btn');
  const overlay = document.getElementById('champion-pick-overlay');
  SFX.lock();

  // Animate button to "locked" state
  if (btn) {
    btn.disabled = true;
    btn.textContent = '✓ PREDICTION LOCKED';
    btn.style.pointerEvents = 'none';
    animateElement(btn, 'anim-stamp', 400);
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    spawnConfetti(cx, cy - 20, 30);
    spawnSparkles(cx, cy, 40, '#f0c870');
  }

  // Flash the selected card
  const card = document.querySelector('.champ-card.champ-selected');
  if (card) {
    animateElement(card, 'anim-glow', 600);
    const cr = card.getBoundingClientRect();
    spawnSparkles(cr.left + cr.width / 2, cr.top + cr.height / 2, 20, '#ffffff');
  }

  // Show a centered "LOCKED IN" banner briefly
  const banner = document.createElement('div');
  banner.className = 'champ-lock-banner';
  banner.innerHTML = `🔒 PREDICTION LOCKED`;
  const content = document.querySelector('.champ-content');
  if (content) content.appendChild(banner);

  // Delayed dismiss — let the animation play
  setTimeout(() => {
    SFX.win();
    if (banner) animateElement(banner, 'champ-banner-out', 400);
  }, 800);

  setTimeout(() => {
    if (banner && banner.parentNode) banner.remove();
    hideChampionPick();
  }, 1400);
}

function showChampionBadge(tid) {
  const el = document.getElementById('lp-champion');
  const flagEl = document.getElementById('lp-champ-flag');
  const nameEl = document.getElementById('lp-champ-name');
  if (!el || !tid) return;
  const team = T[tid];
  if (!team) return;
  flagEl.innerHTML = flagImg(tid, 'flag-img-lg');
  nameEl.textContent = team.name;
  el.style.display = '';
}

function ensureChampionInBracket(tid) {
  const r32 = state.MS.filter(m => m.phaseId === 'r32');
  const inR32 = r32.some(m => m.home === tid || m.away === tid);
  if (inR32) return;
  // Find the team's group and pick a non-top-seed from that group already in R32 to swap
  const team = T[tid];
  if (!team) return;
  const groupTeams = TEAMS.filter(t => t.group === team.group).map(t => t.id);
  // Find a group-mate that IS in R32 and swap them
  for (const gt of groupTeams) {
    if (gt === tid) continue;
    const match = r32.find(m => m.home === gt || m.away === gt);
    if (match) {
      if (match.home === gt) match.home = tid;
      else match.away = tid;
      saveMatches();
      return;
    }
  }
}

function showChampionPick() {
  _champPick = null;
  buildChampionGrid();
  const overlay = document.getElementById('champion-pick-overlay');
  const wrap = document.getElementById('champ-confirm-wrap');
  if (overlay) { overlay.style.display = 'flex'; overlay.classList.remove('champ-hidden'); }
  if (wrap) wrap.style.display = 'none';
}

function hideChampionPick() {
  const overlay = document.getElementById('champion-pick-overlay');
  if (overlay) {
    overlay.classList.add('champ-hidden');
    setTimeout(() => { overlay.style.display = 'none'; }, 500);
  }
}

window.selectChampion = selectChampion;
window.confirmChampion = confirmChampion;

// ── Initialize state and render ────────────────────────────
initState(genMatches);

const hc = document.getElementById('header-center');
if (hc) {
  hc.style.display = 'block';
  hc.textContent = 'TACTICAL BOARD · 2D R6';
}

state.activeDay = getAllMatchDays()[0]?.key || '';
state.activePhase = state.MS.find(m => m.dateKey === state.activeDay)?.phaseId || 'group';
updateAllWithLevels();
renderMatches();

// Show champion pick if no champion selected yet, otherwise show badge
if (!state.ST.champion) {
  showChampionPick();
} else {
  showChampionBadge(state.ST.champion);
}

try {
  const qp = new URLSearchParams(window.location.search);
  if (qp.get('autopen') === '1') {
    const first = state.MS.find(m => m.home !== 'TBD');
    if (first) setTimeout(() => openPreview(first.id), 40);
  }
} catch (e) {}
