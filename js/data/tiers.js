// ═══════════════════════════════════════════════════════════
// BATTLE PASS LEVELS — Rich reward system (unlimited)
// ═══════════════════════════════════════════════════════════

// Progressive XP curve — early levels are fast, ramps up to 500
export function xpForLevel(lvl) {
  const table = [0, 30, 50, 60, 80, 100, 130, 160, 200, 250, 300];
  if (lvl >= 1 && lvl <= 10) return table[lvl];
  return Math.min(300 + (lvl - 10) * 30, 500);
}

// Cumulative XP needed to reach a given level (level 1 = 0 XP)
export function totalXpForLevel(lvl) {
  let sum = 0;
  for (let i = 1; i < lvl; i++) sum += xpForLevel(i);
  return sum;
}

// Determine current level from total XP
export function getLevelFromXp(totalXp) {
  let lvl = 1;
  let cumulative = 0;
  while (true) {
    const needed = xpForLevel(lvl);
    if (cumulative + needed > totalXp) break;
    cumulative += needed;
    lvl++;
  }
  return lvl;
}

// Progress within current level: { current, max, pct }
export function getLevelProgress(totalXp) {
  const lvl = getLevelFromXp(totalXp);
  const base = totalXpForLevel(lvl);
  const needed = xpForLevel(lvl);
  const current = totalXp - base;
  return { current, max: needed, pct: (current / needed) * 100 };
}

// Legacy flat value (kept for backward compat, prefer xpForLevel())
export const XP_PER_LEVEL = 500;
export const XP_PER_TIER = XP_PER_LEVEL;

export const RARITY = {
  common:    { label: 'Common',    color: '#8a8a8a', bg: 'rgba(138,138,138,.12)', glow: 'rgba(138,138,138,.3)' },
  uncommon:  { label: 'Uncommon',  color: '#5aaa5e', bg: 'rgba(90,170,94,.12)',   glow: 'rgba(90,170,94,.35)' },
  rare:      { label: 'Rare',      color: '#4488cc', bg: 'rgba(68,136,204,.12)',   glow: 'rgba(68,136,204,.4)' },
  epic:      { label: 'Epic',      color: '#9b59b6', bg: 'rgba(155,89,182,.14)',   glow: 'rgba(155,89,182,.45)' },
  legendary: { label: 'Legendary', color: '#f0c870', bg: 'rgba(240,200,112,.14)',  glow: 'rgba(240,200,112,.5)' },
};

