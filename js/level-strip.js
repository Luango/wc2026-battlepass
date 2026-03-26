// ═══════════════════════════════════════════════════════════
// LEVEL STRIP — Horizontal scrollable reward cards + XP bar VFX
// ═══════════════════════════════════════════════════════════
import { state } from './state.js';

// ── Rarity definitions (inline to avoid cache issues) ──
const RARITY = {
  common:    { label: 'Common',    color: '#8a8a8a', glow: 'rgba(138,138,138,.3)' },
  uncommon:  { label: 'Uncommon',  color: '#5aaa5e', glow: 'rgba(90,170,94,.35)' },
  rare:      { label: 'Rare',      color: '#4488cc', glow: 'rgba(68,136,204,.4)' },
  epic:      { label: 'Epic',      color: '#9b59b6', glow: 'rgba(155,89,182,.45)' },
  legendary: { label: 'Legendary', color: '#f0c870', glow: 'rgba(240,200,112,.5)' },
};

// ── Hand-crafted rewards for levels 1-25 ──
const BASE_REWARDS = [
  { level:1,  type:'chips',   name:'Starter Chips',       emoji:'🪙', rarity:'common',    chips:200,  desc:'A little bankroll to get you started' },
  { level:2,  type:'apparel', name:'Lucky Scarf',          emoji:'🧣', rarity:'common',    chips:0 },
  { level:3,  type:'chips',   name:'Match Day Fund',       emoji:'💰', rarity:'common',    chips:500 },
  { level:4,  type:'prop',    name:'Bronze Whistle',        emoji:'📯', rarity:'common',    chips:0 },
  { level:5,  type:'apparel', name:'Golden Jersey #10',     emoji:'👕', rarity:'rare',      chips:300,  milestone:true },
  { level:6,  type:'chips',   name:'High Roller Purse',    emoji:'💎', rarity:'uncommon',  chips:750 },
  { level:7,  type:'prop',    name:'Stadium Horn',          emoji:'📣', rarity:'uncommon',  chips:0 },
  { level:8,  type:'apparel', name:'Captain Armband',       emoji:'💪', rarity:'uncommon',  chips:0 },
  { level:9,  type:'chips',   name:'VIP Stake Pack',        emoji:'🎰', rarity:'uncommon',  chips:1000 },
  { level:10, type:'prop',    name:'Diamond Football',      emoji:'⚽', rarity:'epic',      chips:500,  milestone:true },
  { level:11, type:'chips',   name:'Betting Bankroll',      emoji:'🏦', rarity:'uncommon',  chips:1200 },
  { level:12, type:'apparel', name:'Neon Boots',             emoji:'👟', rarity:'rare',      chips:0 },
  { level:13, type:'prop',    name:'Red Card',               emoji:'🟥', rarity:'uncommon',  chips:0 },
  { level:14, type:'apparel', name:'VIP Lanyard',            emoji:'🎫', rarity:'rare',      chips:0 },
  { level:15, type:'prop',    name:'Crystal Trophy',         emoji:'🏆', rarity:'epic',      chips:800,  milestone:true },
  { level:16, type:'chips',   name:'Semi-Final Stash',      emoji:'💵', rarity:'rare',      chips:1500 },
  { level:17, type:'prop',    name:'Tactical Clipboard',     emoji:'📋', rarity:'rare',      chips:0 },
  { level:18, type:'apparel', name:'Champion Jacket',        emoji:'🧥', rarity:'rare',      chips:0 },
  { level:19, type:'special', name:'2x XP Boost',            emoji:'⚡', rarity:'rare',      chips:0 },
  { level:20, type:'apparel', name:'Platinum Gloves',        emoji:'🧤', rarity:'legendary', chips:1000, milestone:true },
  { level:21, type:'chips',   name:'Final Jackpot',          emoji:'🎲', rarity:'rare',      chips:2000 },
  { level:22, type:'prop',    name:'Golden Vuvuzela',        emoji:'🎺', rarity:'epic',      chips:0 },
  { level:23, type:'apparel', name:'World Cup Scarf',        emoji:'🏅', rarity:'epic',      chips:0 },
  { level:24, type:'special', name:'Prophet Title',           emoji:'🔮', rarity:'epic',      chips:0 },
  { level:25, type:'prop',    name:'Champion Crown',          emoji:'👑', rarity:'legendary', chips:2500, milestone:true },
];

// ── Procedural generation for levels 26+ ──
const PROC = [
  { type:'chips', names:['Coin Cache','Gold Reserve','Mega Stash','Fortune Pile','Diamond Vault'], emoji:['🪙','💰','💎','🏦','💵'] },
  { type:'prop',  names:['Platinum Ball','Elite Badge','Legend Crest','Star Medal','Infinity Orb'], emoji:['⚽','🏅','🛡️','⭐','🔮'] },
  { type:'apparel', names:['Cosmic Kit','Astral Boots','Nebula Gloves','Void Cape','Starlight Crown'], emoji:['👕','👟','🧤','🧥','👑'] },
  { type:'special', names:['XP Surge','Lucky Streak','Power Hour','Golden Touch','Midas Effect'], emoji:['⚡','🍀','🔥','✨','💫'] },
];

