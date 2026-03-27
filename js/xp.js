// ═══════════════════════════════════════════════════════════
// XP — Battle Pass progression & Reward claiming
// ═══════════════════════════════════════════════════════════
import { state, saveState } from './state.js?v=9';
import * as TierMod from './data/tiers.js?v=9';
const { xpForLevel, getLevelFromXp, getLevelProgress, totalXpForLevel } = TierMod;
const { RARITY, TIER_REWARDS } = TierMod;
const getTypeLabel = TierMod.getTypeLabel;

// Resilient reward lookup (handles cached old module)
function getRewardForLevel(lvl) {
  if (TierMod.getRewardForLevel) return TierMod.getRewardForLevel(lvl);
  if (lvl <= TIER_REWARDS.length) {
    const r = TIER_REWARDS[lvl - 1];
    return { ...r, level: r.tier || lvl };
  }
  return { level: lvl, type:'chips', name:`Level ${lvl} Reward`, emoji:'🪙', rarity:'common', chips: 500 + lvl * 50, desc:`Level ${lvl} reward`, milestone: lvl % 5 === 0 };
}
import { SFX } from './audio-fx.js?v=9';
import { animateElement, spawnConfetti, coinPopAnimation, spawnSparkles, screenShake, screenFlash, spawnCoinShower, emojiExplosion, spawnRarityRings } from './visual-fx.js?v=9';
import { RewardFX } from './reward-fx.js?v=9';

let _deps = {};
export function setXpDeps({ updateAll, toast, onXpGain }) {
  _deps = { updateAll, toast, onXpGain };
}

export function levelProg() {
  const prog = getLevelProgress(state.ST.xp);
  return { c: prog.current, max: prog.max, pct: prog.pct };
}

// Keep old name as alias
export const tierProg = levelProg;

export function claimLevel(lvl) {
  if (state.ST.claimed.includes(lvl)) return;
  state.ST.claimed.push(lvl);
  const r = getRewardForLevel(lvl);
  if (r && r.chips) {
    state.ST.coins += r.chips;
    coinPopAnimation();
  }
  if (r && r.type !== 'chips') {
    state.ST.inventory.push({ tier: lvl, name: r.name, emoji: r.emoji, type: r.type, rarity: r.rarity });
  }
}

// Keep old name
export const claimTier = claimLevel;

export function addXP(n) {
  const oldXp = state.ST.xp;
  state.ST.xp += n;
  // No level cap — unlimited levels (progressive XP curve)
  const nt = getLevelFromXp(state.ST.xp);
  if (nt > state.ST.tier) {
    for (let t = state.ST.tier + 1; t <= nt; t++) claimLevel(t);
    state.ST.tier = nt;
    SFX.tierUp();
    _deps.toast(`🏆 LEVEL UP → LEVEL ${state.ST.tier}`);
    const tierEl = document.getElementById('h-tier');
    if (tierEl) {
      animateElement(tierEl, 'anim-tier-burst', 600);
      const r = tierEl.getBoundingClientRect();
      spawnConfetti(r.left + r.width / 2, r.top, 30);
    }
  }
  // XP bar VFX
  if (_deps.onXpGain) _deps.onXpGain(n);
  saveState();
  _deps.updateAll();
}

// ── Gift Box Reward Reveal — Vampire Survivors style ──────
let _giftOverlay = null;
let _giftRevealed = false;
let _rewardFX = null;

// Rarity → hue mapping for god rays
const RARITY_HUE = { common: 0, uncommon: 130, rare: 210, epic: 280, legendary: 45 };
// Loot emojis for the fountain based on rarity
const LOOT_EMOJIS = {
  common:    ['🪙','⭐','✨'],
  uncommon:  ['🪙','💚','✨','⭐'],
  rare:      ['🪙','💎','💙','⭐','✨'],
  epic:      ['💎','💜','⭐','✨','🔮','🪙'],
  legendary: ['💎','👑','⭐','✨','🔮','💰','🏆']
};
// Richer display emojis for chip-type rewards (stacked coins / treasure)
const CHIP_DISPLAY_EMOJI = {
  common:    '🪙',
  uncommon:  '💰',
  rare:      '💰',
  epic:      '💎',
  legendary: '👑'
};
// Build the reveal icon HTML — richer visuals for chips
function _buildRevealIcon(r) {
  if (r.type === 'chips') {
    // Treasure pile: main emoji + decorative sub-emojis
    const main = CHIP_DISPLAY_EMOJI[r.rarity] || '🪙';
    return `<span class="rw-icon-stack"><span class="rw-icon-sub">🪙</span><span class="rw-icon-main">${main}</span><span class="rw-icon-sub">🪙</span></span>`;
  }
  return r.emoji;
}

