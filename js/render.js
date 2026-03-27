// ═══════════════════════════════════════════════════════════
// RENDER — Core UI rendering functions
// ═══════════════════════════════════════════════════════════
import { state, BET_TYPES } from './state.js?v=9';
import { PHASES } from './data/phases.js?v=9';
import { TIER_REWARDS, RARITY, getLevelProgress } from './data/tiers.js?v=9';
import { T, flagImg } from './data/teams.js?v=9';
import { calcOdds, calcTotalOdds, calcBttsOdds } from './betting/odds.js?v=9';
import { betPickLabel } from './betting/bet-actions.js?v=9';
import { getAllMatchDays, setActiveDay } from './calendar.js?v=9';
import { getAIVerdict, getAIConfidence } from './ai-system.js?v=9';

// Progressive level progress calc
function levelProg() {
  const prog = getLevelProgress(state.ST.xp);
  return { c: prog.current, max: prog.max, pct: prog.pct };
}

// ── UPDATE ALL ─────────────────────────────────────────────
export function updateAll() {
  const bets = Object.values(state.ST.bets);
  const won = bets.filter(b => b.status==='won').length;
  const tot = bets.length;
  const net = bets.reduce((a,b) => a+(b.status==='won'?b.payout-b.amount:b.status==='lost'?-b.amount:0), 0);
  const tp = levelProg();

  document.getElementById('h-coins').textContent = state.ST.coins.toLocaleString();
  document.getElementById('h-tier').textContent = state.ST.tier;
  document.getElementById('h-wins').textContent = won;
  document.getElementById('h-bets').textContent = tot;
  const hpnl = document.getElementById('h-pnl');
  hpnl.textContent = (net>=0?'+':'') + net;
  hpnl.style.color = net>=0 ? 'var(--green)' : 'var(--red)';

  document.getElementById('lp-tier').textContent = state.ST.tier;
  document.getElementById('lp-xp-cur').textContent = tp.c;
  document.getElementById('lp-xp-max').textContent = tp.max;
  document.getElementById('lp-fill').style.width = tp.pct + '%';
  document.getElementById('lp-coins').textContent = state.ST.coins.toLocaleString();
  document.getElementById('lp-bets').textContent = tot;
  document.getElementById('lp-wins').textContent = won;
  document.getElementById('lp-acc').textContent = tot ? Math.round(won/tot*100)+'%' : '—';
  const lpnl = document.getElementById('lp-pnl');
  lpnl.textContent = (net>=0?'+':'') + net; lpnl.style.color = net>=0 ? 'var(--green)' : 'var(--red)';
  document.getElementById('lp-totalxp').textContent = state.ST.xp.toLocaleString();

  renderInventory();

  // Level XP bar (bottom) — level strip rendered by main.js
  document.getElementById('hud-tier').textContent = state.ST.tier;
  document.getElementById('hud-xp').textContent = tp.c;
  const hxm = document.getElementById('hud-xp-max');
  if (hxm) hxm.textContent = tp.max;
  const xpFill = document.getElementById('level-xp-fill');
  if (xpFill) xpFill.style.width = tp.pct + '%';

  const real = state.MS.filter(m => m.home !== 'TBD');
  const done = real.filter(m => m.status === 'settled').length;
  document.getElementById('hud-settled').textContent = done;
  document.getElementById('hud-total').textContent = real.length;

  renderCalendarHUD();
  renderRightPanel();
}

// ── INVENTORY ──────────────────────────────────────────────
function renderInventory() {
  const el = document.getElementById('lp-inventory');
  if (!el) return;
  const items = state.ST.inventory || [];
  if (!items.length) {
    el.innerHTML = '<div class="inv-empty">Claim tier rewards to fill your collection</div>';
    return;
  }
  el.innerHTML = items.slice(-9).reverse().map(it => {
    const rar = RARITY[it.rarity];
    return `<div class="inv-item" style="border-color:${rar?.color||''}" title="${it.name} (${rar?.label||''})">
      <div>${it.emoji}</div>
      <div class="inv-name">${it.name}</div>
    </div>`;
  }).join('');
}

