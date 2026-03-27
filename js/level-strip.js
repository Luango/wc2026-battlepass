// ═══════════════════════════════════════════════════════════
// LEVEL STRIP — Horizontal scrollable reward cards + XP bar VFX
// ═══════════════════════════════════════════════════════════
import { state } from './state.js?v=9';
import { getLevelProgress, xpForLevel } from './data/tiers.js?v=9';

// ── Rarity definitions (inline to avoid cache issues) ──
const RARITY = {
  common:    { label: 'Common',    color: '#8a8a8a', glow: 'rgba(138,138,138,.3)' },
  uncommon:  { label: 'Uncommon',  color: '#5aaa5e', glow: 'rgba(90,170,94,.35)' },
  rare:      { label: 'Rare',      color: '#4488cc', glow: 'rgba(68,136,204,.4)' },
  epic:      { label: 'Epic',      color: '#9b59b6', glow: 'rgba(155,89,182,.45)' },
  legendary: { label: 'Legendary', color: '#f0c870', glow: 'rgba(240,200,112,.5)' },
};

// ── Hand-crafted rewards for levels 1-50 ──
const BASE_REWARDS = [
  { level:1,  type:'chips',   name:'Starter Chips',       emoji:'🪙', rarity:'common',    chips:200,  desc:'A little bankroll to get you started' },
  { level:2,  type:'apparel', name:'Lucky Scarf',          emoji:'🧣', rarity:'common',    chips:0,    desc:'A supporter scarf for good luck' },
  { level:3,  type:'chips',   name:'Match Day Fund',       emoji:'💰', rarity:'common',    chips:500,  desc:'Extra coins for the group stage' },
  { level:4,  type:'prop',    name:'Bronze Whistle',        emoji:'📯', rarity:'common',    chips:0,    desc:'A referees bronze whistle — blow for VAR!' },
  { level:5,  type:'apparel', name:'Golden Jersey #10',     emoji:'👕', rarity:'rare',      chips:300,  desc:'The legendary number 10 jersey in gold trim', milestone:true },
  { level:6,  type:'chips',   name:'High Roller Purse',    emoji:'💎', rarity:'uncommon',  chips:750,  desc:'Serious betting money' },
  { level:7,  type:'prop',    name:'Stadium Horn',          emoji:'📣', rarity:'uncommon',  chips:0,    desc:'Blast it when your team scores!' },
  { level:8,  type:'apparel', name:'Captain Armband',       emoji:'💪', rarity:'uncommon',  chips:0,    desc:'Wear it. Lead your predictions.' },
  { level:9,  type:'chips',   name:'VIP Stake Pack',        emoji:'🎰', rarity:'uncommon',  chips:1000, desc:'A thousand coins for the knockout rounds' },
  { level:10, type:'prop',    name:'Diamond Football',      emoji:'⚽', rarity:'epic',      chips:500,  desc:'A football encrusted with diamonds. Flex.', milestone:true },
  { level:11, type:'chips',   name:'Betting Bankroll',      emoji:'🏦', rarity:'uncommon',  chips:1200, desc:'Stacking coins for the big matches' },
  { level:12, type:'apparel', name:'Neon Boots',             emoji:'👟', rarity:'rare',      chips:0,    desc:'Custom neon cleats — style on the pitch' },
  { level:13, type:'prop',    name:'Red Card',               emoji:'🟥', rarity:'uncommon',  chips:0,    desc:'Slap it on the table for drama' },
  { level:14, type:'apparel', name:'VIP Lanyard',            emoji:'🎫', rarity:'rare',      chips:0,    desc:'All-access pass to the best seats' },
  { level:15, type:'prop',    name:'Crystal Trophy',         emoji:'🏆', rarity:'epic',      chips:800,  desc:'A crystal replica of the World Cup trophy', milestone:true },
  { level:16, type:'chips',   name:'Semi-Final Stash',      emoji:'💵', rarity:'rare',      chips:1500, desc:'Big game, big stakes' },
  { level:17, type:'prop',    name:'Tactical Clipboard',     emoji:'📋', rarity:'rare',      chips:0,    desc:'Draw formations like a real manager' },
  { level:18, type:'apparel', name:'Champion Jacket',        emoji:'🧥', rarity:'rare',      chips:0,    desc:'The winners jacket — premium leather' },
  { level:19, type:'special', name:'2x XP Boost',            emoji:'⚡', rarity:'rare',      chips:0,    desc:'Double XP on every action' },
  { level:20, type:'apparel', name:'Platinum Gloves',        emoji:'🧤', rarity:'legendary', chips:1000, desc:'Goalkeeper gloves forged in platinum', milestone:true },
  { level:21, type:'chips',   name:'Final Jackpot',          emoji:'🎲', rarity:'rare',      chips:2000, desc:'Two grand for the final showdown' },
  { level:22, type:'prop',    name:'Golden Vuvuzela',        emoji:'🎺', rarity:'epic',      chips:0,    desc:'The most iconic (and annoying) instrument' },
  { level:23, type:'apparel', name:'World Cup Scarf',        emoji:'🏅', rarity:'epic',      chips:0,    desc:'Limited edition tournament scarf' },
  { level:24, type:'special', name:'Prophet Title',           emoji:'🔮', rarity:'epic',      chips:0,    desc:'A legendary title for prediction masters' },
  { level:25, type:'prop',    name:'Champion Crown',          emoji:'👑', rarity:'legendary', chips:2500, desc:'The ultimate Battle Pass reward. Bow down.', milestone:true },
  { level:26, type:'chips',   name:'Knockout Kitty',         emoji:'💰', rarity:'rare',      chips:2200, desc:'War chest for the knockout rounds' },
  { level:27, type:'apparel', name:'Holographic Shin Guards', emoji:'🦿', rarity:'rare',      chips:0,    desc:'Shin guards that shimmer with every angle' },
  { level:28, type:'prop',    name:'VAR Monitor',             emoji:'🖥️', rarity:'rare',      chips:0,    desc:'Your personal VAR replay screen' },
  { level:29, type:'chips',   name:'Golden Boot Fund',        emoji:'🥇', rarity:'rare',      chips:2500, desc:'Coins worthy of the Golden Boot winner' },
  { level:30, type:'apparel', name:'Emerald Cleats',          emoji:'👟', rarity:'epic',      chips:1200, desc:'Cleats carved from pure emerald crystal', milestone:true },
  { level:31, type:'prop',    name:'Flame Pyro Kit',          emoji:'🔥', rarity:'rare',      chips:0,    desc:'Stadium pyrotechnics — celebrate in style' },
  { level:32, type:'chips',   name:'Quarter-Final Vault',     emoji:'🏦', rarity:'rare',      chips:2800, desc:'Serious money for serious matches' },
  { level:33, type:'apparel', name:'Thunder Cape',            emoji:'🦸', rarity:'epic',      chips:0,    desc:'A cape that crackles with electric energy' },
  { level:34, type:'prop',    name:'Laser Pointer',           emoji:'🔦', rarity:'rare',      chips:0,    desc:'Point out tactical weaknesses in real time' },
  { level:35, type:'special', name:'3x XP Surge',             emoji:'⚡', rarity:'epic',      chips:1500, desc:'Triple XP — accelerate your progress', milestone:true },
  { level:36, type:'chips',   name:'Dragon Hoard',            emoji:'🐉', rarity:'epic',      chips:3000, desc:'A dragons treasure trove of coins' },
  { level:37, type:'apparel', name:'Shadow Jersey',            emoji:'👕', rarity:'epic',      chips:0,    desc:'A jersey woven from midnight shadows' },
  { level:38, type:'prop',    name:'Phoenix Flare',            emoji:'🌟', rarity:'epic',      chips:0,    desc:'A flare that burns with undying flame' },
  { level:39, type:'chips',   name:'Semi-Final Fortune',       emoji:'💎', rarity:'epic',      chips:3500, desc:'Fortune favors the bold bettor' },
  { level:40, type:'prop',    name:'Obsidian Shield',          emoji:'🛡️', rarity:'legendary', chips:2000, desc:'An indestructible shield of volcanic glass', milestone:true },
  { level:41, type:'apparel', name:'Aurora Headband',          emoji:'🌈', rarity:'epic',      chips:0,    desc:'A headband that glows with northern lights' },
  { level:42, type:'chips',   name:'Titan Purse',              emoji:'💵', rarity:'epic',      chips:4000, desc:'Coins fit for a titan of predictions' },
  { level:43, type:'prop',    name:'Crystal Ball',              emoji:'🔮', rarity:'epic',      chips:0,    desc:'See the future of every match' },
  { level:44, type:'apparel', name:'Phantom Mask',             emoji:'🎭', rarity:'epic',      chips:0,    desc:'The mask of a mysterious high-roller' },
  { level:45, type:'special', name:'Lucky Charm',              emoji:'🍀', rarity:'legendary', chips:3000, desc:'Fortune smiles on everything you touch', milestone:true },
  { level:46, type:'chips',   name:'Final Countdown',          emoji:'🎆', rarity:'epic',      chips:4500, desc:'The big money for the grand finale' },
  { level:47, type:'prop',    name:'Celestial Whistle',         emoji:'✨', rarity:'legendary', chips:0,    desc:'A whistle forged in the stars themselves' },
  { level:48, type:'apparel', name:'Infinity Scarf',            emoji:'♾️', rarity:'legendary', chips:0,    desc:'A scarf that never ends — infinite style' },
  { level:49, type:'chips',   name:'Emperor Vault',             emoji:'👸', rarity:'legendary', chips:5000, desc:'Five thousand coins — the emperors ransom' },
  { level:50, type:'prop',    name:'World Cup Replica',         emoji:'🏆', rarity:'legendary', chips:5000, desc:'A 1:1 golden replica of the FIFA World Cup', milestone:true },
];

