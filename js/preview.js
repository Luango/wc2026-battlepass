// ═══════════════════════════════════════════════════════════
// PREVIEW — Tactical board, lineups, player popup, betting panel
// ═══════════════════════════════════════════════════════════
import { state, BET_TYPES } from './state.js';
import { T, flagImg, playerAvatar, loadPlayerPhoto } from './data/teams.js';
import { genSquad } from './data/squads.js';
import { FORMATIONS, FORMATION_PROFILE, parseFormationCounts } from './data/formations.js';
import { SFX } from './audio-fx.js';
import { animateElement, spawnConfetti } from './visual-fx.js';
import { clamp } from './utils.js';
import { openMatchViewer } from './match-viewer.js';
import { renderBetOpts } from './render.js';
import { addXP } from './xp.js';
import { renderStatsPanel, onPlayerSelected, resetStatsState, drawRadar, renderBars,
         startCompare, clearCompare, renderCompareOverlay, closeCompareOverlay } from './player-stats.js';
import { getPlayerStats } from './data/squads.js';

let _deps = {};
export function setPreviewDeps({ renderMatches, toast }) {
  _deps = { renderMatches, toast };
}

function previewPanelFor(side) {
  return document.getElementById(side==='home' ? 'preview-left' : 'preview-right');
}

function ensurePreviewLineup(side, teamId) {
  const squad = genSquad(teamId);
  const maxXI = Math.min(11, squad.length);
  const fallback = Array.from({length:maxXI}, (_,i) => i);
  let lineup = state.previewLineups[side];
  if (!Array.isArray(lineup)) { lineup = []; }
  const uniq = new Set();
  lineup = lineup.filter(i => Number.isInteger(i) && i>=0 && i<squad.length && !uniq.has(i) && (uniq.add(i), true));
  for (let i=0; i<squad.length && lineup.length<maxXI; i++) {
    if (!uniq.has(i)) { uniq.add(i); lineup.push(i); }
  }
  if (lineup.length < maxXI) lineup = fallback;
  state.previewLineups[side] = lineup.slice(0, maxXI);
  return state.previewLineups[side];
}

function lineupSections(side, teamId) {
  const squad = genSquad(teamId);
  const lineup = ensurePreviewLineup(side, teamId);
  const lineupSet = new Set(lineup);
  const bench = squad.map((_, idx) => idx).filter(idx => !lineupSet.has(idx));
  return { squad, lineup, bench };
}

// ── OPEN PREVIEW ───────────────────────────────────────────
export function openPreview(mid) {
  try {
    const m = state.MS.find(x => x.id === mid);
    if (!m || m.home === 'TBD') return;
    const h = T[m.home], a = T[m.away];
    if (!h || !a) return;

    if (document.getElementById('simple-preview') || document.getElementById('preview-modal')
      || document.getElementById('preview-left') || document.getElementById('pitch-wrap')) {
      closePreview();
    }

    SFX.nav();
    state.previewMode = true;
    state.previewMatchId = mid;
    state.previewFormations = {home:'4-3-3', away:'4-3-3'};
    state.previewPredictions = {home:false, away:false};
    state.selectedPlayerId = null;
    state.previewTeams = {home:m.home, away:m.away};
    state.previewLineups = {home:Array.from({length:11},(_,i)=>i), away:Array.from({length:11},(_,i)=>i)};
    state.swapSourceBySide = {home:null, away:null};
    state.fallbackPlayers = [];

    const center = document.getElementById('center-panel');
    const list = document.getElementById('match-list');
    const simBtns = document.getElementById('sim-btns');
    if (list) list.style.display = 'none';
    document.getElementById('left-panel').style.display = 'none';
    document.getElementById('right-panel').style.display = 'none';
    const layout = document.querySelector('.layout');
    if (layout) layout.style.gridTemplateColumns = '1fr';
    if (simBtns) {
      simBtns.style.display = 'flex';
      simBtns.innerHTML = `<button class="btn-back" onclick="closePreview()">&#8592; BACK</button>`;
    }
    document.getElementById('main-title').innerHTML =
      `<span style="display:inline-flex;align-items:center;gap:6px">${flagImg(m.home,'flag-img-sm')} ${h.name} &nbsp;vs&nbsp; ${flagImg(m.away,'flag-img-sm')} ${a.name}</span>`;
    document.getElementById('main-sub').textContent = `${m.phase} · ${m.date} · Tactical Board & Betting`;

    const shell = document.createElement('div');
    shell.id = 'simple-preview';
    shell.innerHTML = `
      <div id="preview-left" class="preview-sp"></div>
      <div class="sp-center"><div id="pitch-wrap"><div id="tactical-board"></div></div></div>
      <div id="preview-right" class="preview-sp right"></div>`;
    center.appendChild(shell);

    state.previewLineupTab = 'home';
    state.previewRightTab = 'betting';
    resetStatsState();
    renderLineupPanel(document.getElementById('preview-left'), m.home, m.away);
    renderRightPanel(document.getElementById('preview-right'), mid);
    initFallbackPitch(document.getElementById('pitch-wrap'), m.home, m.away);
    renderTacticalBoard();
  } catch (err) {
    console.error('openPreview failed:', err);
    closePreview();
    _deps.toast('Tactical board failed to open. Try another match.');
  }
}

