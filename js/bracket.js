// ═══════════════════════════════════════════════════════════
// BRACKET — Knockout bracket overlay rendering
// ═══════════════════════════════════════════════════════════
import { state } from './state.js';
import { T, flagImg } from './data/teams.js';
import { SFX } from './audio-fx.js';

let _deps = {};
export function setBracketDeps({ openPreview }) {
  _deps = { openPreview };
}

export function bktWinner(m) {
  if (!m || m.status !== 'settled') return null;
  if (m.koWinner) return m.koWinner;
  return m.result==='home' ? m.home : m.result==='away' ? m.away : null;
}

function bktMatchCard(m, isFinal) {
  if (!m) {
    return `<div class="bkt-match-card tbd"><div class="bkt-team-row"><span class="bkt-tname" style="color:var(--muted)">TBD</span></div><div class="bkt-team-row"><span class="bkt-tname" style="color:var(--muted)">TBD</span></div></div>`;
  }
  const tbd = m.home==='TBD' || m.away==='TBD';
  const settled = m.status === 'settled';
  const win = bktWinner(m);
  const cls = 'bkt-match-card' + (tbd?' tbd':'') + (isFinal?' final-card':'');
  function teamRow(tid, score) {
    if (!tid || tid==='TBD') return `<div class="bkt-team-row"><span class="bkt-tname" style="color:var(--muted)">TBD</span></div>`;
    const isW = settled && win===tid, isL = settled && win && win!==tid;
    return `<div class="bkt-team-row${isW?' winner':isL?' loser':''}">
      ${flagImg(tid,'flag-img-sm')}
      <span class="bkt-tname">${T[tid]?.name||tid}</span>
      ${settled ? `<span class="bkt-sc">${score}</span>` : ''}
    </div>`;
  }
  const clickable = !tbd && m.home !== 'TBD';
  return `<div class="${cls}"${clickable?` onclick="bktOpenMatch(${m.id})"`:''}  id="bkt-m-${m.id}">
    ${teamRow(m.home, m.score?.[0]??'')}
    ${teamRow(m.away, m.score?.[1]??'')}
  </div>`;
}

export function renderBracket() {
  const body = document.getElementById('bracket-body'); if (!body) return;
  const r32 = state.MS.filter(m => m.phaseId==='r32');
  const r16 = state.MS.filter(m => m.phaseId==='r16');
  const qf  = state.MS.filter(m => m.phaseId==='qf');
  const sf  = state.MS.filter(m => m.phaseId==='sf');
  const fin = state.MS.find(m => m.phaseId==='final');
  function makeRound(arr, label, pfx) {
    return `<div class="bkt-round" id="${pfx}">
      <div class="bkt-round-hdr">${label}</div>
      ${arr.map((m,i) => `<div class="bkt-slot" id="${pfx}-s${i}">${bktMatchCard(m,false)}</div>`).join('')}
    </div>`;
  }
  const champion = bktWinner(fin);
  const champDisplay = champion ? (T[champion]?.name || champion) : 'TBD';
  body.innerHTML = `
    <div class="bkt-body-inner" id="bkt-inner">
      <div class="bkt-half left">
        ${makeRound(r32.slice(0,8),'Round of 32','bkt-r32l')}
        ${makeRound(r16.slice(0,4),'Round of 16','bkt-r16l')}
        ${makeRound(qf.slice(0,2),'Quarter-Final','bkt-qfl')}
        ${makeRound(sf.slice(0,1),'Semi-Final','bkt-sfl')}
      </div>
      <div class="bkt-center">
        <div class="bkt-trophy-icon">🏆</div>
        <div style="width:100%;margin:4px 0">${fin ? bktMatchCard(fin,true) : ''}</div>
        <div class="bkt-champ-lbl">Champion</div>
        <div class="bkt-champ-name">${champDisplay}</div>
      </div>
      <div class="bkt-half right">
        ${makeRound(r32.slice(8,16),'Round of 32','bkt-r32r')}
        ${makeRound(r16.slice(4,8),'Round of 16','bkt-r16r')}
        ${makeRound(qf.slice(2,4),'Quarter-Final','bkt-qfr')}
        ${makeRound(sf.slice(1,2),'Semi-Final','bkt-sfr')}
      </div>
    </div>
    <svg id="bkt-svg"></svg>`;
  requestAnimationFrame(() => requestAnimationFrame(drawBracketSVG));
}