export function openRewardPopup(levelNum) {
  const r = getRewardForLevel(levelNum);
  if (!r) return;

  const isUnlocked = levelNum <= state.ST.tier;
  const isClaimed = state.ST.claimed.includes(levelNum);
  if (!isUnlocked) { SFX.error(); return; }

  _giftRevealed = false;
  const rar = RARITY[r.rarity];
  const isEpic = r.rarity === 'epic';
  const isLegendary = r.rarity === 'legendary';
  const isEpicPlus = isEpic || isLegendary;
  const rarClass = `gift-${r.rarity}`;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = `rw-gift-overlay ${rarClass}`;
  overlay.id = 'rw-gift-overlay';
  _giftOverlay = overlay;

  overlay.innerHTML = `
    <div class="rw-level-label">LEVEL ${r.level}${r.milestone ? ' ★' : ''}</div>
    <div class="gift-box-scene" id="rw-gift-scene">
      <div class="gift-box" id="rw-gift-box" style="animation:gift-idle-wobble 2s ease-in-out infinite">
        <div class="gift-box-lid" id="rw-gift-lid"></div>
        <div class="gift-box-body" id="rw-gift-body"></div>
      </div>
      <div class="rw-tap-hint">TAP TO OPEN</div>
    </div>
    <div class="rw-reveal-icon" id="rw-reveal-icon" style="--reveal-color:${rar.glow};--reveal-glow:${rar.color}">${_buildRevealIcon(r)}</div>
    <div class="rw-reward-details" id="rw-details">
      <div class="rw-reveal-name" id="rw-name">${r.name}</div>
      <div class="rw-reveal-rarity" id="rw-rarity" style="color:${rar.color}">${rar.label}</div>
      <div class="rw-reveal-type" id="rw-type">${getTypeLabel(r.type)}</div>
      <div class="rw-reveal-desc" id="rw-desc">${r.desc}</div>
      ${r.chips ? `<div class="rw-reveal-chips" id="rw-chips">+${r.chips.toLocaleString()} 🪙</div>` : ''}
      ${!isClaimed
        ? `<button class="rw-collect-btn" id="rw-collect-btn" onclick="collectReward(${levelNum})">COLLECT</button>`
        : `<div class="rw-already-badge" id="rw-already">✓ COLLECTED</div>`
      }
    </div>`;

  document.body.appendChild(overlay);
  void overlay.offsetWidth;
  overlay.classList.add('rw-bg-in');

  // Init Canvas FX engine
  _rewardFX = new RewardFX();
  _rewardFX.start(overlay);

  // Click gift box to open
  const giftScene = overlay.querySelector('#rw-gift-scene');
  giftScene.onclick = (e) => {
    e.stopPropagation();
    if (_giftRevealed) return;
    _giftRevealed = true;
    _triggerGiftOpen(overlay, r, rar, isEpicPlus, isLegendary);
  };

  // Click outside to close (only after reveal)
  overlay.onclick = (e) => {
    if (e.target === overlay && _giftRevealed) closeRewardPopup();
  };

  SFX.sparkle();
}

