// ═══════════════════════════════════════════════════════════
// SIMULATION — Settle matches, sim controls, advance bracket
// ═══════════════════════════════════════════════════════════
import { state, saveState, saveMatches, loadState, loadMatches, LS_S, LS_M } from './state.js?v=9';
import { T, flagImg } from './data/teams.js?v=9';
import { SFX } from './audio-fx.js?v=9';
import { coinPopAnimation, flashElement, spawnConfetti, shakeElement, animateElement } from './visual-fx.js?v=9';
import { resolveBet } from './betting/settlement.js?v=9';
import { simResult, simScore, simMatchStats, genMatches } from './matches.js?v=9';
import { addXP } from './xp.js?v=9';

let _deps = {};
export function setSimDeps({ updateAll, renderMatches, toast, getAllMatchDays, onReset }) {
  _deps = { updateAll, renderMatches, toast, getAllMatchDays, onReset };
}

export function advanceWinner(m) {
  const prog = {r32:'r16', r16:'qf', qf:'sf', sf:'final'};
  const nextPh = prog[m.phaseId]; if (!nextPh) return;
  let winner = m.result==='draw' ? (Math.random()<.5 ? m.home : m.away) : (m.result==='home' ? m.home : m.away);
  // Force predicted champion to always advance
  const champ = state.ST.champion;
  if (champ && (m.home === champ || m.away === champ)) winner = champ;
  m.koWinner = winner;
  const thisMs = state.MS.filter(x => x.phaseId === m.phaseId);
  const nextMs = state.MS.filter(x => x.phaseId === nextPh);
  const idx = thisMs.findIndex(x => x.id === m.id);
  const nextM = nextMs[Math.floor(idx/2)];
  if (!nextM) return;
  if (idx%2===0) nextM.home = winner; else nextM.away = winner;
  if (nextM.home !== 'TBD' && nextM.away !== 'TBD') nextM.status = 'pending';
}

// ── Coin lerp animation ──────────────────────────────────
let _lerpAnim = null;
function lerpCoins(fromVal, toVal, duration = 1200) {
  if (_lerpAnim) cancelAnimationFrame(_lerpAnim);
  const coinEls = [document.getElementById('h-coins'), document.getElementById('lp-coins')];
  const start = performance.now();
  const diff = toVal - fromVal;
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const cur = Math.round(fromVal + diff * ease);
    coinEls.forEach(el => { if (el) el.textContent = cur.toLocaleString(); });
    if (t < 1) _lerpAnim = requestAnimationFrame(tick);
    else _lerpAnim = null;
  }
  _lerpAnim = requestAnimationFrame(tick);
}