// ── Procedural generation for levels 51-100 ──
const PROC = [
  { type:'chips', names:['Coin Cache','Gold Reserve','Mega Stash','Fortune Pile','Diamond Vault'], emoji:['🪙','💰','💎','🏦','💵'] },
  { type:'prop',  names:['Platinum Ball','Elite Badge','Legend Crest','Star Medal','Infinity Orb'], emoji:['⚽','🏅','🛡️','⭐','🔮'] },
  { type:'apparel', names:['Cosmic Kit','Astral Boots','Nebula Gloves','Void Cape','Starlight Crown'], emoji:['👕','👟','🧤','🧥','👑'] },
  { type:'special', names:['XP Surge','Lucky Streak','Power Hour','Golden Touch','Midas Effect'], emoji:['⚡','🍀','🔥','✨','💫'] },
];

function getReward(lvl) {
  if (lvl <= 50) return BASE_REWARDS[lvl - 1];
  const isMilestone = lvl % 5 === 0;
  const ci = Math.abs((lvl - 51) % 4), ni = Math.floor((lvl - 51) / 4) % 5;
  const t = PROC[ci];
  let rarity = lvl >= 95 ? 'legendary' : lvl >= 80 ? 'epic' : lvl >= 65 ? 'rare' : 'uncommon';
  if (isMilestone && rarity !== 'legendary') rarity = {common:'uncommon',uncommon:'rare',rare:'epic',epic:'legendary'}[rarity];
  return { level:lvl, type:t.type, name:`${t.names[ni]} Lv.${lvl}`, emoji:t.emoji[ni], rarity, chips: t.type==='chips'?500+lvl*100:(isMilestone?lvl*50:0), desc:`Level ${lvl} reward`, milestone:isMilestone };
}