// ── CLOSE PREVIEW ──────────────────────────────────────────
export function closePreview() {
  SFX.nav();
  state.previewMode = false;
  state.previewMatchId = null;
  state.previewTeams = {home:null, away:null};
  state.previewLineups = {home:[], away:[]};
  state.swapSourceBySide = {home:null, away:null};
  state.selectedPlayerId = null;
  state.fallbackPlayers = [];
  resetStatsState();

  const modal = document.getElementById('preview-modal');
  if (modal) modal.remove();
  const shell = document.getElementById('simple-preview');
  if (shell) shell.remove();

  const legacyLeft = document.getElementById('preview-left');
  const legacyRight = document.getElementById('preview-right');
  const legacyWrap = document.getElementById('pitch-wrap');
  if (legacyLeft && legacyLeft.id==='preview-left') legacyLeft.remove();
  if (legacyRight && legacyRight.id==='preview-right') legacyRight.remove();
  if (legacyWrap && legacyWrap.id==='pitch-wrap') legacyWrap.remove();

  document.getElementById('left-panel').style.display = '';
  document.getElementById('right-panel').style.display = '';
  const layout = document.querySelector('.layout');
  if (layout) layout.style.gridTemplateColumns = '';

  const list = document.getElementById('match-list');
  if (list) list.style.display = '';
  const simBtns = document.getElementById('sim-btns');
  if (simBtns) {
    simBtns.style.display = 'flex';
    simBtns.innerHTML = `
      <button class="btn-g" onclick="simNext()">&#9654; SIM NEXT</button>
      <button class="btn-g" onclick="simAll()">&#9889; SIM ALL</button>
      <button class="btn-r" onclick="resetGame()">&#8634; RESET</button>`;
  }
  _deps.renderMatches();
  const popup = document.getElementById('player-popup');
  if (popup) popup.style.display = 'none';
}

// ── RENDER PREVIEW PANEL ────────────────────────────────────
function renderPreviewPanel(side, teamId, container) {
  const team = T[teamId];
  if (!team || !container) return;
  const formation = state.previewFormations[side];
  const sections = lineupSections(side, teamId);
  const swapActive = state.swapSourceBySide[side] !== null && state.swapSourceBySide[side] !== undefined;

  container.innerHTML = `
    <div class="preview-sp-head">
      <div class="preview-team-row">
        <span class="preview-flag">${flagImg(teamId,'flag-img-lg')}</span>
        <span class="preview-team-name">${team.name}</span>
      </div>
      <select class="preview-formation-sel" id="formation-${side}"
              onchange="changeFormation('${side}','${teamId}',this.value)">
        <option value="4-3-3" ${formation==='4-3-3'?'selected':''}>4-3-3</option>
        <option value="4-4-2" ${formation==='4-4-2'?'selected':''}>4-4-2</option>
        <option value="4-2-3-1" ${formation==='4-2-3-1'?'selected':''}>4-2-3-1</option>
        <option value="3-5-2" ${formation==='3-5-2'?'selected':''}>3-5-2</option>
      </select>
      <div class="swap-hint${swapActive?' active':''}">
        ${swapActive?'Select a bench player to complete the swap.':'Click a starter, then a sub to predict your XI.'}
      </div>
    </div>
    <div class="roster-list" id="roster-${side}">
      <div class="rsec">Starting XI</div>
      ${sections.lineup.map((squadIdx, slotIdx) =>
        playerRowHTML(sections.squad[squadIdx], squadIdx, slotIdx, side, teamId, 1)).join('')}
      <div class="rsec">Bench</div>
      ${sections.bench.map((squadIdx) =>
        playerRowHTML(sections.squad[squadIdx], squadIdx, null, side, teamId, 0)).join('')}
    </div>
    <button class="lock-pred-btn${state.previewPredictions[side]?' locked':''}"
            id="lockbtn-${side}"
            ${state.previewPredictions[side]?'disabled':''}
            onclick="lockPrediction('${side}','${teamId}')">
      ${state.previewPredictions[side]?'✓ PREDICTION LOCKED':'⚡ LOCK PREDICTION +25 XP'}
    </button>`;
  if (state.selectedPlayerId) {
    const [ss, idxStr] = state.selectedPlayerId.split('-');
    if (ss === side) {
      const idx = Number(idxStr);
      if (!Number.isNaN(idx)) highlightToken(side, idx);
    }
  }
  attachRowHoverListeners(container);
}

