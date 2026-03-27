// ═══════════════════════════════════════════════════════════
// PREVIEW — Tactical board, lineups, player popup, betting panel
// ═══════════════════════════════════════════════════════════
import { state, BET_TYPES, saveState, saveMatches } from './state.js?v=9';
import { T, flagImg, playerAvatar, loadPlayerPhoto } from './data/teams.js?v=9';
import { genSquad } from './data/squads.js?v=9';
import { FORMATIONS, FORMATION_PROFILE, parseFormationCounts } from './data/formations.js?v=9';
import { SFX } from './audio-fx.js?v=9';
import { animateElement, spawnConfetti } from './visual-fx.js?v=9';
import { clamp } from './utils.js?v=9';
import { openMatchViewer } from './match-viewer.js?v=9';
import { simulateMatch, EVT, SUBSTEPS } from './match-engine.js?v=9';
import { renderBetOpts } from './render.js?v=9';
import { addXP } from './xp.js?v=9';
import { simMatchStats } from './matches.js?v=9';
import { resolveBet } from './betting/settlement.js?v=9';
import { calcGoalscorerOdds } from './betting/odds.js?v=9';
import { advanceWinner } from './simulation.js?v=9';
import { renderStatsPanel, onPlayerSelected, resetStatsState, drawRadar, renderBars,
         startCompare, clearCompare, renderCompareOverlay, closeCompareOverlay } from './player-stats.js?v=9';
import { getPlayerStats } from './data/squads.js?v=9';
import { getAITicker, getAIVerdict, generateMatchNews, generateAIResponse, aiChatHistory } from './ai-system.js?v=9';

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
      <div class="sp-center">
        <div id="pitch-betting-top" class="pitch-betting-top">
          <button class="pitch-bet-btn pitch-bet-home" onclick="openQuickS11Bet(${mid},'home')">
            <span class="pitch-bet-flag">${flagImg(m.home)}</span>
            <span class="pitch-bet-label">${h.name}</span>
            <span class="pitch-bet-cta">Bet Starting 11</span>
          </button>
          <button class="pitch-bet-btn pitch-bet-away" onclick="openQuickS11Bet(${mid},'away')">
            <span class="pitch-bet-flag">${flagImg(m.away)}</span>
            <span class="pitch-bet-label">${a.name}</span>
            <span class="pitch-bet-cta">Bet Starting 11</span>
          </button>
        </div>
        <div id="pitch-wrap"><div id="tactical-board"></div></div>
      </div>
      <div id="preview-right" class="preview-sp right"></div>`;
    center.appendChild(shell);

    state.previewLineupTab = 'home';
    state.aiChatOpen = false;
    state.aiFloatTab = 'chat';
    state.quickBetS11 = null;
    resetStatsState();
    renderLineupPanel(document.getElementById('preview-left'), m.home, m.away);
    renderRightPanel(document.getElementById('preview-right'), mid);
    initFallbackPitch(document.getElementById('pitch-wrap'), m.home, m.away);
    renderTacticalBoard();
    renderAITicker(mid);
    renderFloatingAIChat(mid);
  } catch (err) {
    console.error('openPreview failed:', err);
    closePreview();
    _deps.toast('Tactical board failed to open. Try another match.');
  }
}

// ── CLOSE PREVIEW ──────────────────────────────────────────
export function closePreview() {
  // Clean up inline simulation if running
  if (inlineSim) {
    inlineStopPlay();
    inlineSim = null;
  }
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
  removeFloatingAIChat();
}

// ── QUICK STARTING 11 BETTING ───────────────────────────────
export function openQuickS11Bet(mid, side) {
  const m = state.MS.find(x => x.id === mid);
  if (!m) return;
  const teamId = side === 'home' ? m.home : m.away;
  const team = T[teamId];
  if (!team) return;

  state.quickBetS11 = { mid, side, teamId, amount: 0 };

  const modal = document.createElement('div');
  modal.id = 'quick-s11-modal';
  modal.className = 'quick-s11-modal';
  modal.innerHTML = `
    <div class="quick-s11-content">
      <div class="quick-s11-header">
        <span class="quick-s11-flag">${flagImg(teamId)}</span>
        <span class="quick-s11-team">${team.name}</span>
        <span class="quick-s11-market">Bet Starting 11</span>
      </div>
      <div class="quick-s11-chips">
        <button class="s11-chip" onclick="selectQuickS11Amount(10)">10</button>
        <button class="s11-chip" onclick="selectQuickS11Amount(25)">25</button>
        <button class="s11-chip" onclick="selectQuickS11Amount(50)">50</button>
        <button class="s11-chip" onclick="selectQuickS11Amount(100)">100</button>
        <button class="s11-chip s11-chip-all" onclick="selectQuickS11Amount(${state.ST.coins})">ALL IN</button>
      </div>
      <div class="quick-s11-amount-display" id="quick-s11-amt">Pick amount</div>
      <div class="quick-s11-actions">
        <button class="s11-btn-confirm" onclick="confirmQuickS11Bet()">🎲 BET NOW</button>
        <button class="s11-btn-cancel" onclick="closeQuickS11Bet()">✕ CANCEL</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

export function selectQuickS11Amount(amt) {
  if (state.quickBetS11) {
    state.quickBetS11.amount = amt;
    const display = document.getElementById('quick-s11-amt');
    if (display) display.textContent = `${amt} 🪙`;
  }
}