// ── CALENDAR HUD (Day Banner + Day Strip) ─────────────────
export function renderCalendarHUD() {
  const days = getAllMatchDays();
  if (!days.length) return;

  if (!state.activeDay || !days.find(d => d.key === state.activeDay)) state.activeDay = days[0].key;

  const dayIdx = days.findIndex(d => d.key === state.activeDay);
  const allDayMs = state.MS.filter(m => m.dateKey === state.activeDay);
  const dayMs = allDayMs.filter(m => m.home !== 'TBD');
  const settled = dayMs.filter(m => m.status === 'settled').length;
  const ph = PHASES.find(p => p.id === state.activePhase);
  const anyMatch = allDayMs[0];

  // ── Day Banner ──
  const dayNum = document.getElementById('day-number');
  const dayTotal = document.getElementById('day-total');
  const dayPhase = document.getElementById('day-phase-label');
  const dayDate = document.getElementById('day-date-label');
  const daySummary = document.getElementById('day-match-summary');

  if (dayNum) dayNum.textContent = `DAY ${dayIdx + 1}`;
  if (dayTotal) dayTotal.textContent = `/ ${days.length}`;
  if (dayPhase) dayPhase.textContent = ph ? ph.label.toUpperCase() : '';
  if (dayDate) dayDate.textContent = anyMatch?.date || state.activeDay;
  if (daySummary) {
    const total = dayMs.length;
    if (total === 0) {
      daySummary.textContent = 'No playable matches';
    } else if (settled === total) {
      daySummary.innerHTML = `<span style="color:var(--green)">${total} match${total!==1?'es':''} \u2014 ALL COMPLETE</span>`;
    } else if (settled > 0) {
      daySummary.textContent = `${total} match${total!==1?'es':''} \u00b7 ${settled} settled`;
    } else {
      daySummary.textContent = `${total} match${total!==1?'es':''} \u00b7 ready to play`;
    }
  }

  // Update SIM DAY button state
  const btnDay = document.getElementById('btn-sim-day');
  if (btnDay) {
    const pendingToday = dayMs.filter(m => m.status === 'pending').length;
    const allSettled = dayMs.length > 0 && settled === dayMs.length;
    if (allSettled && dayIdx < days.length - 1) {
      btnDay.textContent = '\u25b6 NEXT DAY';
      btnDay.disabled = false;
    } else if (pendingToday > 0) {
      btnDay.textContent = `\u26a1 SIM DAY (${pendingToday})`;
      btnDay.disabled = false;
    } else {
      btnDay.textContent = '\u25b6 NEXT DAY';
      btnDay.disabled = true;
    }
  }

  // ── Day Strip ──
  const strip = document.getElementById('day-strip');
  if (strip) {
    let html = '';
    let lastPhase = '';
    days.forEach((d, i) => {
      const dm = state.MS.filter(m => m.dateKey === d.key && m.home !== 'TBD');
      const allDone = dm.length > 0 && dm.every(m => m.status === 'settled');
      const isActive = d.key === state.activeDay;
      const hasBets = dm.some(m => state.ST.bets[m.id]);

      // Phase divider
      if (d.phaseId !== lastPhase && lastPhase !== '') {
        const p = PHASES.find(x => x.id === d.phaseId);
        html += `<div class="day-strip-phase">${p ? p.short : ''}</div>`;
      }
      lastPhase = d.phaseId;

      let cls = 'day-pill';
      if (isActive) cls += ' current';
      else if (allDone) cls += ' past';
      else cls += ' future';
      if (hasBets) cls += ' has-bets';

      const shortDate = d.date.replace(/\s+/g, ' ');
      const matchCount = dm.length;
      const settledCount = dm.filter(m => m.status === 'settled').length;
      const matchLabel = matchCount === 0 ? '' : settledCount === matchCount ? `${matchCount}✓` : `${matchCount}m`;

      html += `<div class="${cls}" onclick="setActiveDay('${d.key}')" data-daykey="${d.key}" data-daynum="${i+1}">
        <div class="day-pill-num">${i + 1}</div>
        <div class="day-pill-date">${shortDate}</div>
        ${matchLabel ? `<div class="day-pill-matches">${matchLabel}</div>` : '<div class="day-pill-dot"></div>'}
      </div>`;
    });
    strip.innerHTML = html;

    // Auto-scroll to active day
    const activePill = strip.querySelector('.day-pill.current');
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // Hover tooltip
    initDayPillTooltips(strip);
  }
}