// Hand-crafted rewards for levels 1-50
const BASE_REWARDS = [
  // ── Level 1-5 ──
  { level:1,  type:'chips',   name:'Starter Chips',       emoji:'🪙', rarity:'common',    chips:200,  desc:'A little bankroll to get you started' },
  { level:2,  type:'apparel', name:'Lucky Scarf',          emoji:'🧣', rarity:'common',    chips:0,    desc:'A supporter scarf for good luck' },
  { level:3,  type:'chips',   name:'Match Day Fund',       emoji:'💰', rarity:'common',    chips:500,  desc:'Extra coins for the group stage' },
  { level:4,  type:'prop',    name:'Bronze Whistle',        emoji:'📯', rarity:'common',    chips:0,    desc:'A referees bronze whistle — blow for VAR!' },
  { level:5,  type:'apparel', name:'Golden Jersey #10',     emoji:'👕', rarity:'rare',      chips:300,  desc:'The legendary number 10 jersey in gold trim', milestone:true },

  // ── Level 6-10 ──
  { level:6,  type:'chips',   name:'High Roller Purse',    emoji:'💎', rarity:'uncommon',  chips:750,  desc:'Serious betting money' },
  { level:7,  type:'prop',    name:'Stadium Horn',          emoji:'📣', rarity:'uncommon',  chips:0,    desc:'Blast it when your team scores!' },
  { level:8,  type:'apparel', name:'Captain Armband',       emoji:'💪', rarity:'uncommon',  chips:0,    desc:'Wear it. Lead your predictions.' },
  { level:9,  type:'chips',   name:'VIP Stake Pack',        emoji:'🎰', rarity:'uncommon',  chips:1000, desc:'A thousand coins for the knockout rounds' },
  { level:10, type:'prop',    name:'Diamond Football',      emoji:'⚽', rarity:'epic',      chips:500,  desc:'A football encrusted with diamonds. Flex.', milestone:true },

  // ── Level 11-15 ──
  { level:11, type:'chips',   name:'Betting Bankroll',      emoji:'🏦', rarity:'uncommon',  chips:1200, desc:'Stacking coins for the big matches' },
  { level:12, type:'apparel', name:'Neon Boots',             emoji:'👟', rarity:'rare',      chips:0,    desc:'Custom neon cleats — style on the pitch' },
  { level:13, type:'prop',    name:'Red Card',               emoji:'🟥', rarity:'uncommon',  chips:0,    desc:'Slap it on the table for drama' },
  { level:14, type:'apparel', name:'VIP Lanyard',            emoji:'🎫', rarity:'rare',      chips:0,    desc:'All-access pass to the best seats' },
  { level:15, type:'prop',    name:'Crystal Trophy',         emoji:'🏆', rarity:'epic',      chips:800,  desc:'A crystal replica of the World Cup trophy', milestone:true },

  // ── Level 16-20 ──
  { level:16, type:'chips',   name:'Semi-Final Stash',      emoji:'💵', rarity:'rare',      chips:1500, desc:'Big game, big stakes' },
  { level:17, type:'prop',    name:'Tactical Clipboard',     emoji:'📋', rarity:'rare',      chips:0,    desc:'Draw formations like a real manager' },
  { level:18, type:'apparel', name:'Champion Jacket',        emoji:'🧥', rarity:'rare',      chips:0,    desc:'The winners jacket — premium leather' },
  { level:19, type:'special', name:'2x XP Boost',            emoji:'⚡', rarity:'rare',      chips:0,    desc:'Double XP on every action',               xpMult:2 },
  { level:20, type:'apparel', name:'Platinum Gloves',        emoji:'🧤', rarity:'legendary', chips:1000, desc:'Goalkeeper gloves forged in platinum', milestone:true },

  // ── Level 21-25 ──
  { level:21, type:'chips',   name:'Final Jackpot',          emoji:'🎲', rarity:'rare',      chips:2000, desc:'Two grand for the final showdown' },
  { level:22, type:'prop',    name:'Golden Vuvuzela',        emoji:'🎺', rarity:'epic',      chips:0,    desc:'The most iconic (and annoying) instrument' },
  { level:23, type:'apparel', name:'World Cup Scarf',        emoji:'🏅', rarity:'epic',      chips:0,    desc:'Limited edition tournament scarf' },
  { level:24, type:'special', name:'Prophet Title',           emoji:'🔮', rarity:'epic',      chips:0,    desc:'A legendary title for prediction masters' },
  { level:25, type:'prop',    name:'Champion Crown',          emoji:'👑', rarity:'legendary', chips:2500, desc:'The ultimate Battle Pass reward. Bow down.', milestone:true },

  // ── Level 26-30 ──
  { level:26, type:'chips',   name:'Knockout Kitty',         emoji:'💰', rarity:'rare',      chips:2200, desc:'War chest for the knockout rounds' },
  { level:27, type:'apparel', name:'Holographic Shin Guards', emoji:'🦿', rarity:'rare',      chips:0,    desc:'Shin guards that shimmer with every angle' },
  { level:28, type:'prop',    name:'VAR Monitor',             emoji:'🖥️', rarity:'rare',      chips:0,    desc:'Your personal VAR replay screen' },
  { level:29, type:'chips',   name:'Golden Boot Fund',        emoji:'🥇', rarity:'rare',      chips:2500, desc:'Coins worthy of the Golden Boot winner' },
  { level:30, type:'apparel', name:'Emerald Cleats',          emoji:'👟', rarity:'epic',      chips:1200, desc:'Cleats carved from pure emerald crystal', milestone:true },

  // ── Level 31-35 ──
  { level:31, type:'prop',    name:'Flame Pyro Kit',          emoji:'🔥', rarity:'rare',      chips:0,    desc:'Stadium pyrotechnics — celebrate in style' },
  { level:32, type:'chips',   name:'Quarter-Final Vault',     emoji:'🏦', rarity:'rare',      chips:2800, desc:'Serious money for serious matches' },
  { level:33, type:'apparel', name:'Thunder Cape',            emoji:'🦸', rarity:'epic',      chips:0,    desc:'A cape that crackles with electric energy' },
  { level:34, type:'prop',    name:'Laser Pointer',           emoji:'🔦', rarity:'rare',      chips:0,    desc:'Point out tactical weaknesses in real time' },
  { level:35, type:'special', name:'3x XP Surge',             emoji:'⚡', rarity:'epic',      chips:1500, desc:'Triple XP — accelerate your progress', milestone:true },

  // ── Level 36-40 ──
  { level:36, type:'chips',   name:'Dragon Hoard',            emoji:'🐉', rarity:'epic',      chips:3000, desc:'A dragons treasure trove of coins' },
  { level:37, type:'apparel', name:'Shadow Jersey',            emoji:'👕', rarity:'epic',      chips:0,    desc:'A jersey woven from midnight shadows' },
  { level:38, type:'prop',    name:'Phoenix Flare',            emoji:'🌟', rarity:'epic',      chips:0,    desc:'A flare that burns with undying flame' },
  { level:39, type:'chips',   name:'Semi-Final Fortune',       emoji:'💎', rarity:'epic',      chips:3500, desc:'Fortune favors the bold bettor' },
  { level:40, type:'prop',    name:'Obsidian Shield',          emoji:'🛡️', rarity:'legendary', chips:2000, desc:'An indestructible shield of volcanic glass', milestone:true },

  // ── Level 41-45 ──
  { level:41, type:'apparel', name:'Aurora Headband',          emoji:'🌈', rarity:'epic',      chips:0,    desc:'A headband that glows with northern lights' },
  { level:42, type:'chips',   name:'Titan Purse',              emoji:'💵', rarity:'epic',      chips:4000, desc:'Coins fit for a titan of predictions' },
  { level:43, type:'prop',    name:'Crystal Ball',              emoji:'🔮', rarity:'epic',      chips:0,    desc:'See the future of every match' },
  { level:44, type:'apparel', name:'Phantom Mask',             emoji:'🎭', rarity:'epic',      chips:0,    desc:'The mask of a mysterious high-roller' },
  { level:45, type:'special', name:'Lucky Charm',              emoji:'🍀', rarity:'legendary', chips:3000, desc:'Fortune smiles on everything you touch', milestone:true },

  // ── Level 46-50 ──
  { level:46, type:'chips',   name:'Final Countdown',          emoji:'🎆', rarity:'epic',      chips:4500, desc:'The big money for the grand finale' },
  { level:47, type:'prop',    name:'Celestial Whistle',         emoji:'✨', rarity:'legendary', chips:0,    desc:'A whistle forged in the stars themselves' },
  { level:48, type:'apparel', name:'Infinity Scarf',            emoji:'♾️', rarity:'legendary', chips:0,    desc:'A scarf that never ends — infinite style' },
  { level:49, type:'chips',   name:'Emperor Vault',             emoji:'👸', rarity:'legendary', chips:5000, desc:'Five thousand coins — the emperors ransom' },
  { level:50, type:'prop',    name:'World Cup Replica',         emoji:'🏆', rarity:'legendary', chips:5000, desc:'A 1:1 golden replica of the FIFA World Cup', milestone:true },
];