// ── TABBED LINEUP PANEL (LEFT) ─────────────────────────────
export function switchLineupTab(side) {
  SFX.tab();
  state.previewLineupTab = side;
  const m = state.MS.find(x => x.id === state.previewMatchId);
  if (!m) return;
  renderLineupPanel(document.getElementById('preview-left'), m.home, m.away);
}

function renderLineupPanel(container, homeId, awayId) {
  if (!container) return;
  const side = state.previewLineupTab;
  const hTeam = T[homeId], aTeam = T[awayId];
  container.innerHTML = `
    <div class="lineup-tabs">
      <div class="lineup-tab${side==='home'?' active':''}" onclick="switchLineupTab('home')">
        ${flagImg(homeId,'flag-img-sm')} ${hTeam.name}
      </div>
      <div class="lineup-tab${side==='away'?' active':''}" onclick="switchLineupTab('away')">
        ${flagImg(awayId,'flag-img-sm')} ${aTeam.name}
      </div>
    </div>`;
  const teamId = side==='home' ? homeId : awayId;
  const inner = document.createElement('div');
  inner.style.cssText = 'display:flex;flex-direction:column;flex:1;overflow:hidden';
  container.appendChild(inner);
  renderPreviewPanel(side, teamId, inner);
}

// ── BETTING PANEL (RIGHT) ──────────────────────────────────
export function renderPreviewBetting(container, mid) {
  if (!container) return;
  const m = state.MS.find(x => x.id === mid);
  if (!m) return;
  const h = T[m.home], a = T[m.away];
  if (!h || !a) return;
  const bet = state.ST.bets[mid];
  const done = m.status === 'settled';
  const activeTab = state.betTabs[mid] || 'match';

  container.innerHTML = `
    <div class="preview-bet-head">
      <div class="preview-bet-head-title">Place Your Bet</div>
    </div>
    <div class="preview-bet-tabs">
      ${BET_TYPES.map(t => `<div class="bet-tab${activeTab===t.id?' active':''}"
        onclick="switchPreviewBetTab(${mid},'${t.id}')">${t.label}</div>`).join('')}
    </div>
    <div class="preview-bet-opts">
      ${renderBetOpts(m, h, a, bet, done)}
    </div>
    <div class="preview-bet-stake">
      <div class="stake" style="border-top:none;padding:0;background:transparent">
        <input class="bi" type="number" id="bi-${mid}" placeholder="Stake (min 10)"
          min="10" max="${state.ST.coins}" ${done||bet?'disabled':''}
          ${bet?`value="${bet.amount}"`:''}/>
        ${!done && !bet
          ? `<button class="btn-bet" onclick="placeBet(event,${mid})">BET</button>`
          : bet
            ? `<span class="bst ${bet.status==='won'?'bst-w':bet.status==='lost'?'bst-l':bet.status==='push'?'bst-p':'bst-p'}">
                ${bet.status==='won'?`WON +${bet.payout}`:bet.status==='lost'?`LOST −${bet.amount}`:bet.status==='push'?`PUSH ↩${bet.amount}`:'PENDING'}
              </span>`
            : ''
        }
      </div>
      <div style="font-size:8px;color:var(--muted);margin-top:4px;text-align:center">Balance: ${state.ST.coins.toLocaleString()} coins</div>
    </div>`;
}