// ── Day pill hover tooltip ──
let _dayTooltip = null;
let _dayTooltipTimeout = null;

function initDayPillTooltips(strip) {
  strip.addEventListener('mouseover', (e) => {
    const pill = e.target.closest('.day-pill');
    if (!pill) return;
    clearTimeout(_dayTooltipTimeout);
    _dayTooltipTimeout = setTimeout(() => showDayTooltip(pill), 100);
  });
  strip.addEventListener('mouseout', (e) => {
    const pill = e.target.closest('.day-pill');
    const related = e.relatedTarget;
    if (related && related.closest('.day-pill') === pill) return;
    clearTimeout(_dayTooltipTimeout);
    hideDayTooltip();
  });
}

function showDayTooltip(pill) {
  hideDayTooltip();

  const dayKey = pill.dataset.daykey;
  const dayNum = pill.dataset.daynum;
  const dm = state.MS.filter(m => m.dateKey === dayKey && m.home !== 'TBD');
  const allDone = dm.length > 0 && dm.every(m => m.status === 'settled');
  const anyMatch = state.MS.find(m => m.dateKey === dayKey);
  const ph = anyMatch ? PHASES.find(p => p.id === anyMatch.phaseId) : null;

  let matchesHtml = '';
  if (dm.length === 0) {
    matchesHtml = '<div class="dpt-no-matches">No matches this day</div>';
  } else {
    dm.forEach(m => {
      const hTeam = T[m.home];
      const aTeam = T[m.away];
      const hName = hTeam?.name || m.home;
      const aName = aTeam?.name || m.away;
      const hFlag = flagImg(m.home, 'dpt-flag');
      const aFlag = flagImg(m.away, 'dpt-flag');

      if (m.status === 'settled') {
        matchesHtml += `<div class="dpt-match">
          ${hFlag}<div class="dpt-team">${hName}</div>
          <div class="dpt-score">${m.homeGoals}–${m.awayGoals}</div>
          <div class="dpt-team dpt-away">${aName}</div>${aFlag}
        </div>`;
      } else {
        matchesHtml += `<div class="dpt-match">
          ${hFlag}<div class="dpt-team">${hName}</div>
          <div class="dpt-vs">VS</div>
          <div class="dpt-team dpt-away">${aName}</div>${aFlag}
        </div>`;
      }
    });
  }

  const statusHtml = dm.length === 0 ? '' :
    allDone ? '<div class="dpt-status dpt-status-done">ALL SETTLED</div>' :
    `<div class="dpt-status dpt-status-pending">${dm.filter(m=>m.status==='pending').length} PENDING</div>`;

  const tooltip = document.createElement('div');
  tooltip.className = 'day-pill-tooltip';
  tooltip.innerHTML = `<div class="dpt-inner">
    <div class="dpt-header">
      <span class="dpt-day">DAY ${dayNum}</span>
      <span class="dpt-date">${anyMatch?.date || dayKey}</span>
    </div>
    ${ph ? `<div class="dpt-phase">${ph.label}</div>` : ''}
    ${matchesHtml}
    ${statusHtml}
  </div>`;

  document.body.appendChild(tooltip);

  // Position below the pill
  const rect = pill.getBoundingClientRect();
  const tRect = tooltip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tRect.width / 2;
  let top = rect.bottom + 8;

  // Clamp to viewport
  if (left < 8) left = 8;
  if (left + tRect.width > window.innerWidth - 8) left = window.innerWidth - 8 - tRect.width;
  if (top + tRect.height > window.innerHeight - 8) top = rect.top - tRect.height - 8;

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';

  requestAnimationFrame(() => tooltip.classList.add('dpt-visible'));
  _dayTooltip = tooltip;
}

function hideDayTooltip() {
  if (_dayTooltip) {
    _dayTooltip.remove();
    _dayTooltip = null;
  }
}

export function setPhase(pid) {
  state.activePhase = pid;
  const firstM = state.MS.find(m => m.phaseId === pid && m.dateKey);
  if (firstM) state.activeDay = firstM.dateKey;
  renderCalendarHUD();
  renderMatches();
}

