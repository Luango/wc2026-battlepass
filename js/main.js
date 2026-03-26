// ═══════════════════════════════════════════════════════════
// MAIN — Entry point: imports, dependency wiring, init
// ═══════════════════════════════════════════════════════════

// Data
import { state, initState, saveState } from './state.js';
import { genMatches } from './matches.js';

// FX
import { registerGlobalRipple } from './visual-fx.js';

// Utils
import { toast, registerErrorHandlers } from './utils.js';

// Calendar
import { setCalendarDeps, getAllMatchDays, setActiveDay, navDay,
         calDragStart, calDragMove, calDragEnd, calTouchStart, calTouchMove } from './calendar.js';

// XP
import { setXpDeps, addXP, openRewardPopup, closeRewardPopup, collectReward } from './xp.js';

// Render
import { updateAll, renderCalendarHUD, renderMatches, setPhase } from './render.js';

// Betting
import { setBetDeps, pickOpt, placeBet, switchBetTab, switchPreviewBetTab } from './betting/bet-actions.js';

// Simulation
import { setSimDeps, simDay, simNext, simAll, resetGame } from './simulation.js';

// Preview
import { setPreviewDeps, openPreview, closePreview, switchLineupTab,
         handlePlayerRowClick, lockPrediction, changeFormation,
         renderPreviewBetting, renderRightPanel, switchRightTab,
         simulateTactical } from './preview.js';

// Player Stats
import { toggleCompareMode, closeCompareOverlay } from './player-stats.js';

// Match Viewer
import { setViewerDeps, openMatchViewer, closeMatchViewer } from './match-viewer.js';

// Bracket
import { setBracketDeps, openBracket, closeBracket, bktOpenMatch } from './bracket.js';

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
  pickOpt, placeBet,
  switchBetTab, switchPreviewBetTab,
  navDay, setActiveDay, setPhase,
  calDragStart, calDragMove, calDragEnd, calTouchStart, calTouchMove,
  openBracket, closeBracket, bktOpenMatch,
  switchLineupTab, handlePlayerRowClick,
  lockPrediction, changeFormation,
  openRewardPopup, closeRewardPopup, collectReward,
  switchRightTab, toggleCompareMode,
  closeCompareOverlay,
  cancelCompare() {}, startCompareFromPopup() {},
  openMatchViewer, closeMatchViewer, simulateTactical,
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
import { renderLevelStrip, updateLevelXpBar, triggerXpBarVFX } from './level-strip.js';

// Wrap updateAll to also render the level strip
const _origUpdateAll = updateAll;
function updateAllWithLevels() {
  _origUpdateAll();
  renderLevelStrip();
  updateLevelXpBar();
}

// Re-wire deps to use enhanced updateAll
setXpDeps({ updateAll: updateAllWithLevels, toast, onXpGain: triggerXpBarVFX });
setSimDeps({ updateAll: updateAllWithLevels, renderMatches, toast, getAllMatchDays });
setViewerDeps({ updateAll: updateAllWithLevels, renderMatches, toast });

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

try {
  const qp = new URLSearchParams(window.location.search);
  if (qp.get('autopen') === '1') {
    const first = state.MS.find(m => m.home !== 'TBD');
    if (first) setTimeout(() => openPreview(first.id), 40);
  }
} catch (e) {}