// ── RIGHT PANEL WRAPPER (Betting only, stats shown on hover) ────
export function renderRightPanel(container, mid) {
  if (!container) return;
  container.innerHTML = `<div id="ps-tab-content"></div>`;
  const content = document.getElementById('ps-tab-content');
  renderPreviewBetting(content, mid);
}

export function switchRightTab(tab) {
  // kept for backwards compat — tabs removed, always shows betting
  const container = document.getElementById('preview-right');
  if (container) renderRightPanel(container, state.previewMatchId);
}

function playerRowHTML(pl, squadIdx, slotIdx, side, teamId, isStarter) {
  if (!pl) return '';
  const isSelected = state.selectedPlayerId === `${side}-${squadIdx}`;
  const isSwapSource = state.swapSourceBySide[side] === squadIdx;
  const slotLabel = isStarter ? `XI${(slotIdx||0)+1}` : 'SUB';
  return `<div class="prow${isSelected?' active':''}${isSwapSource?' swap-source':''}" id="prow-${side}-${squadIdx}"
              data-pl='${JSON.stringify({n:pl.n,num:pl.num,p:pl.p,r:pl.r,a:pl.a}).replace(/'/g,"&#39;")}'
              data-teamid="${teamId}"
              onclick="handlePlayerRowClick('${side}',${squadIdx},'${teamId}',${isStarter?1:0})">
    ${playerAvatar(pl.n, 26)}
    <span class="slot-chip${isStarter?'':' sub'}">${slotLabel}</span>
    <span class="pnum">${pl.num}</span>
    <span class="pname-cell">${pl.n}</span>
    <span class="pos-tag pos-${pl.p}">${pl.p}</span>
    <div class="rbar"><div class="rbar-fill" style="width:${(pl.r-55)/40*100}%"></div></div>
    <span style="font-size:12px;color:var(--gold-light);font-weight:700;min-width:24px;text-align:right">${pl.r}</span>
  </div>`;
}

function attachRowHoverListeners(container) {
  if (!container) return;
  container.querySelectorAll('.prow[data-pl]').forEach(row => {
    row.addEventListener('mouseenter', (e) => {
      try {
        const pl = JSON.parse(row.dataset.pl);
        const teamId = row.dataset.teamid;
        showPlayerPopup(pl, teamId, e);
      } catch(_) {}
    });
    row.addEventListener('mouseleave', () => {
      document.getElementById('player-popup').style.display = 'none';
    });
  });
}

export function lockPrediction(side, teamId) {
  if (state.previewPredictions[side]) return;
  state.previewPredictions[side] = true;
  SFX.lock();
  addXP(25);
  _deps.toast(`⚡ Prediction locked for ${T[teamId].name}! +25 XP`);
  const btn = document.getElementById(`lockbtn-${side}`);
  if (btn) {
    btn.textContent = '✓ PREDICTION LOCKED'; btn.disabled = true; btn.classList.add('locked');
    animateElement(btn, 'anim-stamp', 400);
    const r = btn.getBoundingClientRect();
    spawnConfetti(r.left + r.width/2, r.top, 12);
  }
}

export function changeFormation(side, teamId, formation) {
  SFX.formation();
  state.previewFormations[side] = formation;
  applyFormation(side, formation);
  const sel = document.getElementById(`formation-${side}`);
  if (sel) sel.value = formation;
  renderTacticalBoard();
}

// Store selected player data for inline compare
let _selectedPlayerData = null;