// ── Screen flash effect ──────────────────────────────────
function screenFlash(color = 'gold') {
  const el = document.createElement('div');
  el.className = `screen-flash screen-flash-${color}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// ── Floating payout number on match card ─────────────────
function spawnFloatingPayout(matchId, text, isWin) {
  const card = document.querySelector(`.mc[data-mid="${matchId}"]`);
  if (!card) return;
  const r = card.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `floating-payout ${isWin ? 'fp-win' : 'fp-loss'}`;
  el.textContent = text;
  el.style.left = (r.left + r.width / 2 - 30) + 'px';
  el.style.top = (r.top + r.height / 2) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// ── Animate a single match card after settling ───────────
function animateMatchCard(matchId, result, delay = 0) {
  setTimeout(() => {
    const card = document.querySelector(`.mc[data-mid="${matchId}"]`);
    if (!card) return;
    // Add settle animation class
    card.classList.add('mc-just-settled');
    // Flash the card
    const isHomeWin = result === 'home';
    const isAwayWin = result === 'away';
    if (isHomeWin || isAwayWin) {
      card.classList.add('mc-winner-flash');
    } else {
      card.classList.add('mc-draw-flash');
    }
    // Score stamp animation
    const score = card.querySelector('.mc-score');
    if (score) score.classList.add('mc-score-stamp');
    // Cleanup
    setTimeout(() => {
      card.classList.remove('mc-just-settled', 'mc-winner-flash', 'mc-draw-flash');
      if (score) score.classList.remove('mc-score-stamp');
    }, 1500);
  }, delay);
}

// ── Dramatic result overlay (shows ALL matches) ──────────
function showResultOverlay(results, forceShow = false) {
  const overlay = document.getElementById('result-overlay');
  if (!overlay || !results.length) return;

  const betResults = results.filter(r => r.bet);
  const totalWon = betResults.filter(r => r.outcome === 'won').reduce((a, r) => a + r.bet.payout, 0);
  const totalLost = betResults.filter(r => r.outcome === 'lost').reduce((a, r) => a + r.bet.amount, 0);
  const anyBetWin = betResults.some(r => r.outcome === 'won');
  const anyBigWin = betResults.some(r => r.outcome === 'won' && r.bet.payout >= r.bet.amount * 3);
  const hasBets = betResults.length > 0;

  // Build match lines for ALL results
  const matchLines = results.map((r, i) => {
    const h = T[r.match.home], a = T[r.match.away];
    const isHomeWin = r.match.result === 'home';
    const isAwayWin = r.match.result === 'away';
    const isDraw = r.match.result === 'draw';
    const winnerName = isHomeWin ? h.name : isAwayWin ? a.name : null;

    // Bet info
    let betBadge = '';
    if (r.bet) {
      const isWin = r.outcome === 'won';
      const isPush = r.outcome === 'push';
      const payoutText = isWin ? `+${r.bet.payout}🪙` : isPush ? `↩${r.bet.amount}🪙` : `−${r.bet.amount}🪙`;
      const betCls = isWin ? 'ro-bet-won' : isPush ? 'ro-bet-push' : 'ro-bet-lost';
      betBadge = `<span class="ro-bet-badge ${betCls}">${payoutText}</span>`;
    }

    const winTag = isDraw ? '<span class="ro-draw-tag">DRAW</span>' :
      `<span class="ro-winner-tag">${winnerName} WIN</span>`;

    return `<div class="ro-match-row" style="animation-delay:${i * 120 + 300}ms">
      <div class="ro-match-teams">
        <span class="ro-flag">${flagImg(r.match.home, 'ro-flag-img')}</span>
        <span class="ro-tname ${isHomeWin ? 'ro-winner' : isDraw ? '' : 'ro-loser'}">${h.name}</span>
        <span class="ro-score-box">${r.match.score[0]} – ${r.match.score[1]}</span>
        <span class="ro-tname ${isAwayWin ? 'ro-winner' : isDraw ? '' : 'ro-loser'}">${a.name}</span>
        <span class="ro-flag">${flagImg(r.match.away, 'ro-flag-img')}</span>
      </div>
      <div class="ro-match-meta">
        ${winTag}${betBadge}
      </div>
    </div>`;
  }).join('');

  // Determine theme
  let bigClass, headline, headlineIcon;
  if (!hasBets) {
    bigClass = 'ro-neutral';
    headline = 'DAY COMPLETE';
    headlineIcon = '⚽';
  } else if (anyBigWin) {
    bigClass = 'ro-jackpot';
    headline = 'JACKPOT';
    headlineIcon = '💰';
  } else if (anyBetWin) {
    bigClass = 'ro-victory';
    headline = 'YOU WIN';
    headlineIcon = '🎉';
  } else {
    bigClass = 'ro-defeat';
    headline = 'BETTER LUCK NEXT TIME';
    headlineIcon = '😤';
  }

  const chipsSection = hasBets && anyBetWin ? `<div class="ro-chips-display ro-net-pos">
    <span class="ro-chips-icon">🪙</span>
    <span class="ro-chips-num" id="ro-lerp-num">0</span>
  </div>` : hasBets ? `<div class="ro-chips-display ro-net-neg">
    <span class="ro-chips-icon">🪙</span>
    <span class="ro-chips-num">−${totalLost}</span>
  </div>` : '';

  overlay.className = `ro-overlay ${bigClass}`;
  overlay.innerHTML = `
    <div class="ro-backdrop" onclick="closeResultOverlay()"></div>
    <div class="ro-card">
      <div class="ro-glow"></div>
      <div class="ro-shine"></div>
      <div class="ro-headline-icon">${headlineIcon}</div>
      <div class="ro-headline">${headline}</div>
      ${chipsSection}
      <div class="ro-results-scroll">${matchLines}</div>
      <button class="ro-dismiss" onclick="closeResultOverlay()">CONTINUE</button>
    </div>
  `;
  overlay.style.display = 'flex';

  // Lerp the big payout number
  if (hasBets && anyBetWin) {
    const lerpEl = document.getElementById('ro-lerp-num');
    if (lerpEl) {
      const target = totalWon;
      const start = performance.now();
      const dur = anyBigWin ? 2000 : 1200;
      function tick(now) {
        const t = Math.min((now - start) / dur, 1);
        const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        lerpEl.textContent = '+' + Math.round(target * ease).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
      }
      setTimeout(() => requestAnimationFrame(tick), 400);
    }
  }

  // Confetti bursts for wins
  if (anyBetWin) {
    setTimeout(() => {
      const card = overlay.querySelector('.ro-card');
      if (card) {
        const r = card.getBoundingClientRect();
        spawnConfetti(r.left + r.width / 2, r.top + 60, anyBigWin ? 60 : 25);
      }
    }, 250);
    if (anyBigWin) {
      setTimeout(() => {
        const card = overlay.querySelector('.ro-card');
        if (card) {
          const r = card.getBoundingClientRect();
          spawnConfetti(r.left + r.width * 0.2, r.top + 40, 30);
          spawnConfetti(r.left + r.width * 0.8, r.top + 40, 30);
        }
      }, 700);
    }
  }

  // Even without bets, small confetti for day-complete feel
  if (!hasBets) {
    setTimeout(() => {
      const card = overlay.querySelector('.ro-card');
      if (card) {
        const r = card.getBoundingClientRect();
        spawnConfetti(r.left + r.width / 2, r.top + 50, 12);
      }
    }, 400);
  }
}

let _pendingChampVictory = null;

function closeResultOverlay() {
  const overlay = document.getElementById('result-overlay');
  if (overlay) {
    overlay.classList.add('ro-closing');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.className = '';
      overlay.innerHTML = '';
      // Show queued champion victory after result overlay closes
      if (_pendingChampVictory) {
        const { tid, bonus } = _pendingChampVictory;
        _pendingChampVictory = null;
        showChampionVictoryOverlay(tid, bonus);
      }
    }, 300);
  }
}

// Expose close to window
if (typeof window !== 'undefined') window.closeResultOverlay = closeResultOverlay;

// ── Collect bet results for overlay ──────────────────────
function forceChampionResult(m, res) {
  const champ = state.ST.champion;
  if (!champ || !['r32','r16','qf','sf','final'].includes(m.phaseId)) return res;
  if (m.home === champ && res !== 'home') return 'home';
  if (m.away === champ && res !== 'away') return 'away';
  return res;
}

function settleWithTracking(m) {
  const h = T[m.home], a = T[m.away];
  let res = simResult(h.str, a.str);
  res = forceChampionResult(m, res);
  m.status = 'settled'; m.result = res; m.score = simScore(res);
  m.stats = simMatchStats(m, m.score);
  const bet = state.ST.bets[m.id];
  let outcome = null;
  if (bet && bet.status === 'pending') {
    outcome = resolveBet(bet, m, res, m.score, m.stats);
    if (outcome === 'won') {
      bet.payout = Math.round(bet.amount * bet.odds); bet.status = 'won'; state.ST.coins += bet.payout;
      addXP(100);
    } else if (outcome === 'push') {
      bet.payout = bet.amount; bet.status = 'push'; state.ST.coins += bet.amount;
      addXP(15);
    } else {
      bet.payout = 0; bet.status = 'lost'; addXP(10);
    }
  }
  if (['r32','r16','qf','sf'].includes(m.phaseId)) advanceWinner(m);
  // Check for champion prediction win
  if (m.phaseId === 'final') checkChampionPrediction(m);
  return { match: m, bet, outcome };
}

function checkChampionPrediction(m) {
  const champ = state.ST.champion;
  if (!champ || state.ST.champRewardClaimed) return;
  const winner = m.result === 'home' ? m.home : m.result === 'away' ? m.away : null;
  if (winner === champ) {
    state.ST.champRewardClaimed = true;
    const bonus = 10000;
    state.ST.coins += bonus;
    addXP(1000);
    saveState();
    // Queue victory overlay — shows after user closes the result overlay
    _pendingChampVictory = { tid: champ, bonus };
    // Fallback: if no result overlay appears within 3s, show directly
    setTimeout(() => {
      if (_pendingChampVictory) {
        const { tid, bonus } = _pendingChampVictory;
        _pendingChampVictory = null;
        showChampionVictoryOverlay(tid, bonus);
      }
    }, 3000);
  }
}

function showChampionVictoryOverlay(tid, bonus) {
  const team = T[tid];
  if (!team) return;
  const overlay = document.createElement('div');
  overlay.id = 'champ-victory-overlay';
  overlay.className = 'champ-victory-overlay';
  overlay.innerHTML = `
    <div class="champ-victory-backdrop" onclick="closeChampVictory()"></div>
    <div class="champ-victory-card">
      <div class="champ-victory-glow"></div>
      <div class="champ-victory-confetti-zone"></div>
      <div class="champ-victory-trophy">🏆</div>
      <div class="champ-victory-headline">PREDICTION CORRECT</div>
      <div class="champ-victory-team">
        ${flagImg(tid, 'champ-victory-flag')}
        <span>${team.name}</span>
      </div>
      <div class="champ-victory-sub">WORLD CHAMPIONS 2026</div>
      <div class="champ-victory-reward">
        <div class="champ-victory-reward-label">MEGA REWARD</div>
        <div class="champ-victory-coins">+${bonus.toLocaleString()} 🪙</div>
        <div class="champ-victory-xp">+1,000 XP</div>
      </div>
      <button class="champ-victory-btn" onclick="closeChampVictory()">CLAIM REWARD</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Confetti bursts
  setTimeout(() => {
    const card = overlay.querySelector('.champ-victory-card');
    if (card) {
      const r = card.getBoundingClientRect();
      spawnConfetti(r.left + r.width / 2, r.top + 60, 80);
      spawnConfetti(r.left + r.width * 0.2, r.top + 40, 40);
      spawnConfetti(r.left + r.width * 0.8, r.top + 40, 40);
    }
  }, 300);
  setTimeout(() => {
    const card = overlay.querySelector('.champ-victory-card');
    if (card) {
      const r = card.getBoundingClientRect();
      spawnConfetti(r.left + r.width / 2, r.top + 100, 50);
    }
  }, 900);

  SFX.bigWin();
  setTimeout(() => SFX.chipRain(), 400);
}

