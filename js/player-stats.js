// ═══════════════════════════════════════════════════════════
// PLAYER STATS — Radar chart, stats view, player comparison
// ═══════════════════════════════════════════════════════════
import { getPlayerStats } from './data/squads.js?v=9';
import { T, flagImg, playerAvatar, loadPlayerPhoto } from './data/teams.js?v=9';

const STAT_KEYS   = ['att','tec','sta','def','pow','spd'];
const STAT_LABELS = ['ATT','TEC','STA','DEF','POW','SPD'];

export const psState = {
  compareMode: false,
  selectedPlayer: null,
  comparePlayerA: null,
  comparePlayerB: null,
};

// ── Radar Chart ─────────────────────────────────────────────
export function drawRadar(canvas, statsList) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.34;
  ctx.clearRect(0, 0, W, H);

  const n = 6;
  const step = (2 * Math.PI) / n;
  const start = -Math.PI / 2;
  const pt = (i, r) => ({
    x: cx + r * Math.cos(start + i * step),
    y: cy + r * Math.sin(start + i * step),
  });

  for (let ring = 1; ring <= 5; ring++) {
    const r = (R * ring) / 5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const p = pt(i, r); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(200,160,82,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const p = pt(i, R);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = 'rgba(200,160,82,0.15)';
    ctx.lineWidth = 1; ctx.stroke();
  }

  const lr = R + 16;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 10px "Segoe UI", sans-serif';
  ctx.fillStyle = '#8a9bb5';
  for (let i = 0; i < n; i++) { const p = pt(i, lr); ctx.fillText(STAT_LABELS[i], p.x, p.y); }

  const colors = [
    { fill:'rgba(240,192,64,0.18)', stroke:'rgba(240,200,100,0.8)', dot:'#f0c870' },
    { fill:'rgba(100,176,240,0.15)', stroke:'rgba(100,176,240,0.8)', dot:'#64b0f0' },
  ];
  statsList.forEach((stats, pi) => {
    const c = colors[pi];
    ctx.beginPath();
    STAT_KEYS.forEach((k, i) => {
      const p = pt(i, R * stats[k] / 100);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = c.fill; ctx.fill();
    ctx.strokeStyle = c.stroke; ctx.lineWidth = 2; ctx.stroke();
    STAT_KEYS.forEach((k, i) => {
      const p = pt(i, R * stats[k] / 100);
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = c.dot; ctx.fill();
    });
  });
}

// ── Stat Bars ───────────────────────────────────────────────
export function renderBars(container, stats, stats2) {
  if (!container) return;
  container.innerHTML = '';
  STAT_KEYS.forEach((k, i) => {
    const v = stats[k];
    const row = document.createElement('div');
    row.className = 'ps-bar-row';
    if (stats2) {
      const v2 = stats2[k];
      const w = v > v2 ? 'a' : v2 > v ? 'b' : '';
      row.innerHTML = `
        <span class="ps-bar-label">${STAT_LABELS[i]}</span>
        <span class="ps-bar-val${w==='a'?' ps-hl-a':''}">${v}</span>
        <div class="ps-bar-track dual">
          <div class="ps-bar-fill-a" style="width:${v}%"></div>
          <div class="ps-bar-fill-b" style="width:${v2}%"></div>
        </div>
        <span class="ps-bar-val${w==='b'?' ps-hl-b':''}">${v2}</span>`;
    } else {
      const hue = v >= 80 ? 48 : v >= 60 ? 30 : 0;
      row.innerHTML = `
        <span class="ps-bar-label">${STAT_LABELS[i]}</span>
        <span class="ps-bar-val">${v}</span>
        <div class="ps-bar-track">
          <div class="ps-bar-fill" style="width:${v}%;background:linear-gradient(90deg,hsl(${hue},70%,30%),hsl(${hue},70%,55%))"></div>
        </div>`;
    }
    container.appendChild(row);
  });
}

// ── Stats Panel (single player) ─────────────────────────────
export function renderStatsPanel(container) {
  if (!container) return;
  if (psState.compareMode) { renderComparePanel(container); return; }
  const sel = psState.selectedPlayer;
  if (!sel) {
    container.innerHTML = `
      <div class="ps-head"><div class="ps-head-title">Player Stats</div></div>
      <div class="ps-empty">
        <div style="font-size:28px;margin-bottom:8px;opacity:.5">&#9917;</div>
        <div>Click a player on the pitch<br>or roster to view stats</div>
      </div>`;
    return;
  }
  const { pl, teamId, stats } = sel;
  container.innerHTML = `
    <div class="ps-head"><div class="ps-head-title">Player Stats</div></div>
    <div class="ps-player-hdr">
      <div class="ps-avatar" id="ps-avatar-wrap">${playerAvatar(pl.n, 40)}</div>
      <div class="ps-player-info">
        <div class="ps-player-name">${pl.n}</div>
        <div class="ps-player-meta">${flagImg(teamId,'flag-img-sm')} ${T[teamId]?.name||''} &middot; ${pl.p}</div>
      </div>
      <div class="ps-ovr">${pl.r}</div>
    </div>
    <div class="ps-chart-wrap" id="ps-chart-wrap"></div>
    <div class="ps-details">
      <div class="ps-detail"><span class="ps-detail-lbl">Height</span><span class="ps-detail-val">${stats.height} cm</span></div>
      <div class="ps-detail"><span class="ps-detail-lbl">Age</span><span class="ps-detail-val">${pl.a}</span></div>
      <div class="ps-detail"><span class="ps-detail-lbl">Foot</span><span class="ps-detail-val">${stats.foot==='R'?'Right':'Left'}</span></div>
    </div>
    <div id="ps-bars"></div>
    <button class="ps-compare-btn" onclick="toggleCompareMode()">&#9876; COMPARE PLAYERS</button>`;

  const canvas = document.createElement('canvas');
  canvas.width = 220; canvas.height = 220;
  document.getElementById('ps-chart-wrap')?.appendChild(canvas);
  drawRadar(canvas, [stats]);
  renderBars(document.getElementById('ps-bars'), stats);

  loadPlayerPhoto(pl.n).then(url => {
    if (!url) return;
    const w = document.getElementById('ps-avatar-wrap');
    if (w) w.innerHTML = `<img src="${url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;object-position:top center" onerror="this.style.display='none'">`;
  });
}

// ── Compare Panel ───────────────────────────────────────────
function renderComparePanel(container) {
  const { comparePlayerA: pA, comparePlayerB: pB } = psState;
  if (!pA || !pB) {
    const selected = pA
      ? `<div class="ps-cmp-selected">
           <span class="ps-cmp-dot a"></span>
           ${playerAvatar(pA.pl.n, 22)}
           <span style="font-weight:700;font-size:11px">${pA.pl.n}</span>
         </div>
         <div class="ps-cmp-hint">Now select second player</div>`
      : `<div class="ps-cmp-hint">Select first player from pitch or roster</div>`;
    container.innerHTML = `
      <div class="ps-head"><div class="ps-head-title">Compare Players</div></div>
      ${selected}
      <button class="ps-compare-btn exit" onclick="toggleCompareMode()">&#10005; EXIT COMPARE</button>`;
    return;
  }

  function cmpRow(label, vA, vB, nA, nB) {
    const aW = nA !== undefined && nB !== undefined && nA > nB;
    const bW = nA !== undefined && nB !== undefined && nB > nA;
    return `<div class="ps-cmp-row">
      <span class="ps-cmp-rv${aW?' win':''}">${vA}</span>
      <span class="ps-cmp-rl">${label}</span>
      <span class="ps-cmp-rv${bW?' win':''}">${vB}</span>
    </div>`;
  }

  container.innerHTML = `
    <div class="ps-head"><div class="ps-head-title">Compare Players</div></div>
    <div class="ps-cmp-header">
      <div class="ps-cmp-side a">
        <div id="ps-cmp-ava" class="ps-cmp-ava">${playerAvatar(pA.pl.n, 28)}</div>
        <div>
          <div class="ps-cmp-name">${pA.pl.n}</div>
          <div class="ps-cmp-meta">${pA.pl.p} &middot; ${pA.pl.r}</div>
        </div>
      </div>
      <div class="ps-cmp-vs">VS</div>
      <div class="ps-cmp-side b">
        <div style="text-align:right">
          <div class="ps-cmp-name">${pB.pl.n}</div>
          <div class="ps-cmp-meta">${pB.pl.p} &middot; ${pB.pl.r}</div>
        </div>
        <div id="ps-cmp-avb" class="ps-cmp-ava">${playerAvatar(pB.pl.n, 28)}</div>
      </div>
    </div>
    <div class="ps-cmp-legend">
      <span class="ps-cmp-dot a"></span> ${pA.pl.n.split(' ').pop()}
      <span class="ps-cmp-dot b" style="margin-left:10px"></span> ${pB.pl.n.split(' ').pop()}
    </div>
    <div class="ps-chart-wrap" id="ps-chart-wrap"></div>
    <div class="ps-cmp-details">
      ${cmpRow('Height', pA.stats.height+'cm', pB.stats.height+'cm', pA.stats.height, pB.stats.height)}
      ${cmpRow('Age', pA.pl.a, pB.pl.a, pB.pl.a, pA.pl.a)}
      ${cmpRow('Foot', pA.stats.foot==='R'?'Right':'Left', pB.stats.foot==='R'?'Right':'Left')}
      ${cmpRow('OVR', pA.pl.r, pB.pl.r, pA.pl.r, pB.pl.r)}
    </div>
    <div id="ps-bars"></div>
    <button class="ps-compare-btn exit" onclick="toggleCompareMode()">&#10005; EXIT COMPARE</button>`;

  const canvas = document.createElement('canvas');
  canvas.width = 230; canvas.height = 230;
  document.getElementById('ps-chart-wrap')?.appendChild(canvas);
  drawRadar(canvas, [pA.stats, pB.stats]);
  renderBars(document.getElementById('ps-bars'), pA.stats, pB.stats);

  [['ps-cmp-ava', pA.pl.n], ['ps-cmp-avb', pB.pl.n]].forEach(([id, name]) => {
    loadPlayerPhoto(name).then(url => {
      if (!url) return;
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<img src="${url}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;object-position:top center" onerror="this.style.display='none'">`;
    });
  });
}

// ── Compare Overlay ─────────────────────────────────────────
export function startCompare(pl, teamId, side, squadIdx) {
  const stats = getPlayerStats(pl);
  const entry = { pl, teamId, stats, side, squadIdx };
  if (!psState.comparePlayerA) {
    psState.comparePlayerA = entry;
    return 'picked-a';
  }
  if (psState.comparePlayerA.side === side && psState.comparePlayerA.squadIdx === squadIdx) {
    psState.comparePlayerA = null;
    return 'cancelled';
  }
  psState.comparePlayerB = entry;
  return 'ready';
}

export function clearCompare() {
  psState.comparePlayerA = null;
  psState.comparePlayerB = null;
  document.querySelectorAll('.compare-selected').forEach(el => el.classList.remove('compare-selected'));
  document.querySelector('.compare-hint')?.remove();
  const ov = document.getElementById('compare-overlay');
  if (ov) ov.style.display = 'none';
}

function cmpRow(label, vA, vB, nA, nB) {
  const aW = nA !== undefined && nB !== undefined && nA > nB;
  const bW = nA !== undefined && nB !== undefined && nB > nA;
  return `<div class="cmp-detail-row">
    <span class="cmp-rv${aW?' cmp-win':''}">${vA}</span>
    <span class="cmp-rl">${label}</span>
    <span class="cmp-rv${bW?' cmp-win':''}">${vB}</span>
  </div>`;
}

export function renderCompareOverlay() {
  const ov = document.getElementById('compare-overlay');
  if (!ov) return;
  const { comparePlayerA: pA, comparePlayerB: pB } = psState;
  if (!pA || !pB) return;

  ov.innerHTML = `
    <div class="cmp-backdrop" onclick="closeCompareOverlay()"></div>
    <div class="cmp-card">
      <div class="cmp-vs-splash">
        <div class="cmp-vs-side cmp-vs-left">
          <div class="cmp-vs-avatar" id="cmp-ava-a">${playerAvatar(pA.pl.n, 56)}</div>
          <div class="cmp-vs-name">${pA.pl.n}</div>
          <div class="cmp-vs-meta">${flagImg(pA.teamId,'flag-img-sm')} ${T[pA.teamId]?.name||''}</div>
        </div>
        <div class="cmp-vs-badge">VS</div>
        <div class="cmp-vs-side cmp-vs-right">
          <div class="cmp-vs-avatar" id="cmp-ava-b">${playerAvatar(pB.pl.n, 56)}</div>
          <div class="cmp-vs-name">${pB.pl.n}</div>
          <div class="cmp-vs-meta">${flagImg(pB.teamId,'flag-img-sm')} ${T[pB.teamId]?.name||''}</div>
        </div>
      </div>
      <div class="cmp-ovr-row">
        <span class="cmp-ovr${pA.pl.r>=pB.pl.r?' cmp-win':''}">${pA.pl.r}</span>
        <span class="cmp-ovr-label">OVR</span>
        <span class="cmp-ovr${pB.pl.r>=pA.pl.r?' cmp-win':''}">${pB.pl.r}</span>
      </div>
      <div class="cmp-legend">
        <span class="cmp-dot-a"></span> ${pA.pl.n.split(' ').pop()}
        <span class="cmp-dot-b" style="margin-left:12px"></span> ${pB.pl.n.split(' ').pop()}
      </div>
      <div class="cmp-radar-wrap" id="cmp-radar-wrap"></div>
      <div class="cmp-details">
        ${cmpRow('Height', pA.stats.height+'cm', pB.stats.height+'cm', pA.stats.height, pB.stats.height)}
        ${cmpRow('Age', pA.pl.a, pB.pl.a, pB.pl.a, pA.pl.a)}
        ${cmpRow('Foot', pA.stats.foot==='R'?'Right':'Left', pB.stats.foot==='R'?'Right':'Left')}
        ${cmpRow('Position', pA.pl.p, pB.pl.p)}
      </div>
      <div id="cmp-bars" class="cmp-bars"></div>
      <button class="cmp-close-btn" onclick="closeCompareOverlay()">CLOSE</button>
    </div>`;

  ov.style.display = 'flex';
  // Double rAF to ensure display:flex is painted before transition starts
  requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('open')));

  const canvas = document.createElement('canvas');
  canvas.width = 240; canvas.height = 240;
  document.getElementById('cmp-radar-wrap')?.appendChild(canvas);
  drawRadar(canvas, [pA.stats, pB.stats]);
  renderBars(document.getElementById('cmp-bars'), pA.stats, pB.stats);

  [['cmp-ava-a', pA.pl.n], ['cmp-ava-b', pB.pl.n]].forEach(([id, name]) => {
    loadPlayerPhoto(name).then(url => {
      if (!url) return;
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<img src="${url}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;object-position:top center" onerror="this.style.display='none'">`;
    });
  });
}

export function closeCompareOverlay() {
  const ov = document.getElementById('compare-overlay');
  if (!ov) return;
  ov.classList.remove('open');
  ov.classList.add('closing');
  setTimeout(() => {
    ov.style.display = 'none';
    ov.classList.remove('closing');
    ov.innerHTML = '';
  }, 300);
  clearCompare();
}

// ── Public API ──────────────────────────────────────────────
export function onPlayerSelected(pl, teamId, side, squadIdx) {
  const stats = getPlayerStats(pl);
  const entry = { pl, teamId, stats, side, squadIdx };
  if (psState.compareMode) {
    if (!psState.comparePlayerA) {
      psState.comparePlayerA = entry;
    } else if (!psState.comparePlayerB) {
      if (psState.comparePlayerA.side === side && psState.comparePlayerA.squadIdx === squadIdx) return;
      psState.comparePlayerB = entry;
    } else {
      psState.comparePlayerA = entry;
      psState.comparePlayerB = null;
    }
  } else {
    psState.selectedPlayer = entry;
  }
  refreshStatsIfActive();
}

export function toggleCompareMode() {
  psState.compareMode = !psState.compareMode;
  if (psState.compareMode) {
    psState.comparePlayerA = psState.selectedPlayer ? { ...psState.selectedPlayer } : null;
    psState.comparePlayerB = null;
  } else {
    psState.comparePlayerA = null;
    psState.comparePlayerB = null;
  }
  refreshStatsIfActive();
}

export function resetStatsState() {
  psState.compareMode = false;
  psState.selectedPlayer = null;
  psState.comparePlayerA = null;
  psState.comparePlayerB = null;
}

function refreshStatsIfActive() {
  const content = document.getElementById('ps-tab-content');
  if (!content) return;
  const tabRow = content.closest('.preview-sp')?.querySelector('.ps-rtab.active');
  if (tabRow && tabRow.dataset.tab === 'stats') {
    renderStatsPanel(content);
  }
}