function selectPlayer(side, squadIdx, teamId) {
  SFX.click();
  const prev = state.selectedPlayerId;
  const newId = `${side}-${squadIdx}`;

  // If clicking a different player while one is selected → compare
  if (prev && prev !== newId && _selectedPlayerData) {
    const squad = genSquad(teamId);
    const pl = squad[squadIdx];
    if (pl) {
      showComparePopup(_selectedPlayerData, { pl, teamId, side, squadIdx, stats: getPlayerStats(pl) });
    }
    return;
  }

  // Deselect if clicking same player
  if (prev === newId) {
    state.selectedPlayerId = null;
    _selectedPlayerData = null;
    const row = document.getElementById(`prow-${side}-${squadIdx}`);
    if (row) row.classList.remove('active');
    clearTokenHighlights();
    document.getElementById('player-popup').style.display = 'none';
    return;
  }

  state.selectedPlayerId = newId;

  if (prev) {
    const [ps, pi] = prev.split('-');
    const prevRow = document.getElementById(`prow-${ps}-${pi}`);
    if (prevRow) prevRow.classList.remove('active');
  }

  const row = document.getElementById(`prow-${side}-${squadIdx}`);
  if (row) row.classList.add('active');
  highlightToken(side, squadIdx);

  const squad = genSquad(teamId);
  const pl = squad[squadIdx];
  if (pl) {
    _selectedPlayerData = { pl, teamId, side, squadIdx, stats: getPlayerStats(pl) };
    showPlayerPopup(pl, teamId, null);
    onPlayerSelected(pl, teamId, side, squadIdx);
  }
}

function swapStarterWithBench(side, teamId, starterIdx, benchIdx) {
  const lineup = ensurePreviewLineup(side, teamId).slice();
  const starterPos = lineup.indexOf(starterIdx);
  if (starterPos < 0 || lineup.includes(benchIdx)) return false;
  lineup[starterPos] = benchIdx;
  state.previewLineups[side] = lineup;
  return true;
}

export function handlePlayerRowClick(side, squadIdx, teamId, isStarter) {
  selectPlayer(side, squadIdx, teamId);
  const container = previewPanelFor(side);
  if (!container) return;

  if (isStarter) {
    state.swapSourceBySide[side] = squadIdx;
    renderPreviewPanel(side, teamId, container);
    return;
  }

  const starterIdx = state.swapSourceBySide[side];
  if (starterIdx === null || starterIdx === undefined) {
    renderPreviewPanel(side, teamId, container);
    return;
  }

  if (starterIdx !== squadIdx && swapStarterWithBench(side, teamId, starterIdx, squadIdx)) {
    SFX.formation();
    const squad = genSquad(teamId);
    const inName = squad[squadIdx] ? squad[squadIdx].n : 'Bench';
    _deps.toast(`🔁 ${inName} moved into the Starting XI`);
    rebuildPreviewPlayers();
    renderTacticalBoard();
  }
  state.swapSourceBySide[side] = null;
  renderPreviewPanel(side, teamId, container);
}

// ── TACTICAL PREDICTION ────────────────────────────────────
function tacticalSnapshot(side) {
  const teamId = state.previewTeams[side];
  if (!teamId) return null;
  const team = T[teamId];
  if (!team) return null;

  const {squad, lineup} = lineupSections(side, teamId);
  const players = lineup.map(idx => squad[idx]).filter(Boolean);
  if (players.length !== 11) return null;

  const byPos = {GK:[], DEF:[], MID:[], FWD:[]};
  players.forEach(pl => { (byPos[pl.p] || byPos.MID).push(pl.r); });
  const avg = (arr, fallback) => arr.length ? arr.reduce((a,b) => a+b, 0)/arr.length : fallback;
  const gk = avg(byPos.GK, team.str*0.82);
  const def = avg(byPos.DEF, team.str*0.82);
  const mid = avg(byPos.MID, team.str*0.84);
  const fwd = avg(byPos.FWD, team.str*0.85);

  const formation = state.previewFormations[side];
  const expected = parseFormationCounts(formation);
  const actual = {DEF:byPos.DEF.length, MID:byPos.MID.length, FWD:byPos.FWD.length};
  const mismatch = Math.abs(expected.DEF-actual.DEF) + Math.abs(expected.MID-actual.MID) + Math.abs(expected.FWD-actual.FWD);
  const olderPlayers = players.filter(pl => pl.a >= 33).length;
  const profile = FORMATION_PROFILE[formation] || {atk:0, mid:0, def:0};

  const chemistry = clamp(92 - mismatch*8 - Math.max(0, olderPlayers-2)*1.8 + (team.str-75)*0.1, 62, 98);
  const attack = fwd*0.55 + mid*0.25 + team.str*0.2 + profile.atk;
  const midfield = mid*0.58 + def*0.12 + team.str*0.3 + profile.mid;
  const defense = def*0.52 + gk*0.3 + mid*0.18 + profile.def;

  return { team, teamId, formation, attack, midfield, defense, chemistry };
}