function closeChampVictory() {
  const el = document.getElementById('champ-victory-overlay');
  if (el) {
    el.classList.add('champ-victory-closing');
    setTimeout(() => el.remove(), 400);
  }
  _deps.updateAll();
}
if (typeof window !== 'undefined') window.closeChampVictory = closeChampVictory;

// ── Dramatic feedback after batch sim ────────────────────
function dramaticFeedback(results, coinsBefore) {
  const betResults = results.filter(r => r.bet);
  const anyWin = betResults.some(r => r.outcome === 'won');
  const anyBigWin = betResults.some(r => r.outcome === 'won' && r.bet.payout >= r.bet.amount * 3);

  // Screen flash
  if (anyBigWin) screenFlash('gold');
  else if (anyWin) screenFlash('green');

  // Always show the overlay (for all results, not just bets)
  showResultOverlay(results);

  // Lerp coins in header
  if (state.ST.coins !== coinsBefore) {
    lerpCoins(coinsBefore, state.ST.coins, anyBigWin ? 2000 : 1200);
  }

  // SFX + visual burst
  setTimeout(() => {
    if (anyBigWin) {
      SFX.bigWin();
      SFX.chipRain();
      const coinEl = document.getElementById('h-coins');
      if (coinEl) {
        const r = coinEl.getBoundingClientRect();
        spawnConfetti(r.left + r.width / 2, r.top, 50);
      }
      flashElement(document.querySelector('header'), 'green', 800);
    } else if (anyWin) {
      SFX.win();
      coinPopAnimation();
      const coinEl = document.getElementById('h-coins');
      if (coinEl) {
        const r = coinEl.getBoundingClientRect();
        spawnConfetti(r.left + r.width / 2, r.top, 20);
      }
      flashElement(document.querySelector('header'), 'green', 600);
    } else if (betResults.length) {
      SFX.lose();
      shakeElement(document.getElementById('h-coins'));
      flashElement(document.querySelector('header'), 'red', 400);
    } else {
      SFX.coins();
    }
  }, 150);

  // Animate match cards with stagger
  _deps.renderMatches();
  results.forEach((r, i) => {
    animateMatchCard(r.match.id, r.match.result, i * 200);
    // Floating payout on bet cards
    if (r.bet) {
      const isWin = r.outcome === 'won';
      const txt = isWin ? `+${r.bet.payout}🪙` : `−${r.bet.amount}`;
      setTimeout(() => spawnFloatingPayout(r.match.id, txt, isWin), i * 200 + 300);
    }
  });
}