// ── Procedural reward generator for levels beyond 50 ──
const PROC_TEMPLATES = [
  { type:'chips', names:['Coin Cache','Gold Reserve','Mega Stash','Fortune Pile','Diamond Vault'], emoji:['🪙','💰','💎','🏦','💵'] },
  { type:'prop',  names:['Platinum Ball','Elite Badge','Legend Crest','Star Medal','Infinity Orb'], emoji:['⚽','🏅','🛡️','⭐','🔮'] },
  { type:'apparel', names:['Cosmic Kit','Astral Boots','Nebula Gloves','Void Cape','Starlight Crown'], emoji:['👕','👟','🧤','🧥','👑'] },
  { type:'special', names:['XP Surge','Lucky Streak','Power Hour','Golden Touch','Midas Effect'], emoji:['⚡','🍀','🔥','✨','💫'] },
];

function generateProceduralReward(lvl) {
  const isMilestone = lvl % 5 === 0;
  const cycleIdx = (lvl - 51) % 4;
  const tmpl = PROC_TEMPLATES[Math.abs(cycleIdx) % 4];
  const nameIdx = Math.floor((lvl - 51) / 4) % tmpl.names.length;

  // Rarity scales with level
  let rarity = 'uncommon';
  if (lvl >= 95) rarity = 'legendary';
  else if (lvl >= 80) rarity = 'epic';
  else if (lvl >= 65) rarity = 'rare';
  if (isMilestone && rarity !== 'legendary') {
    const bump = { common:'uncommon', uncommon:'rare', rare:'epic', epic:'legendary' };
    rarity = bump[rarity] || rarity;
  }

  const chips = tmpl.type === 'chips' ? Math.floor(500 + lvl * 100) : (isMilestone ? Math.floor(lvl * 50) : 0);

  return {
    level: lvl,
    type: tmpl.type,
    name: `${tmpl.names[nameIdx]} Lv.${lvl}`,
    emoji: tmpl.emoji[nameIdx],
    rarity,
    chips,
    desc: `Battle Pass Level ${lvl} reward`,
    milestone: isMilestone,
  };
}

// Get reward for any level (hand-crafted or procedural)
export function getRewardForLevel(lvl) {
  if (lvl <= 50) return BASE_REWARDS[lvl - 1] || null;
  return generateProceduralReward(lvl);
}

// Get array of rewards up to a given level
export function getRewardsUpTo(maxLevel) {
  const rewards = [];
  for (let i = 1; i <= maxLevel; i++) {
    rewards.push(getRewardForLevel(i));
  }
  return rewards;
}

// Keep TIER_REWARDS for backward compat (first 25 only)
export const TIER_REWARDS = BASE_REWARDS;

export function getTypeIcon(type) {
  return { chips:'🪙', prop:'🎁', apparel:'👔', special:'⚡' }[type] || '🎁';
}

export function getTypeLabel(type) {
  return { chips:'Chips', prop:'Collectible', apparel:'Apparel', special:'Special' }[type] || 'Reward';
}