function tacticalPrediction() {
  const home = tacticalSnapshot('home');
  const away = tacticalSnapshot('away');
  if (!home || !away) return null;

  const homeEdge = (home.attack-away.defense)*0.6 + (home.midfield-away.midfield)*0.35 + (home.chemistry-away.chemistry)*0.25 + 2.4;
  const awayEdge = (away.attack-home.defense)*0.6 + (away.midfield-home.midfield)*0.35 + (away.chemistry-home.chemistry)*0.25;

  const homeXg = clamp(1.15 + homeEdge/22, 0.25, 3.8);
  const awayXg = clamp(0.95 + awayEdge/22, 0.2, 3.5);

  const diff = (homeXg-awayXg) + (home.chemistry-away.chemistry)/120;
  let homeP = clamp(0.46 + diff*0.14, 0.12, 0.78);
  let drawP = clamp(0.24 - Math.abs(diff)*0.06 + ((home.chemistry+away.chemistry)/2-80)/300, 0.1, 0.3);
  let awayP = 1 - homeP - drawP;

  if (awayP < 0.1) {
    const delta = 0.1 - awayP;
    awayP = 0.1;
    homeP = clamp(homeP - delta, 0.12, 0.78);
  }
  const total = homeP + drawP + awayP;
  homeP /= total; drawP /= total; awayP /= total;

  return { home, away, homeXg, awayXg, homeP, drawP, awayP };
}

function renderTacticalBoard() {
  const board = document.getElementById('tactical-board');
  if (!board) return;
  const p = tacticalPrediction();
  if (!p) { board.innerHTML = ''; return; }

  const fmt = (n) => n.toFixed(2);
  const pct = (n) => Math.round(n*100);
  board.innerHTML = `
    <div class="tb-head">
      <span class="tb-title">Predicted Formation Outcome</span>
      <span class="tb-score">${fmt(p.homeXg)} : ${fmt(p.awayXg)}</span>
    </div>
    <div class="tb-prob">
      <span class="tb-prob-lbl">${p.home.team.id}</span>
      <div class="tb-bar"><div class="tb-bar-fill" style="width:${pct(p.homeP)}%;background:linear-gradient(90deg,#8f6b26,#f0c870)"></div></div>
      <span class="tb-prob-val">${pct(p.homeP)}%</span>
    </div>
    <div class="tb-prob">
      <span class="tb-prob-lbl">Draw</span>
      <div class="tb-bar"><div class="tb-bar-fill" style="width:${pct(p.drawP)}%;background:linear-gradient(90deg,#657080,#9aa7bd)"></div></div>
      <span class="tb-prob-val">${pct(p.drawP)}%</span>
    </div>
    <div class="tb-prob">
      <span class="tb-prob-lbl">${p.away.team.id}</span>
      <div class="tb-bar"><div class="tb-bar-fill" style="width:${pct(p.awayP)}%;background:linear-gradient(90deg,#315a86,#67b0f0)"></div></div>
      <span class="tb-prob-val">${pct(p.awayP)}%</span>
    </div>
    <div class="tb-metrics">
      <div class="tb-m"><span class="tb-m-k">Home Attack</span><span class="tb-m-v">${Math.round(p.home.attack)}</span></div>
      <div class="tb-m"><span class="tb-m-k">Away Attack</span><span class="tb-m-v">${Math.round(p.away.attack)}</span></div>
      <div class="tb-m"><span class="tb-m-k">Home Midfield</span><span class="tb-m-v">${Math.round(p.home.midfield)}</span></div>
      <div class="tb-m"><span class="tb-m-k">Away Midfield</span><span class="tb-m-v">${Math.round(p.away.midfield)}</span></div>
      <div class="tb-m"><span class="tb-m-k">Home Chemistry</span><span class="tb-m-v">${Math.round(p.home.chemistry)}</span></div>
      <div class="tb-m"><span class="tb-m-k">Away Chemistry</span><span class="tb-m-v">${Math.round(p.away.chemistry)}</span></div>
    </div>
    <button class="tb-sim-btn" onclick="simulateTactical()">▶ SIMULATE MATCH</button>`;
}