// ── Single match settle (used by simNext) ────────────────
export function settle(m) {
  const h = T[m.home], a = T[m.away];
  let res = simResult(h.str, a.str);
  res = forceChampionResult(m, res);
  m.status = 'settled'; m.result = res; m.score = simScore(res);
  m.stats = simMatchStats(m, m.score);
  const bet = state.ST.bets[m.id];
  if (bet && bet.status === 'pending') {
    const outcome = resolveBet(bet, m, res, m.score, m.stats);
    if (outcome === 'won') {
      bet.payout = Math.round(bet.amount * bet.odds); bet.status = 'won'; state.ST.coins += bet.payout;
      addXP(100);
      if (!state.silent) {
        const bigPay = bet.payout >= bet.amount * 3;
        bigPay ? SFX.bigWin() : SFX.win();
        coinPopAnimation();
        _deps.toast(`🎉 ${h.name} ${m.score[0]}–${m.score[1]} ${a.name} · Won ${bet.payout}!`);
        const hdr = document.querySelector('header');
        if (hdr) flashElement(hdr, 'green', 600);
        const coinEl = document.getElementById('h-coins');
        if (coinEl) { const r = coinEl.getBoundingClientRect(); spawnConfetti(r.left + r.width/2, r.top, bigPay ? 40 : 15); }
      }
    } else if (outcome === 'push') {
      bet.payout = bet.amount; bet.status = 'push'; state.ST.coins += bet.amount;
      addXP(15);
      if (!state.silent) { SFX.push(); coinPopAnimation(); _deps.toast(`🤝 ${h.name} ${m.score[0]}–${m.score[1]} ${a.name} · Push — refunded ${bet.amount}`); }
    } else {
      bet.payout = 0; bet.status = 'lost'; addXP(10);
      if (!state.silent) { SFX.lose(); shakeElement(document.getElementById('h-coins')); _deps.toast(`😔 ${h.name} ${m.score[0]}–${m.score[1]} ${a.name} · Lost`); }
    }
  }
  if (['r32','r16','qf','sf'].includes(m.phaseId)) advanceWinner(m);
  if (m.phaseId === 'final') checkChampionPrediction(m);
}