// ── RENDER MATCHES (day-based) ──────────────────────────────
export function renderMatches() {
  const ml = document.getElementById('match-list');
  if (!ml || state.previewMode) return;

  const ph = PHASES.find(p => p.id === state.activePhase);
  const dayMs = state.MS.filter(m => m.dateKey === state.activeDay);
  const realMs = dayMs.filter(m => m.home !== 'TBD');
  const anyDayMatch = dayMs[0];

  document.getElementById('main-title').textContent = anyDayMatch?.date || (ph ? ph.label : 'Matches');
  document.getElementById('main-sub').innerHTML =
    `${ph?ph.label:''}${realMs.length?` · <span id="main-count">${realMs.length}</span> match${realMs.length!==1?'es':''}`:'<span id="main-count">0</span>'}`;

  if (!dayMs.length) {
    ml.innerHTML = `<div class="empty"><div style="font-size:28px">📅</div><div>No matches on this day</div></div>`;
    return;
  }

  const grouped = {};
  dayMs.forEach(m => { if (!grouped[m.phase]) grouped[m.phase]=[]; grouped[m.phase].push(m); });
  const phKeys = Object.keys(grouped);

  if (phKeys.length > 1) {
    ml.innerHTML = phKeys.map(k => `
      <div class="day-grp-hdr">${k}</div>
      ${grouped[k].map(m => mc(m)).join('')}
    `).join('');
  } else {
    ml.innerHTML = dayMs.map(m => mc(m)).join('');
  }
}

// ── MATCH CARD ─────────────────────────────────────────────
function mc(m) {
  if (m.home==='TBD' || m.away==='TBD') {
    const isFinalTbd = m.phaseId === 'final';
    return `<div class="mc${isFinalTbd?' mc-final-card':''}" style="opacity:.55">
      <div class="mc-body" style="pointer-events:none">
        <div class="mc-team"><div><div class="tname" style="color:var(--muted)">TBD</div></div></div>
        <div class="mc-mid">${isFinalTbd ? `<div class="mc-final-label">★ FINAL ★</div>` : `<div class="mc-vs" style="font-size:8px">vs</div><div class="mc-phase">${m.phase}</div>`}</div>
        <div class="mc-team away"><div><div class="tname" style="color:var(--muted)">TBD</div></div></div>
      </div></div>`;
  }
  const h=T[m.home], a=T[m.away]; if (!h||!a) return '';
  const bet = state.ST.bets[m.id];
  const done = m.status === 'settled';
  const odds = calcOdds(h.str, a.str);

  // Winner/loser classes for settled matches
  const homeWin = done && m.result === 'home';
  const awayWin = done && m.result === 'away';
  const isDraw = done && m.result === 'draw';
  const hClass = homeWin ? 'mc-team-winner' : (done && !isDraw ? 'mc-team-loser' : '');
  const aClass = awayWin ? 'mc-team-winner' : (done && !isDraw ? 'mc-team-loser' : '');

  // Winner banner
  const winnerBanner = done ? (isDraw
    ? `<div class="mc-result-banner mc-draw-banner">DRAW</div>`
    : `<div class="mc-result-banner mc-win-banner">${homeWin ? h.name : a.name} WIN</div>`)
    : '';

  const isFinal = m.phaseId === 'final';
  const mid = isFinal
    ? (done && m.score
        ? `<div class="mc-final-label">★ FINAL ★</div><div class="mc-score">${m.score[0]}–${m.score[1]}</div>`
        : `<div class="mc-final-label">★ FINAL ★</div><div class="mc-preview-hint">${m.kickoff||''}</div>`)
    : (done && m.score
        ? `<div class="mc-score">${m.score[0]}–${m.score[1]}</div><div class="mc-phase">${m.phase}</div>`
        : `<div class="mc-vs">VS</div><div class="mc-phase">${m.phase}</div><div class="mc-preview-hint">${m.kickoff||''}</div>`);

  const quickOdds = done ? '' : `<div class="mc-quick-odds">
    <span>${odds.home}<span class="qlbl">1</span></span>
    <span>${odds.draw}<span class="qlbl">X</span></span>
    <span>${odds.away}<span class="qlbl">2</span></span>
  </div>`;

  // AI verdict badge for pending matches
  let aiBadge = '';
  if (!done) {
    const verdict = getAIVerdict(m.id);
    if (verdict) {
      const confClass = verdict.confidence >= 55 ? 'conf-strong' : verdict.confidence >= 40 ? 'conf-lean' : 'conf-neutral';
      aiBadge = `<div class="mc-ai-badge">
        <span class="mc-ai-icon">🤖</span>
        <span class="mc-ai-pick">AI: ${verdict.label}</span>
        <span class="mc-ai-conf ${confClass}">${verdict.confidence}%</span>
        ${verdict.valueBet ? `<span class="mc-ai-value">💡 ${verdict.valueBet}</span>` : ''}
      </div>`;
    }
  }

  let betStatus = '';
  if (bet) {
    const col = bet.status==='won'?'var(--green)':bet.status==='lost'?'var(--red)':'var(--gold)';
    const txt = bet.status==='won'?`WON +${bet.payout}🪙`:bet.status==='lost'?`LOST −${bet.amount}🪙`:bet.status==='push'?`PUSH ↩${bet.amount}🪙`:`PENDING · ${bet.amount}🪙`;
    const icon = bet.status==='won'?'✅':bet.status==='lost'?'❌':bet.status==='push'?'🤝':'⏳';
    betStatus = `<div class="mc-bet-status ${bet.status==='won'?'mc-bet-won':bet.status==='lost'?'mc-bet-lost':''}" style="color:${col}">${icon} ${txt}</div>`;
  }

  const settledClass = done ? (homeWin || awayWin ? ' mc-settled' : ' mc-settled mc-settled-draw') : '';

  return `<div class="mc${done?'':' mc-clickable'}${settledClass}${isFinal?' mc-final-card':''}" data-mid="${m.id}" onclick="openPreview(${m.id})">
    ${winnerBanner}
    <div class="mc-body">
      <div class="mc-teams-row">
        <div class="mc-team ${hClass}"><span class="flag">${flagImg(m.home)}</span><div class="tname">${h.name}</div></div>
        <div class="mc-mid">${mid}</div>
        <div class="mc-team away ${aClass}"><span class="flag">${flagImg(m.away)}</span><div class="tname">${a.name}</div></div>
      </div>
    </div>
    ${quickOdds}${aiBadge}${betStatus}
  </div>`;
}