// ── Render the horizontal level strip ──
export function renderLevelStrip() {
  const strip = document.getElementById('level-strip');
  if (!strip) return;

  const maxShow = 100;
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

    const xpNeeded = xpForLevel(lvl);
    const typeLabel = {chips:'Chips',prop:'Collectible',apparel:'Apparel',special:'Special'}[r.type]||'Reward';

    html += `<div class="${cls}" style="--card-color:${rar.color};--card-glow:${rar.glow}"
      onclick="openRewardPopup(${lvl})"
      data-lvl="${lvl}" data-rname="${r.name}" data-emoji="${r.emoji}" data-rarity="${r.rarity}"
      data-rcolor="${rar.color}" data-rglow="${rar.glow}" data-chips="${r.chips||0}"
      data-desc="${r.desc||''}" data-type="${typeLabel}" data-milestone="${!!r.milestone}"
      data-xp="${xpNeeded}" data-unlocked="${unlocked}" data-claimed="${claimed}">
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

  // ── Hover preview panel ──
  initHoverPreview(strip);
}

let _hoverPanel = null;
let _hoverTimeout = null;

function initHoverPreview(strip) {
  // Remove old listeners by cloning (simple approach)
  strip.addEventListener('mouseover', onCardHover);
  strip.addEventListener('mouseout', onCardLeave);
}

function onCardHover(e) {
  const card = e.target.closest('.level-card');
  if (!card) return;
  clearTimeout(_hoverTimeout);
  _hoverTimeout = setTimeout(() => showHoverPanel(card), 120);
}

function onCardLeave(e) {
  const card = e.target.closest('.level-card');
  const related = e.relatedTarget;
  // Don't hide if moving within the card or to the panel
  if (related && (related.closest('.level-card') === card || related.closest('.lc-hover-panel'))) return;
  clearTimeout(_hoverTimeout);
  hideHoverPanel();
}

function showHoverPanel(card) {
  hideHoverPanel();

  const d = card.dataset;
  const unlocked = d.unlocked === 'true';
  const claimed = d.claimed === 'true';
  const chips = parseInt(d.chips) || 0;
  const milestone = d.milestone === 'true';
  const rarLabel = RARITY[d.rarity]?.label || d.rarity;

  // Build chip pile visual
  let chipPile = '';
  if (chips > 0) {
    const pileSize = chips >= 2000 ? 5 : chips >= 1000 ? 4 : chips >= 500 ? 3 : chips >= 200 ? 2 : 1;
    const coinEmojis = ['🪙','💰','💎','🏦','💵'];
    chipPile = `<div class="hp-chip-pile">
      ${Array.from({length: pileSize}, (_, i) =>
        `<span class="hp-coin" style="--ci:${i}">${coinEmojis[i % coinEmojis.length]}</span>`
      ).join('')}
      <div class="hp-chip-amount">+${chips.toLocaleString()} CHIPS</div>
    </div>`;
  }

  // Status badge
  let statusBadge = '';
  if (claimed) statusBadge = '<div class="hp-status hp-status-claimed">COLLECTED</div>';
  else if (unlocked) statusBadge = '<div class="hp-status hp-status-ready">READY TO CLAIM</div>';
  else statusBadge = `<div class="hp-status hp-status-locked">REQUIRES ${d.xp} XP TO NEXT LEVEL</div>`;

  const panel = document.createElement('div');
  panel.className = 'lc-hover-panel';
  panel.innerHTML = `
    <div class="hp-inner" style="--hp-color:${d.rcolor};--hp-glow:${d.rglow}">
      <div class="hp-header">
        <span class="hp-level">LEVEL ${d.lvl}</span>
        ${milestone ? '<span class="hp-milestone">★ MILESTONE</span>' : ''}
      </div>
      <div class="hp-icon-wrap">
        <div class="hp-icon-bg" style="background:radial-gradient(circle, ${d.rglow}, transparent 70%)"></div>
        <div class="hp-icon">${unlocked ? d.emoji : '🔒'}</div>
      </div>
      <div class="hp-name">${d.rname}</div>
      <div class="hp-type" style="color:${d.rcolor}">${d.type} · ${rarLabel}</div>
      ${d.desc ? `<div class="hp-desc">${d.desc}</div>` : ''}
      ${chipPile}
      ${statusBadge}
    </div>
  `;

  // Position above the card
  const rect = card.getBoundingClientRect();
  const stripRect = card.closest('.level-strip-wrap').getBoundingClientRect();
  panel.style.position = 'fixed';
  panel.style.zIndex = '9999';

  document.body.appendChild(panel);

  // Measure panel, then position
  const pRect = panel.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - pRect.width / 2;
  let top = rect.top - pRect.height - 12;

  // Clamp to viewport
  if (left < 8) left = 8;
  if (left + pRect.width > window.innerWidth - 8) left = window.innerWidth - 8 - pRect.width;
  if (top < 8) top = rect.bottom + 12; // flip below if no room above

  panel.style.left = left + 'px';
  panel.style.top = top + 'px';

  // Animate in
  requestAnimationFrame(() => panel.classList.add('hp-visible'));

  _hoverPanel = panel;

  // Hide when leaving panel itself
  panel.addEventListener('mouseleave', (e) => {
    const related = e.relatedTarget;
    if (related && related.closest('.level-card')) return;
    hideHoverPanel();
  });
}

function hideHoverPanel() {
  if (_hoverPanel) {
    _hoverPanel.remove();
    _hoverPanel = null;
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

// ── Update the XP bar display (progressive XP curve) ──
export function updateLevelXpBar() {
  const prog = getLevelProgress(state.ST.xp);

  const tierEl = document.getElementById('hud-tier');
  if (tierEl) tierEl.textContent = state.ST.tier;

  const xpEl = document.getElementById('hud-xp');
  if (xpEl) xpEl.textContent = prog.current;

  const xpMaxEl = document.getElementById('hud-xp-max');
  if (xpMaxEl) xpMaxEl.textContent = prog.max;

  const xpFill = document.getElementById('level-xp-fill');
  if (xpFill) xpFill.style.width = prog.pct + '%';

  const real = state.MS ? state.MS.filter(m => m.home !== 'TBD') : [];
  const done = real.filter(m => m.status === 'settled').length;
  const settledEl = document.getElementById('hud-settled');
  if (settledEl) settledEl.textContent = done;
  const totalEl = document.getElementById('hud-total');
  if (totalEl) totalEl.textContent = real.length;
}