export function simDay() {
  const dayMs = state.MS.filter(m => m.dateKey === state.activeDay && m.home !== 'TBD');
  const pending = dayMs.filter(m => m.status === 'pending');
  const allDone = dayMs.length > 0 && dayMs.every(m => m.status === 'settled');

  if (allDone) {
    const days = _deps.getAllMatchDays();
    const idx = days.findIndex(d => d.key === state.activeDay);
    if (idx < days.length - 1) {
      SFX.nav();
      state.activeDay = days[idx + 1].key;
      state.activePhase = days[idx + 1].phaseId;
      _deps.updateAll(); _deps.renderMatches();
    } else {
      SFX.error(); _deps.toast('Tournament complete!');
    }
    return;
  }

  if (!pending.length) {
    SFX.error(); _deps.toast('No matches to simulate today');
    return;
  }

  SFX.sim();
  screenFlash('gold');
  const coinsBefore = state.ST.coins;
  const results = pending.map(m => settleWithTracking(m));
  saveMatches(); saveState();
  _deps.updateAll();

  dramaticFeedback(results, coinsBefore);
}

export function simNext() {
  const next = state.MS.find(m => m.dateKey === state.activeDay && m.status === 'pending' && m.home !== 'TBD')
             || state.MS.find(m => m.status === 'pending' && m.home !== 'TBD');
  if (!next) { SFX.error(); _deps.toast('No more matches to simulate'); return; }
  SFX.sim();
  if (next.dateKey) { state.activeDay = next.dateKey; state.activePhase = next.phaseId; }

  const coinsBefore = state.ST.coins;
  const result = settleWithTracking(next);
  saveMatches(); saveState();
  _deps.updateAll();

  const h = T[next.home], a = T[next.away];
  const winnerName = next.result === 'home' ? h.name : next.result === 'away' ? a.name : 'Draw';

  // Screen flash
  screenFlash('gold');

  // Show overlay for single match
  showResultOverlay([result]);

  // Render and animate the card
  _deps.renderMatches();
  animateMatchCard(next.id, next.result, 100);

  if (result.bet) {
    if (state.ST.coins !== coinsBefore) {
      lerpCoins(coinsBefore, state.ST.coins, result.outcome === 'won' && result.bet.payout >= result.bet.amount * 3 ? 2000 : 1000);
    }
    const isWin = result.outcome === 'won';
    const txt = isWin ? `+${result.bet.payout}🪙` : `−${result.bet.amount}`;
    setTimeout(() => spawnFloatingPayout(next.id, txt, isWin), 400);

    if (result.outcome === 'won') {
      const bigPay = result.bet.payout >= result.bet.amount * 3;
      setTimeout(() => {
        bigPay ? SFX.bigWin() : SFX.win();
        coinPopAnimation();
        flashElement(document.querySelector('header'), 'green', 600);
        const coinEl = document.getElementById('h-coins');
        if (coinEl) { const r = coinEl.getBoundingClientRect(); spawnConfetti(r.left + r.width/2, r.top, bigPay ? 40 : 15); }
      }, 150);
    } else if (result.outcome === 'push') {
      SFX.push(); coinPopAnimation();
    } else {
      setTimeout(() => {
        SFX.lose(); shakeElement(document.getElementById('h-coins'));
        flashElement(document.querySelector('header'), 'red', 400);
      }, 150);
    }
  } else {
    // No bet — satisfying settle sound
    SFX.coins();
  }

  // Toast the result
  const resultMsg = winnerName !== 'Draw'
    ? `⚽ ${h.name} ${next.score[0]}–${next.score[1]} ${a.name} · ${winnerName} win!`
    : `⚽ ${h.name} ${next.score[0]}–${next.score[1]} ${a.name} · Draw`;
  _deps.toast(resultMsg);
}