// ── SIMULATE TACTICAL — launch match viewer with user's lineup ──
export function simulateTactical() {
  if (!state.previewMatchId) return;
  const m = state.MS.find(x => x.id === state.previewMatchId);
  if (!m || m.status !== 'pending') {
    if (_deps.toast) _deps.toast('This match has already been settled');
    return;
  }
  // Gather user's lineup config
  const lineupConfig = {
    homeFormation: state.previewFormations.home || '4-3-3',
    awayFormation: state.previewFormations.away || '4-3-3',
    homeLineup: state.previewLineups.home || [],
    awayLineup: state.previewLineups.away || [],
  };
  // Close preview first, then open the viewer
  closePreview();
  openMatchViewer(m.id, lineupConfig);
}

// ── 2D TACTICAL BOARD ──────────────────────────────────────
function rebuildPreviewPlayers() {
  rebuildFallbackPlayers();
}

function initFallbackPitch(wrap, homeId, awayId) {
  if (!wrap) return;
  let fallback = document.getElementById('pitch-fallback');
  if (!fallback) {
    fallback = document.createElement('div');
    fallback.id = 'pitch-fallback';
    const circle = document.createElement('div');
    circle.className = 'fp-circle';
    fallback.appendChild(circle);
    ['fp-penalty-left','fp-penalty-right','fp-goal-left','fp-goal-right',
     'fp-arc-left','fp-arc-right'].forEach(cls => {
      const el = document.createElement('div');
      el.className = cls;
      fallback.appendChild(el);
    });
    [['15.22%'],['50%'],['84.78%']].forEach(([x]) => {
      const dot = document.createElement('div');
      dot.className = 'fp-spot';
      dot.style.left = x;
      fallback.appendChild(dot);
    });
    wrap.appendChild(fallback);
  }
  renderFallbackPlayers(homeId, awayId);
}

function fallbackSlotPercent(nx, isAway) {
  if (isAway) return 94 - nx * 44;
  return 6 + nx * 44;
}