// ── RENDER BET OPTIONS ──────────────────────────────────────
export function renderBetOpts(m, h, a, bet, done) {
  const mid = m.id;
  const tab = state.betTabs[mid] || 'match';
  const boc = (pick) => {
    let c = 'bopt';
    if (bet && bet.pick===pick && bet.type===tab)
      c += done ? (bet.status==='won'?' win':bet.status==='push'?' push-bet':' lose') : ' sel';
    return c;
  };
  // AI confidence dot helper
  const aiDot = (pick) => {
    if (done || bet) return '';
    const ai = getAIConfidence(mid, tab, pick);
    if (ai.level === 'neutral') return '';
    return `<div class="ai-conf-dot ${ai.level === 'strong' ? 'conf-strong' : 'conf-lean'}" title="AI: ${ai.pct}% confidence">● ${ai.pct}%</div>`;
  };

  if (tab === 'match') {
    const odds = calcOdds(h.str, a.str);
    return `<div class="bopts">
      <div class="${boc('home')}" onclick="pickOpt(event,${mid},'home',this)">
        ${aiDot('home')}<div class="odds">${odds.home}x</div><div class="olbl">${h.name}</div></div>
      <div class="${boc('draw')}" onclick="pickOpt(event,${mid},'draw',this)">
        ${aiDot('draw')}<div class="odds">${odds.draw}x</div><div class="olbl">Draw</div></div>
      <div class="${boc('away')}" onclick="pickOpt(event,${mid},'away',this)">
        ${aiDot('away')}<div class="odds">${odds.away}x</div><div class="olbl">${a.name}</div></div>
    </div>`;
  }
  if (tab === 'totals') {
    const to = calcTotalOdds(h.str, a.str);
    return `<div class="bopts cols2">
      <div class="${boc('over')}" onclick="pickOpt(event,${mid},'over',this)">
        ${aiDot('over')}<div class="odds">${to.over}x</div><div class="olbl">Over ${to.line}</div></div>
      <div class="${boc('under')}" onclick="pickOpt(event,${mid},'under',this)">
        ${aiDot('under')}<div class="odds">${to.under}x</div><div class="olbl">Under ${to.line}</div></div>
    </div>`;
  }
  if (tab === 'btts') {
    const bo = calcBttsOdds(h.str, a.str);
    return `<div class="bopts cols2">
      <div class="${boc('btts_yes')}" onclick="pickOpt(event,${mid},'btts_yes',this)">
        ${aiDot('btts_yes')}<div class="odds">${bo.yes}x</div><div class="olbl">Both Score — Yes</div></div>
      <div class="${boc('btts_no')}" onclick="pickOpt(event,${mid},'btts_no',this)">
        ${aiDot('btts_no')}<div class="odds">${bo.no}x</div><div class="olbl">Both Score — No</div></div>
    </div>`;
  }
  return '';
}