export function confirmQuickS11Bet() {
  if (!state.quickBetS11 || state.quickBetS11.amount === 0) {
    _deps.toast('Please select an amount');
    return;
  }
  const { mid, side } = state.quickBetS11;
  const m = state.MS.find(x => x.id === mid);
  if (!m) return;

  closeQuickS11Bet();

  // Switch to starting11 tab and open the betting panel
  state.betTabs = state.betTabs || {};
  state.betTabs[mid] = 'starting11';
  state.previewMatchId = mid;

  const rightPanel = document.getElementById('preview-right');
  if (rightPanel) {
    renderRightPanel(rightPanel, mid);
    rightPanel.scrollTop = 0;
  }

  // Show toast for user feedback
  _deps.toast('Starting 11 betting opened. Select player to bet.');
}

export function closeQuickS11Bet() {
  const modal = document.getElementById('quick-s11-modal');
  if (modal) modal.remove();
  state.quickBetS11 = null;
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
        ${swapActive
          ? (isPlayerInLineup(side, teamId, state.swapSourceBySide[side])
            ? 'Select a bench player to complete the swap.'
            : 'Select a starter to complete the swap.')
          : 'Click a starter or sub to swap players.'}
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
  const bets = Array.isArray(state.ST.bets[mid]) ? state.ST.bets[mid] : (state.ST.bets[mid] ? [state.ST.bets[mid]] : []);
  const done = m.status === 'settled';
  const activeTab = state.betTabs[mid] || 'match';

  container.innerHTML = `
    <div class="preview-bet-head">
      <div class="preview-bet-head-beacon">⚡</div>
      <div class="preview-bet-head-title">🎯 PLACE YOUR BET 🎯</div>
      <div class="preview-bet-head-badge">${bets.length} active</div>
    </div>
    <div class="preview-bet-tabs">
      ${BET_TYPES.filter(t => t.visible !== false).map(t => `<div class="bet-tab${activeTab===t.id?' active':''}"
        onclick="switchPreviewBetTab(${mid},'${t.id}')">${t.label}</div>`).join('')}
    </div>
    <div class="preview-bet-opts">
      ${renderBetOpts(m, h, a, null, done)}
    </div>
    <div class="preview-bet-stake">
      ${!done ? `
        <div class="chip-buttons">
          <button class="chip-btn" onclick="selectStake(event,${mid},10)">10</button>
          <button class="chip-btn" onclick="selectStake(event,${mid},25)">25</button>
          <button class="chip-btn" onclick="selectStake(event,${mid},50)">50</button>
          <button class="chip-btn" onclick="selectStake(event,${mid},100)">100</button>
          <button class="chip-btn chip-all" onclick="selectStake(event,${mid},${state.ST.coins})">ALL IN</button>
        </div>
        <div class="stake-confirm">
          <div class="stake-amount" id="stake-display-${mid}">Pick amount</div>
          <button class="btn-bet" onclick="placeBet(event,${mid})">🎲 BET NOW</button>
        </div>
        <input type="hidden" id="bi-${mid}" value="0"/>
      ` : ''}
      <div class="balance-display">Balance: ${state.ST.coins.toLocaleString()} ✨</div>
    </div>
    ${bets.length > 0 ? `
      <div class="preview-active-bets">
        <div class="preview-active-bets-title">Active Bets (${bets.length})</div>
        ${bets.map((bet, idx) => `
          <div class="active-bet-item bet-${bet.status}">
            <div class="abi-label">${bet.type.toUpperCase()}</div>
            <div class="abi-pick">${bet.pick.replace(/_/g, ' ')}</div>
            <div class="abi-odds">@ ${bet.odds}x</div>
            <div class="abi-amount">${bet.amount}c</div>
            <div class="abi-status">${bet.status.toUpperCase()}</div>
            ${bet.status === 'won' ? `<div class="abi-payout">+${bet.payout}</div>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}`;
}

// ── RIGHT PANEL WRAPPER (betting only — AI is distributed) ────
export function renderRightPanel(container, mid) {
  if (!container) return;
  renderPreviewBetting(container, mid);
}

// Keep switchRightTab as no-op for backwards compat
export function switchRightTab(tab) {}

// ── AI TICKER ON TACTICAL BOARD ───────────────────────────────
function renderAITicker(mid) {
  const existing = document.getElementById('ai-ticker');
  if (existing) existing.remove();
  const pitchWrap = document.getElementById('pitch-wrap');
  if (!pitchWrap) return;

  const insights = getAITicker(mid);
  const verdict = getAIVerdict(mid);
  const tickerText = insights.join('  ●  ');

  const ticker = document.createElement('div');
  ticker.id = 'ai-ticker';
  ticker.className = 'ai-ticker';
  ticker.innerHTML = `
    <div class="ai-ticker-label">🤖 AI</div>
    <div class="ai-ticker-scroll">
      <span class="ai-ticker-text">${tickerText}  ●  ${tickerText}</span>
    </div>
    ${verdict ? `<div class="ai-ticker-verdict">
      <span class="ai-ticker-pick">${verdict.label}</span>
      <span class="ai-ticker-conf ${verdict.confidence >= 55 ? 'conf-strong' : 'conf-lean'}">${verdict.confidence}%</span>
    </div>` : ''}`;
  pitchWrap.appendChild(ticker);
}

// ── FLOATING AI CHAT WIDGET ──────────────────────────────────
function renderFloatingAIChat(mid) {
  let widget = document.getElementById('ai-float-widget');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'ai-float-widget';
    document.body.appendChild(widget);
  }

  const isOpen = state.aiChatOpen;
  const news = generateMatchNews(mid);
  if (!aiChatHistory[mid]) aiChatHistory[mid] = [];
  const chatMsgs = aiChatHistory[mid];

  if (!isOpen) {
    widget.className = 'ai-float-widget collapsed';
    widget.innerHTML = `<button class="ai-float-btn" onclick="toggleAIChat()">
      <img src="img/blubo.svg" alt="Blubo AI" class="ai-float-icon-img">
      <span class="ai-float-label">AI Analyst</span>
    </button>`;
    return;
  }

  widget.className = 'ai-float-widget expanded';
  widget.innerHTML = `
    <div class="ai-float-header">
      <div class="ai-float-title">
        <img src="img/blubo.svg" alt="Blubo" class="ai-header-icon">
        <span>AI MATCH ANALYST</span>
      </div>
      <button class="ai-float-close" onclick="toggleAIChat()">✕</button>
    </div>
    <div class="ai-float-tabs">
      <div class="ai-float-tab${state.aiFloatTab === 'chat' ? ' active' : ''}" onclick="switchAIFloatTab('chat')">Chat</div>
      <div class="ai-float-tab${state.aiFloatTab === 'intel' ? ' active' : ''}" onclick="switchAIFloatTab('intel')">Intel Feed</div>
    </div>
    ${state.aiFloatTab === 'intel' ? `
      <div class="ai-float-intel">
        ${news.map(n => `
          <div class="ai-news-item">
            <div class="ai-news-cat"><span class="ai-news-icon">${n.icon}</span> ${n.cat}</div>
            <div class="ai-news-text">${n.text}</div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="ai-float-messages" id="ai-chat-messages">
        <div class="ai-chat-msg ai-bot">
          <div class="ai-chat-avatar"><img src="img/blubo.svg" alt="Blubo" class="ai-avatar-img"></div>
          <div class="ai-chat-bubble">Hey! I'm Blubo, your AI analyst. Ask me about predictions, tactics, value bets, or any player!</div>
        </div>
        ${chatMsgs.map(msg => `
          <div class="ai-chat-msg ${msg.from}">
            <div class="ai-chat-avatar">${msg.from === 'ai-bot' ? '<img src="img/blubo.svg" alt="Blubo" class="ai-avatar-img">' : '👤'}</div>
            <div class="ai-chat-bubble">${msg.text}</div>
          </div>
        `).join('')}
      </div>
      <div class="ai-float-suggestions">
        <div class="ai-chip" onclick="aiAsk('Who will win?')">Who wins?</div>
        <div class="ai-chip" onclick="aiAsk('Best player to watch?')">Star player</div>
        <div class="ai-chip" onclick="aiAsk('Betting tips?')">Bet tips</div>
        <div class="ai-chip" onclick="aiAsk('Any value picks?')">Value picks</div>
      </div>
      <div class="ai-float-input">
        <input class="ai-chat-input" id="ai-chat-input" type="text" placeholder="Ask about this match..."
               onkeydown="if(event.key==='Enter')aiSendChat()" />
        <button class="ai-send-btn" onclick="aiSendChat()">➤</button>
      </div>
    `}`;

  // Scroll chat to bottom
  setTimeout(() => {
    const msgs = document.getElementById('ai-chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 50);
}

export function toggleAIChat() {
  state.aiChatOpen = !state.aiChatOpen;
  SFX.tab();
  renderFloatingAIChat(state.previewMatchId);
}

export function switchAIFloatTab(tab) {
  state.aiFloatTab = tab;
  renderFloatingAIChat(state.previewMatchId);
}

export function aiAsk(question) {
  // Ensure chat tab is visible
  if (!state.aiChatOpen) { state.aiChatOpen = true; }
  state.aiFloatTab = 'chat';
  const input = document.getElementById('ai-chat-input');
  if (input) input.value = question;
  // Tiny delay to let DOM render if we just opened
  setTimeout(() => aiSendChat(), 20);
}

export function aiSendChat() {
  const input = document.getElementById('ai-chat-input');
  if (!input || !input.value.trim()) return;
  const question = input.value.trim();
  input.value = '';
  const mid = state.previewMatchId;
  if (!aiChatHistory[mid]) aiChatHistory[mid] = [];

  aiChatHistory[mid].push({ from: 'ai-user', text: question });
  const response = generateAIResponse(question, mid);
  aiChatHistory[mid].push({ from: 'ai-bot', text: response });

  renderFloatingAIChat(mid);
  SFX.nav();
}

function removeFloatingAIChat() {
  const widget = document.getElementById('ai-float-widget');
  if (widget) widget.remove();
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

  if (prev) {
    const [ps, pi] = prev.split('-');
    const prevRow = document.getElementById(`prow-${ps}-${pi}`);
    if (prevRow) prevRow.classList.remove('active');
  }

  state.selectedPlayerId = newId;
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

// ── COMPARE FROM POPUP ──────────────────────────────────────
export function showComparePopup(playerDataA, playerDataB) {
  import('./player-stats.js?v=9').then(mod => {
    mod.psState.comparePlayerA = playerDataA;
    mod.psState.comparePlayerB = playerDataB;
    mod.renderCompareOverlay();
  });
}

export function startCompareFromPopup(btn) {
  if (!btn) return;
  try {
    const pl = JSON.parse(btn.dataset.pl);
    const teamId = btn.dataset.teamid;
    const stats = getPlayerStats(pl);
    const entry = { pl, teamId, stats };

    if (_selectedPlayerData &&
        !(_selectedPlayerData.teamId === teamId && _selectedPlayerData.pl.n === pl.n)) {
      // We already have a selected player — compare immediately
      showComparePopup(_selectedPlayerData, entry);
    } else {
      // No other player selected — enter compare mode with this as player A
      import('./player-stats.js?v=9').then(mod => {
        mod.psState.compareMode = true;
        mod.psState.comparePlayerA = entry;
        mod.psState.comparePlayerB = null;
        _deps.toast('Compare mode: select a second player');
        const content = document.getElementById('ps-tab-content');
        if (content) mod.renderStatsPanel(content);
      });
    }
    // Hide popup after clicking compare
    document.getElementById('player-popup').style.display = 'none';
  } catch (e) {
    console.error('startCompareFromPopup:', e);
  }
}

function isPlayerInLineup(side, teamId, squadIdx) {
  const lineup = ensurePreviewLineup(side, teamId);
  return lineup.includes(squadIdx);
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

  const swapSource = state.swapSourceBySide[side];
  const hasSwapSource = swapSource !== null && swapSource !== undefined;

  if (isStarter) {
    if (hasSwapSource && !isPlayerInLineup(side, teamId, swapSource)) {
      // Source was a bench player → complete the swap (bench→starter direction)
      if (swapSource !== squadIdx && swapStarterWithBench(side, teamId, squadIdx, swapSource)) {
        SFX.formation();
        const squad = genSquad(teamId);
        const inName = squad[swapSource] ? squad[swapSource].n : 'Bench';
        _deps.toast(`🔁 ${inName} moved into the Starting XI`);
        rebuildPreviewPlayers();
        renderTacticalBoard();
      }
      state.swapSourceBySide[side] = null;
      renderPreviewPanel(side, teamId, container);
      return;
    }
    // Select this starter as swap source
    state.swapSourceBySide[side] = squadIdx;
    renderPreviewPanel(side, teamId, container);
    return;
  }

  // Clicked a bench player
  if (hasSwapSource && isPlayerInLineup(side, teamId, swapSource)) {
    // Source was a starter → complete the swap (starter→bench direction)
    if (swapSource !== squadIdx && swapStarterWithBench(side, teamId, swapSource, squadIdx)) {
      SFX.formation();
      const squad = genSquad(teamId);
      const inName = squad[squadIdx] ? squad[squadIdx].n : 'Bench';
      _deps.toast(`🔁 ${inName} moved into the Starting XI`);
      rebuildPreviewPlayers();
      renderTacticalBoard();
    }
    state.swapSourceBySide[side] = null;
    renderPreviewPanel(side, teamId, container);
    return;
  }

  // No swap source yet — select this bench player as swap source
  state.swapSourceBySide[side] = squadIdx;
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

// ═══════════════════════════════════════════════════════════
// INLINE MATCH SIMULATION — plays on the tactical pitch itself
// ═══════════════════════════════════════════════════════════
let inlineSim = null; // { simData, currentFrame, currentMinute, playSpeed, isPlaying, playTimer, match, eventLogEntries, lastEventMinute }

const INLINE_TICK_MS = 800;
const INLINE_FRAME_MS = INLINE_TICK_MS / SUBSTEPS;

export function simulateTactical() {
  if (!state.previewMatchId) return;
  const m = state.MS.find(x => x.id === state.previewMatchId);
  if (!m || m.status !== 'pending') {
    if (_deps.toast) _deps.toast('This match has already been settled');
    return;
  }

  const hf = state.previewFormations.home || '4-3-3';
  const af = state.previewFormations.away || '4-3-3';
  const hLineup = state.previewLineups.home || [];
  const aLineup = state.previewLineups.away || [];

  const simData = simulateMatch(m, hf, af, hLineup, aLineup);
  if (!simData) return;

  SFX.sim();

  inlineSim = {
    simData,
    currentFrame: 0,
    currentMinute: 0,
    playSpeed: 1,
    isPlaying: false,
    playTimer: null,
    match: m,
    eventLogEntries: [],
    lastEventMinute: -1,
  };

  enterSimMode();
  inlineRenderFrame();
  setTimeout(() => inlineStartPlay(), 600);
}

function enterSimMode() {
  const m = inlineSim.match;
  const h = T[m.home], a = T[m.away];
  const fallback = document.getElementById('pitch-fallback');

  // Hide formation tokens
  if (fallback) {
    fallback.querySelectorAll('.fp-token').forEach(el => el.style.display = 'none');
  }

  // Hide tactical board prediction overlay
  const board = document.getElementById('tactical-board');
  if (board) board.style.display = 'none';

  // Add sim-mode class to pitch-wrap
  const pitchWrap = document.getElementById('pitch-wrap');
  if (pitchWrap) pitchWrap.classList.add('sim-active');

  // Create inline scoreboard above pitch
  let scoreboard = document.getElementById('inline-sim-scoreboard');
  if (!scoreboard) {
    scoreboard = document.createElement('div');
    scoreboard.id = 'inline-sim-scoreboard';
    pitchWrap?.parentElement?.insertBefore(scoreboard, pitchWrap);
  }
  scoreboard.innerHTML = `
    <div class="isim-sb">
      <div class="isim-sb-team isim-sb-home">
        <span class="isim-sb-flag">${flagImg(m.home, 'isim-flag')}</span>
        <span class="isim-sb-name">${h.name}</span>
      </div>
      <div class="isim-sb-center">
        <span class="isim-score" id="isim-score-h">0</span>
        <span class="isim-score-sep">–</span>
        <span class="isim-score" id="isim-score-a">0</span>
        <div class="isim-clock" id="isim-clock">0'</div>
      </div>
      <div class="isim-sb-team isim-sb-away">
        <span class="isim-sb-name">${a.name}</span>
        <span class="isim-sb-flag">${flagImg(m.away, 'isim-flag')}</span>
      </div>
    </div>`;

  // Add ball element to pitch
  if (fallback && !document.getElementById('isim-ball')) {
    const ball = document.createElement('div');
    ball.id = 'isim-ball';
    ball.className = 'isim-ball';
    fallback.appendChild(ball);
  }

  // Add player dots container
  if (fallback && !document.getElementById('isim-players')) {
    const playersDiv = document.createElement('div');
    playersDiv.id = 'isim-players';
    fallback.appendChild(playersDiv);
  }

  // Create controls bar below pitch
  let controls = document.getElementById('inline-sim-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'inline-sim-controls';
    pitchWrap?.parentElement?.insertBefore(controls, pitchWrap.nextSibling);
  }
  controls.innerHTML = `
    <div class="isim-controls">
      <button class="isim-ctrl-btn" id="isim-btn-play" title="Play/Pause">▶</button>
      <button class="isim-ctrl-btn isim-speed active" data-speed="1">1x</button>
      <button class="isim-ctrl-btn isim-speed" data-speed="2">2x</button>
      <button class="isim-ctrl-btn isim-speed" data-speed="4">4x</button>
      <button class="isim-ctrl-btn isim-speed" data-speed="8">8x</button>
      <div class="isim-progress-wrap">
        <div class="isim-progress-bar">
          <div class="isim-progress-fill" id="isim-progress-fill"></div>
        </div>
        <span class="isim-progress-lbl" id="isim-progress-lbl">0 / 90</span>
      </div>
    </div>
    <div class="isim-stats-bar" id="isim-stats-bar">
      <div class="isim-stat"><span class="isim-stat-val isim-h" id="isim-poss-h">50%</span><span class="isim-stat-lbl">POSS</span><span class="isim-stat-val isim-a" id="isim-poss-a">50%</span></div>
      <div class="isim-stat"><span class="isim-stat-val isim-h" id="isim-shots-h">0</span><span class="isim-stat-lbl">SHOTS</span><span class="isim-stat-val isim-a" id="isim-shots-a">0</span></div>
      <div class="isim-stat"><span class="isim-stat-val isim-h" id="isim-fouls-h">0</span><span class="isim-stat-lbl">FOULS</span><span class="isim-stat-val isim-a" id="isim-fouls-a">0</span></div>
      <div class="isim-stat"><span class="isim-stat-val isim-h" id="isim-corners-h">0</span><span class="isim-stat-lbl">CORNERS</span><span class="isim-stat-val isim-a" id="isim-corners-a">0</span></div>
    </div>`;

  controls.querySelector('#isim-btn-play').onclick = () => inlineTogglePlay();
  controls.querySelectorAll('.isim-speed').forEach(btn => {
    btn.onclick = () => inlineSetSpeed(parseInt(btn.dataset.speed));
  });

  // Create event log in right panel (replace betting)
  const rightPanel = document.getElementById('preview-right');
  if (rightPanel) {
    rightPanel.innerHTML = `
      <div class="isim-log-panel">
        <div class="isim-log-head">MATCH LOG</div>
        <div class="isim-log-list" id="isim-log-list"></div>
      </div>`;
  }

  // Disable lineup panel interactions during sim
  const leftPanel = document.getElementById('preview-left');
  if (leftPanel) leftPanel.classList.add('isim-disabled');
}

function exitSimMode() {
  const pitchWrap = document.getElementById('pitch-wrap');
  if (pitchWrap) pitchWrap.classList.remove('sim-active');

  // Remove inline sim elements
  document.getElementById('inline-sim-scoreboard')?.remove();
  document.getElementById('inline-sim-controls')?.remove();
  document.getElementById('isim-ball')?.remove();
  document.getElementById('isim-players')?.remove();

  // Show formation tokens again
  const fallback = document.getElementById('pitch-fallback');
  if (fallback) {
    fallback.querySelectorAll('.fp-token').forEach(el => el.style.display = '');
  }

  // Show tactical board
  const board = document.getElementById('tactical-board');
  if (board) board.style.display = '';

  // Re-enable lineup panel
  const leftPanel = document.getElementById('preview-left');
  if (leftPanel) leftPanel.classList.remove('isim-disabled');

  // Restore right panel
  if (state.previewMatchId) {
    const rightPanel = document.getElementById('preview-right');
    if (rightPanel) renderRightPanel(rightPanel, state.previewMatchId);
  }

  inlineSim = null;
}

function inlineStartPlay() {
  if (!inlineSim || inlineSim.isPlaying) return;
  inlineSim.isPlaying = true;
  inlineUpdatePlayBtn();
  inlineTick();
}

function inlineStopPlay() {
  if (!inlineSim) return;
  inlineSim.isPlaying = false;
  if (inlineSim.playTimer) { clearTimeout(inlineSim.playTimer); inlineSim.playTimer = null; }
  inlineUpdatePlayBtn();
}

function inlineTogglePlay() {
  if (!inlineSim) return;
  if (inlineSim.currentMinute >= 90) {
    // Restart
    inlineSim.currentFrame = 0;
    inlineSim.currentMinute = 0;
    inlineSim.lastEventMinute = -1;
    inlineSim.eventLogEntries = [];
    inlineStartPlay();
    return;
  }
  if (inlineSim.isPlaying) inlineStopPlay(); else inlineStartPlay();
}

function inlineSetSpeed(s) {
  if (!inlineSim) return;
  inlineSim.playSpeed = s;
  const controls = document.getElementById('inline-sim-controls');
  if (controls) {
    controls.querySelectorAll('.isim-speed').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.speed) === s);
    });
  }
}

function inlineUpdatePlayBtn() {
  if (!inlineSim) return;
  const btn = document.getElementById('isim-btn-play');
  if (btn) btn.textContent = inlineSim.isPlaying ? '⏸' : (inlineSim.currentMinute >= 90 ? '↻' : '▶');
}

function inlineTick() {
  if (!inlineSim || !inlineSim.isPlaying) return;

  const totalFrames = inlineSim.simData.positionSnapshots.length;
  if (inlineSim.currentFrame >= totalFrames - 1) {
    inlineSim.currentMinute = 90;
    inlineStopPlay();
    inlineRenderFrame();
    inlineProcessEventsUpTo(90);
    inlineHandleMatchEnd();
    return;
  }

  inlineSim.currentFrame++;
  const snap = inlineSim.simData.positionSnapshots[inlineSim.currentFrame];
  if (snap) inlineSim.currentMinute = snap.minute;

  inlineRenderFrame();
  inlineProcessEventsUpTo(inlineSim.currentMinute);

  const delay = Math.max(20, INLINE_FRAME_MS / inlineSim.playSpeed);
  inlineSim.playTimer = setTimeout(inlineTick, delay);
}

function inlineRenderFrame() {
  if (!inlineSim) return;
  const { simData, currentFrame, currentMinute } = inlineSim;
  const snap = simData.positionSnapshots[currentFrame] || simData.positionSnapshots[0];
  if (!snap) return;

  // Update scoreboard
  const sh = document.getElementById('isim-score-h');
  const sa = document.getElementById('isim-score-a');
  if (sh) sh.textContent = snap.score[0];
  if (sa) sa.textContent = snap.score[1];

  const clock = document.getElementById('isim-clock');
  if (clock) clock.textContent = `${currentMinute}'`;

  // Progress bar
  const fill = document.getElementById('isim-progress-fill');
  const lbl = document.getElementById('isim-progress-lbl');
  if (fill) fill.style.width = `${(currentMinute / 90) * 100}%`;
  if (lbl) lbl.textContent = `${currentMinute} / 90`;

  // Render sim players on fallback pitch
  const playersEl = document.getElementById('isim-players');
  if (playersEl) {
    const allPlayers = [
      ...snap.home.map((p, i) => ({ ...p, side: 'home', idx: i })),
      ...snap.away.map((p, i) => ({ ...p, side: 'away', idx: i })),
    ];

    if (!playersEl.children.length || playersEl.children.length !== allPlayers.length) {
      playersEl.innerHTML = allPlayers.map(p => {
        const isGK = p.pos === 'GK';
        const cls = `isim-player ${p.side} ${isGK ? 'gk' : ''}`;
        return `<div class="${cls}" style="left:${(p.x * 100).toFixed(1)}%;top:${(p.y * 100).toFixed(1)}%">
          <span class="isim-player-num">${p.num}</span>
          <span class="isim-player-name">${p.name.split(' ').pop()}</span>
        </div>`;
      }).join('');
    } else {
      allPlayers.forEach((p, i) => {
        const el = playersEl.children[i];
        if (el) {
          el.style.left = `${(p.x * 100).toFixed(1)}%`;
          el.style.top = `${(p.y * 100).toFixed(1)}%`;
        }
      });
    }
  }

  // Ball
  const ballEl = document.getElementById('isim-ball');
  if (ballEl && snap.ball) {
    ballEl.style.left = `${(snap.ball.x * 100).toFixed(1)}%`;
    ballEl.style.top = `${(snap.ball.y * 100).toFixed(1)}%`;
  }

  inlineUpdateMiniStats();
}

function inlineUpdateMiniStats() {
  if (!inlineSim) return;
  const { simData, currentFrame, currentMinute } = inlineSim;

  const evts = simData.events.filter(e => e.minute <= currentMinute);
  let possH = 0, possA = 0, shotsH = 0, shotsA = 0, foulsH = 0, foulsA = 0, cornersH = 0, cornersA = 0;

  simData.positionSnapshots.slice(0, currentFrame + 1).forEach(s => {
    if (s.possession === 'home') possH++; else possA++;
  });

  evts.forEach(e => {
    if ([EVT.SHOT, EVT.SHOT_SAVED, EVT.SHOT_WIDE, EVT.GOAL, EVT.PEN_GOAL, EVT.PEN_MISS].includes(e.type)) {
      if (e.team === 'home') shotsH++; else shotsA++;
    }
    if (e.type === EVT.FOUL) { if (e.team === 'home') foulsH++; else foulsA++; }
    if (e.type === EVT.CORNER) { if (e.team === 'home') cornersH++; else cornersA++; }
  });

  const totalPoss = possH + possA || 1;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('isim-poss-h', Math.round(possH / totalPoss * 100) + '%');
  set('isim-poss-a', Math.round(possA / totalPoss * 100) + '%');
  set('isim-shots-h', shotsH); set('isim-shots-a', shotsA);
  set('isim-fouls-h', foulsH); set('isim-fouls-a', foulsA);
  set('isim-corners-h', cornersH); set('isim-corners-a', cornersA);
}

function inlineProcessEventsUpTo(minute) {
  if (!inlineSim || minute <= inlineSim.lastEventMinute) return;
  const m = inlineSim.match;
  const h = T[m.home], a = T[m.away];
  const teamName = (side) => side === 'home' ? h.name : a.name;

  for (let min = inlineSim.lastEventMinute + 1; min <= minute; min++) {
    const minuteEvents = inlineSim.simData.events.filter(e => e.minute === min);
    minuteEvents.forEach(e => {
      inlineAddLogEntry(e, teamName);
      // SFX
      if (e.type === EVT.GOAL || e.type === EVT.PEN_GOAL) { SFX.bigWin(); inlineFlashPitch('goal'); }
      else if (e.type === EVT.RED) { SFX.error(); inlineFlashPitch('red'); }
      else if (e.type === EVT.YELLOW) SFX.click();
      else if (e.type === EVT.PENALTY) SFX.sim();
      else if (e.type === EVT.HALFTIME) SFX.nav();
      else if (e.type === EVT.CORNER) SFX.tab();
    });
  }
  inlineSim.lastEventMinute = minute;
}

function inlineAddLogEntry(event, teamName) {
  if (!inlineSim) return;
  let icon = '', text = '', cls = '';

  switch (event.type) {
    case EVT.KICKOFF: icon = '⚽'; text = 'Kick Off!'; cls = 'isim-log-kickoff'; break;
    case EVT.GOAL:
      icon = '⚽'; cls = 'isim-log-goal';
      text = `<strong>GOAL!</strong> ${event.player} (${teamName(event.team)})`;
      if (event.assist) text += ` — Assist: ${event.assist}`;
      text += ` <span class="isim-log-score">${event.score[0]} – ${event.score[1]}</span>`;
      break;
    case EVT.PEN_GOAL:
      icon = '⚽'; cls = 'isim-log-goal';
      text = `<strong>GOAL!</strong> ${event.player} [Pen] <span class="isim-log-score">${event.score[0]} – ${event.score[1]}</span>`;
      break;
    case EVT.PEN_MISS: icon = '❌'; cls = 'isim-log-miss'; text = `Penalty MISSED — ${event.player}`; break;
    case EVT.PENALTY: icon = '⚠️'; cls = 'isim-log-penalty'; text = `PENALTY for ${teamName(event.team)}!`; break;
    case EVT.FOUL: icon = '🦶'; cls = 'isim-log-foul'; text = `Foul by ${event.player}`; break;
    case EVT.YELLOW: icon = '🟨'; cls = 'isim-log-card'; text = `Yellow — ${event.player} (${teamName(event.team)})`; break;
    case EVT.RED: icon = '🟥'; cls = 'isim-log-red'; text = `RED CARD — ${event.player} (${teamName(event.team)})`; break;
    case EVT.CORNER: icon = '🚩'; cls = 'isim-log-corner'; text = `Corner for ${teamName(event.team)}`; break;
    case EVT.FREEKICK: icon = '🎯'; cls = 'isim-log-freekick'; text = `Free kick — ${event.player}`; break;
    case EVT.OFFSIDE: icon = '🚫'; cls = 'isim-log-offside'; text = `Offside — ${event.player}`; break;
    case EVT.SHOT_SAVED: icon = '🧤'; cls = 'isim-log-save'; text = `Shot saved — ${event.player}`; break;
    case EVT.SHOT_WIDE: icon = '💨'; cls = 'isim-log-wide'; text = `Shot wide — ${event.player}`; break;
    case EVT.SUB: icon = '🔄'; cls = 'isim-log-sub'; text = `Sub: ${event.playerIn} ⬆ ${event.playerOut} ⬇`; break;
    case EVT.HALFTIME:
      icon = '⏸'; cls = 'isim-log-half';
      text = `<strong>HALF TIME</strong> ${event.score[0]} – ${event.score[1]}`;
      break;
    case EVT.FULLTIME:
      icon = '🏁'; cls = 'isim-log-full';
      text = `<strong>FULL TIME</strong> ${event.score[0]} – ${event.score[1]}`;
      break;
    default: return;
  }

  inlineSim.eventLogEntries.unshift({ minute: event.minute, icon, text, cls });

  const list = document.getElementById('isim-log-list');
  if (list) {
    list.innerHTML = inlineSim.eventLogEntries.map(e =>
      `<div class="isim-log-entry ${e.cls}">
        <span class="isim-log-min">${e.minute}'</span>
        <span class="isim-log-icon">${e.icon}</span>
        <span class="isim-log-text">${e.text}</span>
      </div>`
    ).join('');
  }
}

function inlineFlashPitch(type) {
  const fallback = document.getElementById('pitch-fallback');
  if (!fallback) return;
  const cls = `isim-flash-${type}`;
  fallback.classList.add(cls);
  setTimeout(() => fallback.classList.remove(cls), 1200);
}

function inlineHandleMatchEnd() {
  if (!inlineSim) return;
  const m = inlineSim.match;
  const simData = inlineSim.simData;

  m.status = 'settled';
  m.result = simData.result;
  m.score = [...simData.score];
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

  inlineShowSummary();
}

function inlineShowSummary() {
  if (!inlineSim) return;
  const m = inlineSim.match;
  const h = T[m.home], a = T[m.away];
  const bet = state.ST.bets[m.id];

  let betHtml = '';
  if (bet) {
    const isWin = bet.status === 'won';
    const isPush = bet.status === 'push';
    const col = isWin ? 'var(--green)' : isPush ? 'var(--gold)' : 'var(--red)';
    const txt = isWin ? `WON +${bet.payout}🪙` : isPush ? `PUSH ↩${bet.amount}🪙` : `LOST −${bet.amount}🪙`;
    betHtml = `<div class="isim-summary-bet" style="color:${col}">${txt}</div>`;
  }

  const winText = m.result === 'draw' ? 'DRAW' :
    (m.result === 'home' ? `${h.name} WIN` : `${a.name} WIN`);

  const fallback = document.getElementById('pitch-fallback');
  if (!fallback) return;

  const summaryEl = document.createElement('div');
  summaryEl.id = 'isim-summary';
  summaryEl.className = 'isim-summary-overlay';
  summaryEl.innerHTML = `
    <div class="isim-summary-card">
      <div class="isim-summary-title">FULL TIME</div>
      <div class="isim-summary-score">
        <span class="isim-summary-team">${flagImg(m.home, 'isim-flag')} ${h.name}</span>
        <span class="isim-summary-result">${m.score[0]} – ${m.score[1]}</span>
        <span class="isim-summary-team">${a.name} ${flagImg(m.away, 'isim-flag')}</span>
      </div>
      <div class="isim-summary-winner">${winText}</div>
      ${betHtml}
      <div class="isim-summary-actions">
        <button class="isim-summary-btn isim-summary-log-btn" id="isim-btn-log">VIEW LOG</button>
        <button class="isim-summary-btn isim-summary-close-btn" id="isim-btn-done">CONTINUE</button>
      </div>
    </div>`;
  fallback.appendChild(summaryEl);

  summaryEl.querySelector('#isim-btn-done').onclick = () => {
    // closePreview handles inline sim cleanup and removes the shell
    inlineStopPlay();
    inlineSim = null;
    closePreview();
  };
  summaryEl.querySelector('#isim-btn-log').onclick = () => {
    summaryEl.remove();
  };

  if (bet) {
    if (bet.status === 'won') SFX.win();
    else if (bet.status === 'lost') SFX.lose();
    else SFX.push();
  } else {
    SFX.coins();
  }
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

      // Quick-bet button for non-GK players
      if (pl.p !== 'GK') {
        const betBtn = document.createElement('div');
        betBtn.className = 'fp-bet-btn';
        betBtn.textContent = '\u{1FA99}';
        betBtn.title = `Bet on ${pl.n} to score`;
        betBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          event.preventDefault();
          openQuickBet(pl, teamId, token, event);
        });
        token.appendChild(betBtn);
      }

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

// ── QUICK BET on player token ──────────────────────────────
function openQuickBet(pl, teamId, tokenEl, event) {
  // Close any existing quick-bet popup
  closeQuickBet();
  // Hide player popup
  document.getElementById('player-popup').style.display = 'none';

  const mid = state.previewMatchId;
  const m = state.MS.find(x => x.id === mid);
  if (!m || m.status !== 'pending') return;
  if (state.ST.bets[mid]) { _deps.toast('Already bet on this match'); return; }

  // Get this player's scorer odds
  const gs = calcGoalscorerOdds(mid);
  const pOdds = gs.find(x => x.name === pl.n);
  if (!pOdds) return;

  const popup = document.createElement('div');
  popup.id = 'quick-bet-popup';
  popup.className = 'quick-bet-popup';

  popup.innerHTML = `
    <div class="qb-header">
      <span class="qb-player">${pl.n}</span>
      <span class="qb-odds">${pOdds.odds}x</span>
    </div>
    <div class="qb-label">Anytime Goalscorer</div>
    <div class="qb-chips">
      <button class="qb-chip" data-amt="10">10</button>
      <button class="qb-chip" data-amt="25">25</button>
      <button class="qb-chip" data-amt="50">50</button>
      <button class="qb-chip" data-amt="100">100</button>
    </div>
    <div class="qb-balance">Balance: ${state.ST.coins.toLocaleString()}</div>
  `;

  // Chip click handler
  popup.querySelectorAll('.qb-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const amt = parseInt(chip.dataset.amt);
      if (amt > state.ST.coins) { SFX.error(); _deps.toast('Not enough coins!'); return; }
      // Place the scorer bet directly
      const pick = 'gs_' + pl.n;
      state.ST.coins -= amt;
      state.ST.bets[mid] = {
        type: 'scorer', pick, amount: amt, odds: pOdds.odds,
        status: 'pending', payout: null,
        phase: m.phase, home: m.home, away: m.away, date: m.date
      };
      addXP(15); saveState();
      SFX.betPlace();
      import('./visual-fx.js?v=9').then(vfx => vfx.coinPopAnimation());
      _deps.toast(`\u2705 ${amt} on ${pl.n} to score @ ${pOdds.odds}x`);
      closeQuickBet();
      // Refresh betting panel
      const rpanel = document.getElementById('preview-right');
      if (rpanel) renderPreviewBetting(rpanel, mid);
      // Update token to show bet placed
      tokenEl.classList.add('bet-placed');
    });
  });

  // Position near the token
  const pitchRect = document.getElementById('pitch-fallback')?.getBoundingClientRect();
  const tokenRect = tokenEl.getBoundingClientRect();
  if (pitchRect) {
    let left = tokenRect.left - pitchRect.left + tokenRect.width / 2;
    let top = tokenRect.top - pitchRect.top - 10;
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  }

  document.getElementById('pitch-fallback')?.appendChild(popup);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', _quickBetOutsideClick, { once: true });
  }, 50);
}

function _quickBetOutsideClick(e) {
  const popup = document.getElementById('quick-bet-popup');
  if (popup && !popup.contains(e.target)) closeQuickBet();
}

function closeQuickBet() {
  document.getElementById('quick-bet-popup')?.remove();
  document.removeEventListener('click', _quickBetOutsideClick);
}

export { closeQuickBet };