function getReward(lvl) {
  if (lvl <= 25) return BASE_REWARDS[lvl - 1];
  const isMilestone = lvl % 5 === 0;
  const ci = (lvl - 26) % 4, ni = Math.floor((lvl - 26) / 4) % 5;
  const t = PROC[ci];
  let rarity = lvl >= 100 ? 'legendary' : lvl >= 60 ? 'epic' : lvl >= 40 ? 'rare' : lvl >= 30 ? 'uncommon' : 'common';
  if (isMilestone && rarity !== 'legendary') rarity = {common:'uncommon',uncommon:'rare',rare:'epic',epic:'legendary'}[rarity];
  return { level:lvl, type:t.type, name:`${t.names[ni]} Lv.${lvl}`, emoji:t.emoji[ni], rarity, chips: t.type==='chips'?500+lvl*100:(isMilestone?lvl*50:0), desc:`Level ${lvl} reward`, milestone:isMilestone };
}

// ── Render the horizontal level strip ──
export function renderLevelStrip() {
  const strip = document.getElementById('level-strip');
  if (!strip) return;

  const maxShow = Math.max(state.ST.tier + 5, 10);
  let html = '';

  for (let lvl = 1; lvl <= maxShow; lvl++) {
    const r = getReward(lvl);
    if (!r) continue;
    const rar = RARITY[r.rarity];
    const unlocked = lvl <= state.ST.tier;
    const claimed = state.ST.claimed.includes(lvl);
    const isCurrent = lvl === state.ST.tier;

    let cls = 'level-card';
    if (!unlocked) cls += ' level-card-locked';
    else if (claimed) cls += ' level-card-claimed';
    else cls += ' level-card-unlocked';
    if (isCurrent) cls += ' level-card-current';
    if (r.milestone) cls += ' level-card-milestone';

    html += `<div class="${cls}" style="--card-color:${rar.color};--card-glow:${rar.glow}" onclick="openRewardPopup(${lvl})">
      <div class="lc-top">
        <span class="lc-level">LV.${lvl}</span>
        ${r.milestone ? '<span class="lc-star">★</span>' : ''}
      </div>
      <div class="lc-icon">${unlocked ? r.emoji : '🔒'}</div>
      <div class="lc-name">${r.name}</div>
      <div class="lc-rarity" style="color:${rar.color}">${rar.label}</div>
      ${r.chips ? `<div class="lc-chips">+${r.chips.toLocaleString()} 🪙</div>` : ''}
      <div class="lc-rarity-bar" style="background:${rar.color}"></div>
      ${claimed ? '<div class="lc-check">✓</div>' : ''}
      ${unlocked && !claimed ? '<div class="lc-claim-badge">CLAIM</div>' : ''}
    </div>`;
  }

  strip.innerHTML = html;

  // Auto-scroll to current level
  const currentCard = strip.querySelector('.level-card-current');
  if (currentCard) {
    currentCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

// ── XP Bar VFX ──
export function triggerXpBarVFX(amount) {
  const xpBar = document.getElementById('level-xp-bar');
  const xpFill = document.getElementById('level-xp-fill');
  const xpGlow = document.getElementById('level-xp-glow');

  if (xpFill) {
    xpFill.classList.add('xp-fill-flash');
    setTimeout(() => xpFill.classList.remove('xp-fill-flash'), 800);
  }
  if (xpBar) {
    xpBar.classList.add('xp-bar-pulse');
    setTimeout(() => xpBar.classList.remove('xp-bar-pulse'), 1000);
  }
  if (xpGlow) {
    xpGlow.classList.add('xp-glow-active');
    setTimeout(() => xpGlow.classList.remove('xp-glow-active'), 1200);
  }

  // Spawn floating +XP text
  const barEl = xpBar || document.querySelector('.level-xp-wrap');
  if (barEl) {
    const rect = barEl.getBoundingClientRect();
    const floater = document.createElement('div');
    floater.className = 'xp-float-text';
    floater.textContent = `+${amount} XP`;
    floater.style.left = (rect.left + rect.width / 2) + 'px';
    floater.style.top = (rect.top - 5) + 'px';
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 1500);
  }
}

// ── Update the XP bar display ──
export function updateLevelXpBar() {
  const XP_PER_LVL = 500;
  const c = state.ST.xp % XP_PER_LVL;
  const pct = c / XP_PER_LVL * 100;

  const tierEl = document.getElementById('hud-tier');
  if (tierEl) tierEl.textContent = state.ST.tier;

  const xpEl = document.getElementById('hud-xp');
  if (xpEl) xpEl.textContent = c;

  const xpMaxEl = document.getElementById('hud-xp-max');
  if (xpMaxEl) xpMaxEl.textContent = XP_PER_LVL;

  const xpFill = document.getElementById('level-xp-fill');
  if (xpFill) xpFill.style.width = pct + '%';

  const real = state.MS ? state.MS.filter(m => m.home !== 'TBD') : [];
  const done = real.filter(m => m.status === 'settled').length;
  const settledEl = document.getElementById('hud-settled');
  if (settledEl) settledEl.textContent = done;
  const totalEl = document.getElementById('hud-total');
  if (totalEl) totalEl.textContent = real.length;
}