function renderFallbackPlayers(homeId, awayId) {
  const fallback = document.getElementById('pitch-fallback');
  if (!fallback) return;
  if (!T[homeId] || !T[awayId]) return;
  fallback.querySelectorAll('.fp-token').forEach(el => el.remove());
  state.fallbackPlayers = [];

  function buildSide(side, teamId, isAway) {
    const {squad, lineup} = lineupSections(side, teamId);
    const slots = FORMATIONS[state.previewFormations[side]] || FORMATIONS['4-3-3'];
    for (let i=0; i<11; i++) {
      const squadIdx = lineup[i];
      const pl = squad[squadIdx];
      const slot = slots[i] || slots[0];
      if (!pl || !slot) continue;
      const token = document.createElement('div');
      token.className = `fp-token ${side}${pl.p==='GK'?' gk':''}`;
      token.style.left = fallbackSlotPercent(slot.nx, isAway) + '%';
      token.style.top = (slot.ny*100) + '%';
      token.title = `#${pl.num} ${pl.n} (${pl.p})`;

      const avatarSeed = encodeURIComponent(pl.n);
      const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${avatarSeed}&clothing=shirtCrewNeck&backgroundColor=1a2438&top=shortFlat,shortCurly,shortRound,sides,theCaesar,hijab,dreads01&style=default`;
      const img = document.createElement('img');
      img.className = 'fp-avatar';
      img.src = avatarUrl;
      img.alt = pl.n;
      img.loading = 'lazy';
      token.appendChild(img);

      const badge = document.createElement('span');
      badge.className = 'fp-badge';
      badge.textContent = String(pl.num);
      token.appendChild(badge);

      const nameLabel = document.createElement('span');
      nameLabel.className = 'fp-name';
      const surname = pl.n.split(' ').pop();
      nameLabel.textContent = surname.length > 10 ? surname.slice(0, 9) + '.' : surname;
      token.appendChild(nameLabel);

      loadPlayerPhoto(pl.n).then(url => {
        if (!url || !token.isConnected) return;
        img.src = url;
      });

      token.addEventListener('mouseenter', (event) => {
        clearTokenHighlights();
        token.classList.add('hover');
        showPlayerPopup(pl, teamId, event);
      });
      token.addEventListener('mouseleave', () => {
        document.getElementById('player-popup').style.display = 'none';
        clearTokenHighlights();
        restoreSelectedHighlight();
      });
      token.addEventListener('click', (event) => {
        event.stopPropagation();
        selectPlayer(side, squadIdx, teamId);
      });
      fallback.appendChild(token);
      state.fallbackPlayers.push({el:token, team:side, teamId, squadIdx});
    }
  }

  buildSide('home', homeId, false);
  buildSide('away', awayId, true);
  restoreSelectedHighlight();
}

function rebuildFallbackPlayers() {
  if (!state.previewMode || !state.previewTeams.home || !state.previewTeams.away) return;
  renderFallbackPlayers(state.previewTeams.home, state.previewTeams.away);
}

function applyFormation(side, formation) {
  rebuildFallbackPlayers();
}

function clearTokenHighlights() {
  state.fallbackPlayers.forEach(fp => fp.el.classList.remove('active', 'hover'));
}

function restoreSelectedHighlight() {
  if (!state.selectedPlayerId) return;
  const [side, idxStr] = state.selectedPlayerId.split('-');
  const idx = Number(idxStr);
  if (Number.isNaN(idx)) return;
  const fp = state.fallbackPlayers.find(p => p.team===side && p.squadIdx===idx);
  if (fp) fp.el.classList.add('active');
}

function highlightToken(side, idx) {
  clearTokenHighlights();
  const fp = state.fallbackPlayers.find(p => p.team===side && p.squadIdx===idx);
  if (fp) fp.el.classList.add('active');
}

// ── PLAYER POPUP (rich stats panel on hover) ────────────────
function showPlayerPopup(pl, teamId, event) {
  const popup = document.getElementById('player-popup');
  const stats = getPlayerStats(pl);
  const avatarHtml = playerAvatar(pl.n, 48);

  popup.innerHTML = `
    <div class="pp-header">
      <div class="pp-avatar" id="popup-photo-wrap">${avatarHtml}</div>
      <div class="pp-info">
        <div class="pp-name">#${pl.num} ${pl.n}</div>
        <div class="pp-meta">
          ${flagImg(teamId,'flag-img-sm')}
          <span>${T[teamId]?.name||''} &middot; ${pl.p} &middot; Age ${pl.a}</span>
        </div>
      </div>
      <div class="pp-ovr">${pl.r}</div>
    </div>
    <div class="pp-radar" id="pp-radar-wrap"></div>
    <div class="pp-details">
      <span>Height: ${stats.height}cm</span>
      <span>Foot: ${stats.foot==='R'?'Right':'Left'}</span>
    </div>
    <div class="pp-bars" id="pp-bars"></div>
    <div class="pp-compare-btn" onclick="startCompareFromPopup(this)" data-pl='${JSON.stringify({n:pl.n,num:pl.num,p:pl.p,r:pl.r,a:pl.a}).replace(/'/g,"&#39;")}' data-teamid="${teamId}">&#9876; COMPARE</div>`;

  // Draw radar chart
  const canvas = document.createElement('canvas');
  canvas.width = 180; canvas.height = 180;
  document.getElementById('pp-radar-wrap')?.appendChild(canvas);
  drawRadar(canvas, [stats]);

  // Render stat bars
  renderBars(document.getElementById('pp-bars'), stats);

  popup.style.display = 'block';

  // Position popup near cursor but keep on screen
  if (event) {
    const pad = 12;
    let x = event.clientX + pad;
    let y = event.clientY - 40;
    const pw = 300, ph = 420;
    if (x + pw > window.innerWidth) x = event.clientX - pw - pad;
    if (y + ph > window.innerHeight) y = window.innerHeight - ph - pad;
    if (y < pad) y = pad;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
  }

  loadPlayerPhoto(pl.n).then(url => {
    if (!url) return;
    const wrap = document.getElementById('popup-photo-wrap');
    if (!wrap) return;
    wrap.innerHTML = `<img src="${url}" alt="${pl.n}" style="width:48px;height:48px;object-fit:cover;object-position:top center;display:block;border-radius:50%" onerror="this.style.display='none'">`;
  });
}
