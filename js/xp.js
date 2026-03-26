// ═══════════════════════════════════════════════════════════
// XP — Battle Pass progression & Reward claiming
// ═══════════════════════════════════════════════════════════
import { state, saveState } from './state.js';
import * as TierMod from './data/tiers.js';
const XP_PER_LEVEL = TierMod.XP_PER_LEVEL || TierMod.XP_PER_TIER || 500;
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
import { SFX } from './audio-fx.js';
import { animateElement, spawnConfetti, coinPopAnimation } from './visual-fx.js';

let _deps = {};
export function setXpDeps({ updateAll, toast, onXpGain }) {
  _deps = { updateAll, toast, onXpGain };
}

export function levelProg() {
  const c = state.ST.xp % XP_PER_LEVEL;
  return { c, max: XP_PER_LEVEL, pct: c / XP_PER_LEVEL * 100 };
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
  // No level cap — unlimited levels
  const nt = Math.floor(state.ST.xp / XP_PER_LEVEL) + 1;
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

// ── Reward claim overlay ──────────────────────────────────
export function openRewardPopup(levelNum) {
  const r = getRewardForLevel(levelNum);
  if (!r) return;

  const isUnlocked = levelNum <= state.ST.tier;
  const isClaimed = state.ST.claimed.includes(levelNum);
  if (!isUnlocked) { SFX.error(); return; }

  SFX.rewardReveal();

  const rar = RARITY[r.rarity];
  const overlay = document.getElementById('reward-overlay');
  const isEpicPlus = r.rarity === 'epic' || r.rarity === 'legendary';

  overlay.innerHTML = `
    <div class="reward-card" onclick="event.stopPropagation()">
      <div class="reward-card-inner" id="rw-card-inner">
        <div class="reward-front" style="border-color:${rar.color}">
          <div class="reward-shine-bar"></div>
          <div class="rf-tier">LEVEL ${r.level}${r.milestone ? ' ★' : ''}</div>
          <div class="rf-q">❓</div>
          <div class="rf-hint">TAP TO REVEAL</div>
        </div>
        <div class="reward-back" style="border-color:${rar.color};--rw-glow:${rar.glow};background:linear-gradient(145deg,#12182a,#0a0e18)">
          <div class="rb-rarity" style="color:${rar.color}">${rar.label}</div>
          <div class="rb-icon" style="animation:reward-glow-ring 2s ease infinite">${r.emoji}</div>
          <div class="rb-name">${r.name}</div>
          <div class="rb-type" style="color:${rar.color}">${getTypeLabel(r.type)}</div>
          <div class="rb-desc">${r.desc}</div>
          ${r.chips ? `<div class="rb-chips">+${r.chips.toLocaleString()} 🪙</div>` : ''}
          ${!isClaimed
            ? `<div class="rb-collect" onclick="collectReward(${levelNum})">COLLECT</div>`
            : `<div class="rb-already">✓ COLLECTED</div>`
          }
        </div>
      </div>
    </div>`;

  overlay.classList.add('open');
  overlay.onclick = () => closeRewardPopup();

  const front = overlay.querySelector('.reward-front');
  const cardInner = document.getElementById('rw-card-inner');
  front.onclick = (e) => {
    e.stopPropagation();
    if (cardInner.classList.contains('flipped')) return;
    cardInner.classList.add('flipped');
    if (isEpicPlus) {
      SFX.rewardJackpot();
      setTimeout(() => {
        const icon = overlay.querySelector('.rb-icon');
        if (icon) {
          const rect = icon.getBoundingClientRect();
          spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
        }
      }, 700);
    } else {
      SFX.rewardClaim();
    }
  };
}

export function closeRewardPopup() {
  const overlay = document.getElementById('reward-overlay');
  overlay.classList.remove('open');
  overlay.innerHTML = '';
}

export function collectReward(levelNum) {
  const r = getRewardForLevel(levelNum);
  if (!r || state.ST.claimed.includes(levelNum)) return;

  claimLevel(levelNum);
  saveState();

  SFX.chipRain();
  if (r.chips) {
    SFX.coins();
    coinPopAnimation();
    _deps.toast(`🪙 +${r.chips.toLocaleString()} chips collected!`);
  }
  if (r.type !== 'chips') {
    _deps.toast(`🎁 ${r.name} added to inventory!`);
  }

  const btn = document.querySelector('.rb-collect');
  if (btn) {
    btn.outerHTML = '<div class="rb-already">✓ COLLECTED</div>';
    const icon = document.querySelector('.rb-icon');
    if (icon) {
      const rect = icon.getBoundingClientRect();
      spawnConfetti(rect.left + rect.width / 2, rect.top, 25);
    }
  }

  _deps.updateAll();
}