// ── RIGHT PANEL ────────────────────────────────────────────
export function renderRightPanel() {
  const allBets = [];
  Object.entries(state.ST.bets).forEach(([mid,betsOrBet]) => {
    const betsArr = Array.isArray(betsOrBet) ? betsOrBet : (betsOrBet ? [betsOrBet] : []);
    betsArr.forEach(b => allBets.push([mid,b]));
  });
  const pending = allBets.filter(([,b]) => b.status === 'pending');
  const settled = allBets.filter(([,b]) => b.status !== 'pending').slice(-6).reverse();

  const typeTag = (b) => {
    const t = BET_TYPES.find(x => x.id === (b.type||'match'));
    return t ? `<span style="font-size:7px;color:var(--muted);background:rgba(255,255,255,.05);padding:1px 4px;border-radius:1px;margin-left:4px">${t.label}</span>` : '';
  };
  document.getElementById('rp-active').innerHTML = pending.length
    ? pending.map(([mid,b]) => {
        const h=T[b.home], a=T[b.away]; if(!h||!a)return '';
        const m = state.MS.find(x => x.id === +mid);
        const lbl = m ? betPickLabel(m,b.pick,b.type||'match') : (b.pick==='home'?h.name:b.pick==='draw'?'Draw':a.name);
        return `<div class="bet-item">
          <div class="bt" style="display:flex;align-items:center;gap:4px">${flagImg(b.home,'flag-img-sm')} ${h.name} vs ${flagImg(b.away,'flag-img-sm')} ${a.name}${typeTag(b)}</div>
          <div class="bp">${lbl} @ ${b.odds}x</div>
          <div style="color:var(--gold);font-size:9px;margin-top:2px">${b.amount}🪙 · Pending</div>
        </div>`;
      }).join('')
    : '<div style="font-size:11px;color:var(--muted)">No active bets.</div>';

  document.getElementById('rp-results').innerHTML = settled.length
    ? settled.map(([mid,b]) => {
        const h=T[b.home], a=T[b.away]; if(!h||!a)return '';
        const col = b.status==='won'?'var(--green)':b.status==='push'?'var(--gold)':'var(--red)';
        const txt = b.status==='won'?`+${b.payout}🪙`:b.status==='push'?`↩ ${b.amount}🪙`:`−${b.amount}🪙`;
        const m = state.MS.find(x => x.id === +mid);
        const lbl2 = m ? betPickLabel(m,b.pick,b.type||'match') : b.pick;
        return `<div class="bet-item">
          <div class="bt" style="display:flex;align-items:center;gap:4px">${flagImg(b.home,'flag-img-sm')} vs ${flagImg(b.away,'flag-img-sm')}${typeTag(b)}</div>
          <div class="bp">${lbl2} @ ${b.odds}x · ${b.date}</div>
          <div style="color:${col};font-weight:700;font-size:11px;margin-top:3px">${txt}</div>
        </div>`;
      }).join('')
    : '<div style="font-size:11px;color:var(--muted)">No settled bets yet.</div>';
}