export function simAll() {
  const p = state.MS.filter(m => m.status === 'pending' && m.home !== 'TBD');
  if (!p.length) { SFX.error(); _deps.toast('No more matches'); return; }
  SFX.sim();
  screenFlash('gold');

  const coinsBefore = state.ST.coins;
  const results = p.map(m => settleWithTracking(m));
  saveMatches(); saveState();

  const betResults = results.filter(r => r.bet);
  const anyWin = betResults.some(r => r.outcome === 'won');
  const totalWon = betResults.filter(r => r.outcome === 'won').reduce((a, r) => a + r.bet.payout, 0);

  _deps.toast(`⚡ Simulated ${p.length} matches` + (anyWin ? ` · Won ${totalWon}🪙` : ''));
  _deps.updateAll();
  dramaticFeedback(results, coinsBefore);
}

export function resetGame() {
  if (!confirm('Reset all progress?')) return;
  localStorage.removeItem(LS_S); localStorage.removeItem(LS_M);
  state.ST = loadState();
  state.MS = loadMatches(genMatches);
  state.activePhase = 'group';
  state.activeDay = _deps.getAllMatchDays()[0]?.key || '';
  _deps.updateAll(); _deps.renderMatches(); _deps.toast('Reset complete');
  if (_deps.onReset) _deps.onReset();
}