function drawBracketSVG() {
  const svg = document.getElementById('bkt-svg');
  const inner = document.getElementById('bkt-inner');
  const body = document.getElementById('bracket-body');
  if (!svg || !inner || !body) return;
  const ir = inner.getBoundingClientRect();
  const br = body.getBoundingClientRect();
  svg.style.left = (ir.left-br.left+body.scrollLeft) + 'px';
  svg.style.top = (ir.top-br.top+body.scrollTop) + 'px';
  svg.setAttribute('width', ir.width); svg.setAttribute('height', ir.height);
  const center = inner.querySelector('.bkt-center');
  if (center) {
    const cx = center.offsetLeft + center.offsetWidth/2;
    body.scrollLeft = cx - br.width/2;
  }
  svg.innerHTML = '';
  const stroke = 'rgba(200,160,82,0.32)';
  function ln(x1,y1,x2,y2) {
    const l = document.createElementNS('http://www.w3.org/2000/svg','line');
    l.setAttribute('x1',x1); l.setAttribute('y1',y1);
    l.setAttribute('x2',x2); l.setAttribute('y2',y2);
    l.setAttribute('stroke',stroke); l.setAttribute('stroke-width','1.5');
    svg.appendChild(l);
  }
  function cardRect(slotId) {
    const slot = document.getElementById(slotId); if (!slot) return null;
    const card = slot.querySelector('.bkt-match-card'); if (!card) return null;
    const r = card.getBoundingClientRect();
    return {left:r.left-ir.left, right:r.right-ir.left, cy:r.top-ir.top+r.height/2};
  }
  function connLeft(n, fromPfx, toPfx) {
    for (let i=0; i<n; i++) {
      const a=cardRect(`${fromPfx}-s${i*2}`);
      const b=cardRect(`${fromPfx}-s${i*2+1}`);
      const c=cardRect(`${toPfx}-s${i}`);
      if (!a||!b||!c) continue;
      const xMid=(a.right+c.left)/2;
      ln(a.right,a.cy,xMid,a.cy);
      ln(b.right,b.cy,xMid,b.cy);
      ln(xMid,a.cy,xMid,b.cy);
      ln(xMid,(a.cy+b.cy)/2,c.left,(a.cy+b.cy)/2);
    }
  }
  function connRight(n, fromPfx, toPfx) {
    for (let i=0; i<n; i++) {
      const a=cardRect(`${fromPfx}-s${i*2}`);
      const b=cardRect(`${fromPfx}-s${i*2+1}`);
      const c=cardRect(`${toPfx}-s${i}`);
      if (!a||!b||!c) continue;
      const xMid=(a.left+c.right)/2;
      ln(a.left,a.cy,xMid,a.cy);
      ln(b.left,b.cy,xMid,b.cy);
      ln(xMid,a.cy,xMid,b.cy);
      ln(xMid,(a.cy+b.cy)/2,c.right,(a.cy+b.cy)/2);
    }
  }
  connLeft(4,'bkt-r32l','bkt-r16l');
  connLeft(2,'bkt-r16l','bkt-qfl');
  connLeft(1,'bkt-qfl','bkt-sfl');
  connRight(4,'bkt-r32r','bkt-r16r');
  connRight(2,'bkt-r16r','bkt-qfr');
  connRight(1,'bkt-qfr','bkt-sfr');

  const sfl = cardRect('bkt-sfl-s0');
  const sfr = cardRect('bkt-sfr-s0');
  const finCard = document.querySelector('#bkt-inner .bkt-center .bkt-match-card');
  if (sfl && finCard) {
    const rf = finCard.getBoundingClientRect();
    const xf = rf.left-ir.left, yf = rf.top-ir.top+rf.height/2;
    ln(sfl.right, sfl.cy, xf, yf);
  }
  if (sfr && finCard) {
    const rf = finCard.getBoundingClientRect();
    const xf = rf.right-ir.left, yf = rf.top-ir.top+rf.height/2;
    ln(sfr.left, sfr.cy, xf, yf);
  }
}

export function openBracket() {
  SFX.nav();
  document.getElementById('bracket-overlay').classList.add('open');
  renderBracket();
}

export function closeBracket() {
  SFX.click();
  document.getElementById('bracket-overlay').classList.remove('open');
}

export function bktOpenMatch(id) {
  const m = state.MS.find(x => x.id === id);
  if (!m || m.home === 'TBD') return;
  closeBracket();
  setTimeout(() => _deps.openPreview(id), 60);
}