function _triggerGiftOpen(overlay, r, rar, isEpicPlus, isLegendary) {
  const fx = _rewardFX;
  if (!fx) return;

  const giftBox = overlay.querySelector('#rw-gift-box');
  const giftLid = overlay.querySelector('#rw-gift-lid');
  const giftBody = overlay.querySelector('#rw-gift-body');
  const giftScene = overlay.querySelector('#rw-gift-scene');
  const revealIcon = overlay.querySelector('#rw-reveal-icon');
  const details = overlay.querySelector('#rw-details');
  const hint = overlay.querySelector('.rw-tap-hint');

  if (hint) hint.remove();

  // Get box center for effects
  const boxRect = giftBody.getBoundingClientRect();
  const overlayRect = overlay.getBoundingClientRect();
  const cx = boxRect.left - overlayRect.left + boxRect.width / 2;
  const cy = boxRect.top - overlayRect.top + boxRect.height / 2;
  fx.setCenter(cx, cy);

  // Anticipation duration: 2s for legendary, 1.5s for epic, 1s for others
  const anticipationMs = isLegendary ? 2000 : isEpicPlus ? 1500 : 1000;
  // Climax at the end of anticipation
  const climaxMs = anticipationMs;
  // Reveal starts after climax
  const revealMs = climaxMs + 400;
  // Details after reveal
  const detailsMs = revealMs + 800;

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: Anticipation — Violent vibration + God Rays appear
  // ═══════════════════════════════════════════════════════════
  SFX.giftShake();
  giftBox.style.animation = `gift-anticipation ${anticipationMs}ms ease-in-out forwards`;

  // Start god rays — gold, rotating
  const hue = RARITY_HUE[r.rarity] || 45;
  fx.startRays(hue);
  fx.setRayIntensity(0.3);

  // Progressive screen shake — starts gentle, ramps up
  fx.setProgressiveShake(2);
  // Spark stream from box during anticipation
  let sparkInterval = setInterval(() => {
    fx.sparkStream(cx, cy, 3, rar.color);
  }, 60);

  // Ramp up shake and rays over anticipation period
  const rampSteps = 5;
  for (let i = 1; i <= rampSteps; i++) {
    setTimeout(() => {
      const t = i / rampSteps;
      fx.setProgressiveShake(2 + t * (isLegendary ? 16 : isEpicPlus ? 12 : 8));
      fx.setRayIntensity(0.3 + t * 0.5);
      // At 60% through, start rainbow cycle for epic+
      if (t >= 0.6 && isEpicPlus) {
        fx.startRainbowCycle(isLegendary ? 8 : 5);
      }
      // Intensifying sparks
      fx.sparkStream(cx, cy, Math.floor(5 + t * 15), rar.color);
      // Extra shake SFX hits
      if (t >= 0.5) SFX.giftShake();
    }, (anticipationMs / rampSteps) * i);
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: The Climax — White flash + Massive shake + Pop
  // ═══════════════════════════════════════════════════════════
  setTimeout(() => {
    clearInterval(sparkInterval);

    // WHITE FLASH — pure white for ~50ms
    fx.triggerFlash();
    // Massive screen shake
    fx.triggerShake(isLegendary ? 25 : isEpicPlus ? 18 : 12);
    fx.setProgressiveShake(0); // stop progressive

    // CLIMAX SFX
    SFX.giftPop();

    // Lid explosion with squash & stretch
    giftLid.style.animation = 'gift-lid-explode 0.8s cubic-bezier(.2,.8,.3,1) forwards';
    giftBody.style.animation = 'gift-body-squash 0.4s ease-out';
    giftBox.style.animation = 'gift-glow-burst 0.8s ease-out forwards';

    // MASSIVE radial particle burst — hundreds of glowing squares
    fx.climaxBurst(cx, cy);

    // Extra burst for epic+
    if (isEpicPlus) {
      setTimeout(() => fx.burstParticles(cx, cy, 80, {
        speed: 10, colors: ['#ffffff', '#f0c870', '#ff6bff', '#33ffff'],
        glow: 15, life: 50
      }), 100);
    }
    if (isLegendary) {
      setTimeout(() => fx.climaxBurst(cx, cy), 150);
    }

    // Rays go full intensity then fade
    fx.setRayIntensity(1.0);
    if (isEpicPlus) fx.startRainbowCycle(12);
    setTimeout(() => fx.setRayIntensity(0.4), 300);
  }, climaxMs);

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: Loot Fountain + Reward Rise
  // ═══════════════════════════════════════════════════════════
  setTimeout(() => {
    SFX.revealWhoosh();
    if (isLegendary) SFX.legendaryReveal();
    else if (isEpicPlus) SFX.epicReveal();
    else SFX.rewardRise();

    // Loot fountain — items erupt from chest in parabolic arcs
    const lootEmojis = LOOT_EMOJIS[r.rarity] || LOOT_EMOJIS.common;
    const lootCount = isLegendary ? 5 : isEpicPlus ? 4 : 3;
    const landY = cy - 140;
    const startSpread = (lootCount - 1) * 35;
    for (let i = 0; i < lootCount; i++) {
      setTimeout(() => {
        const emoji = lootEmojis[Math.floor(Math.random() * lootEmojis.length)];
        const targetX = cx - startSpread / 2 + i * 35;
        fx.spawnLootItem(cx, cy, emoji, targetX, landY);
        // Small burst from each launch
        fx.burstParticles(cx, cy, 10, { speed: 4, life: 20, glow: 6, colors: [rar.color, '#ffffff'] });
      }, i * 80);
    }

    // Hide gift box scene
    giftScene.style.transition = 'opacity 0.4s, transform 0.4s';
    giftScene.style.opacity = '0';
    giftScene.style.transform = 'scale(0.3) translateY(40px)';

    // Show main reward icon rising
    revealIcon.classList.add('rw-icon-in');

    // Sparkle rain while revealing
    let rainInterval = setInterval(() => fx.sparkleRain(3), 100);
    setTimeout(() => clearInterval(rainInterval), 2000);

    // Fade rays down
    setTimeout(() => fx.setRayIntensity(0.15), 400);
    setTimeout(() => fx.stopRays(), 1200);
  }, revealMs);

  // ═══════════════════════════════════════════════════════════
  // PHASE 4: Details cascade in
  // ═══════════════════════════════════════════════════════════
  setTimeout(() => {
    revealIcon.classList.remove('rw-icon-in');
    revealIcon.classList.add('rw-icon-float');
    details.classList.add('rw-details-in');

    const name = overlay.querySelector('#rw-name');
    const rarity = overlay.querySelector('#rw-rarity');
    const type = overlay.querySelector('#rw-type');
    const desc = overlay.querySelector('#rw-desc');
    const chips = overlay.querySelector('#rw-chips');
    const collectBtn = overlay.querySelector('#rw-collect-btn');
    const already = overlay.querySelector('#rw-already');

    if (name) name.classList.add('rw-name-in');
    setTimeout(() => { if (rarity) rarity.classList.add('rw-info-in'); }, 100);
    setTimeout(() => { if (type) type.classList.add('rw-info-in'); }, 200);
    setTimeout(() => { if (desc) desc.classList.add('rw-info-in'); }, 300);
    setTimeout(() => { if (chips) chips.classList.add('rw-info-in'); }, 400);
    setTimeout(() => {
      if (collectBtn) collectBtn.classList.add('rw-btn-in');
      if (already) already.classList.add('rw-info-in');
    }, 500);

    SFX.sparkle();

    // Extra confetti for epic+
    if (isEpicPlus) {
      const oRect = overlay.getBoundingClientRect();
      spawnConfetti(oRect.width / 2, oRect.height / 2 - 40, isLegendary ? 60 : 35);
      if (isLegendary) {
        spawnCoinShower(20);
        emojiExplosion(oRect.width / 2, oRect.height / 2, '⭐', 12);
        setTimeout(() => spawnConfetti(oRect.width / 2, oRect.height / 2 - 40, 40), 400);
      }
    }
  }, detailsMs);
}

export function closeRewardPopup() {
  const oldOverlay = document.getElementById('reward-overlay');
  if (oldOverlay) { oldOverlay.classList.remove('open'); oldOverlay.innerHTML = ''; }

  if (_rewardFX) { _rewardFX.destroy(); _rewardFX = null; }

  const giftOverlay = document.getElementById('rw-gift-overlay');
  if (giftOverlay) {
    giftOverlay.style.transition = 'opacity 0.3s';
    giftOverlay.style.opacity = '0';
    setTimeout(() => giftOverlay.remove(), 350);
  }
  _giftOverlay = null;
}

export function collectReward(levelNum) {
  const r = getRewardForLevel(levelNum);
  if (!r || state.ST.claimed.includes(levelNum)) return;

  claimLevel(levelNum);
  saveState();

  const btn = document.querySelector('#rw-collect-btn');
  const icon = document.querySelector('#rw-reveal-icon');

  // Canvas burst on collect
  if (_rewardFX && icon) {
    const rect = icon.getBoundingClientRect();
    const overlay = document.getElementById('rw-gift-overlay');
    const oRect = overlay ? overlay.getBoundingClientRect() : { left: 0, top: 0 };
    const cx = rect.left - oRect.left + rect.width / 2;
    const cy = rect.top - oRect.top + rect.height / 2;
    _rewardFX.climaxBurst(cx, cy);
    _rewardFX.triggerShake(8);
  }

  if (icon) {
    const rect = icon.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    spawnConfetti(cx, cy, 40);
    emojiExplosion(cx, cy, '🪙', 10);
  }

  SFX.coinShower();
  SFX.chipRain();

  if (r.chips) {
    SFX.coins();
    coinPopAnimation();
    spawnCoinShower(15);
    _deps.toast(`🪙 +${r.chips.toLocaleString()} chips collected!`);
  }
  if (r.type !== 'chips') {
    _deps.toast(`🎁 ${r.name} added to inventory!`);
  }

  if (btn) {
    btn.outerHTML = '<div class="rw-already-badge rw-info-in">✓ COLLECTED</div>';
  }

  _deps.updateAll();
}
