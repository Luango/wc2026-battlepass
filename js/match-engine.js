// ═══════════════════════════════════════════════════════════
// MATCH ENGINE — Minute-by-minute tactical simulation
// ═══════════════════════════════════════════════════════════
import { T } from './data/teams.js';
import { genSquad, getPlayerStats } from './data/squads.js';
import { FORMATIONS } from './data/formations.js';

// Event types the engine can produce
const EVT = {
  KICKOFF:    'kickoff',
  GOAL:       'goal',
  FOUL:       'foul',
  YELLOW:     'yellow',
  RED:        'red',
  CORNER:     'corner',
  FREEKICK:   'freekick',
  OFFSIDE:    'offside',
  SHOT:       'shot',
  SHOT_SAVED: 'shot_saved',
  SHOT_WIDE:  'shot_wide',
  PENALTY:    'penalty',
  PEN_GOAL:   'pen_goal',
  PEN_MISS:   'pen_miss',
  HALFTIME:   'halftime',
  FULLTIME:   'fulltime',
  SUB:        'sub',
  POSSESSION: 'possession',
  ATTACK:     'attack',
  CHANCE:     'chance',
};

// Generate a seeded random function
function mkRng(seed) {
  let s = seed | 0;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// Pick random item from array
function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

// Sub-steps per minute for smooth animation
const SUBSTEPS = 8;

// Weighted pick: items = [{item, weight}]
function wpick(items, rng) {
  const total = items.reduce((a, x) => a + x.weight, 0);
  let r = rng() * total;
  for (const x of items) { r -= x.weight; if (r <= 0) return x.item; }
  return items[items.length - 1].item;
}

// Build player positions for animation (normalized 0-1 coords on pitch)
function buildPositions(squad, formation, side) {
  const slots = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  const lineup = squad.slice(0, 11);
  return lineup.map((pl, i) => {
    const slot = slots[i] || { nx: 0.5, ny: 0.5 };
    let x = slot.nx, y = slot.ny;
    // Mirror for away team (right-to-left)
    if (side === 'away') { x = 1 - x; y = 1 - y; }
    return { player: pl, baseX: x, baseY: y, x, y, targetX: x, targetY: y, side };
  });
}

// Simulate a full match, producing an array of timed events + position snapshots
// homeLineup/awayLineup: optional arrays of squad indices for starting XI
export function simulateMatch(matchData, homeFormation = '4-3-3', awayFormation = '4-3-3', homeLineup = null, awayLineup = null) {
  const hTeam = T[matchData.home], aTeam = T[matchData.away];
  if (!hTeam || !aTeam) return null;

  const hFullSquad = genSquad(matchData.home);
  const aFullSquad = genSquad(matchData.away);

  // Reorder squad by user's lineup if provided
  function reorderSquad(squad, lineup) {
    if (!lineup || !lineup.length) return squad;
    const starters = lineup.map(i => squad[i]).filter(Boolean);
    const starterSet = new Set(lineup);
    const bench = squad.filter((_, i) => !starterSet.has(i));
    return [...starters, ...bench];
  }
  const hSquad = reorderSquad(hFullSquad, homeLineup);
  const aSquad = reorderSquad(aFullSquad, awayLineup);

  const rng = mkRng(matchData.id * 7919 + 42);

  // Calculate effective strength from lineup (average rating of starting XI)
  const hStartAvg = hSquad.slice(0, 11).reduce((a, p) => a + p.r, 0) / 11;
  const aStartAvg = aSquad.slice(0, 11).reduce((a, p) => a + p.r, 0) / 11;
  const hStr = (hTeam.str * 0.4 + hStartAvg * 0.6);
  const aStr = (aTeam.str * 0.4 + aStartAvg * 0.6);
  const totalStr = hStr + aStr;
  const hAdv = hStr / totalStr;

  // Possession tendency
  const hPossBase = 0.38 + hAdv * 0.24;

  // Build initial positions
  const hPositions = buildPositions(hSquad, homeFormation, 'home');
  const aPositions = buildPositions(aSquad, awayFormation, 'away');

  const events = [];
  const positionSnapshots = []; // {minute, positions: [...]}
  const score = [0, 0];
  let ballX = 0.5, ballY = 0.5;
  let possession = 'home'; // who has the ball

  // Track cards for second yellow -> red
  const cardCount = { home: {}, away: {} };
  // Track subs
  const subsUsed = { home: 0, away: 0 };
  const maxSubs = 5;

  function addEvent(minute, type, data = {}) {
    events.push({ minute, type, ...data });
  }

  function getScorer(side) {
    const squad = side === 'home' ? hSquad : aSquad;
    const pool = [];
    squad.slice(0, 11).forEach(pl => {
      const w = pl.p === 'FWD' ? 6 : pl.p === 'MID' ? 3 : pl.p === 'DEF' ? 1 : 0;
      for (let j = 0; j < w; j++) pool.push(pl);
    });
    return pick(pool, rng) || squad[0];
  }

  function getFouler(side) {
    const squad = side === 'home' ? hSquad : aSquad;
    const pool = [];
    squad.slice(0, 11).forEach(pl => {
      const w = pl.p === 'DEF' ? 4 : pl.p === 'MID' ? 3 : pl.p === 'FWD' ? 1 : 1;
      for (let j = 0; j < w; j++) pool.push(pl);
    });
    return pick(pool, rng) || squad[0];
  }

  function getAnyPlayer(side) {
    const squad = side === 'home' ? hSquad : aSquad;
    return pick(squad.slice(0, 11), rng);
  }

  // Compute per-minute target positions for all players based on tactical context
  function computePlayerTargets(minute, intensity) {
    const teamHasBall = possession === 'home';
    const allPos = [...hPositions, ...aPositions];

    // Whole-team block shift based on ball position
    const hShift = teamHasBall ? (ballX - 0.5) * 0.45 : (ballX - 0.5) * 0.28;
    const aShift = !teamHasBall ? (ballX - 0.5) * 0.45 : (ballX - 0.5) * 0.28;

    allPos.forEach(p => {
      const isHome = p.side === 'home';
      const myTeamHasBall = (isHome && teamHasBall) || (!isHome && !teamHasBall);
      const shift = isHome ? hShift : aShift;
      const pos = p.player.p;

      // Start from formation position shifted with team block
      let tx = p.baseX + shift;
      let ty = p.baseY;

      // Roaming range by position
      let roamX = 0.08, roamY = 0.10;
      if (pos === 'FWD') { roamX = 0.18; roamY = 0.16; }
      else if (pos === 'MID') { roamX = 0.14; roamY = 0.14; }
      else if (pos === 'DEF') { roamX = 0.10; roamY = 0.10; }
      else if (pos === 'GK') { roamX = 0.03; roamY = 0.08; }

      // Random run direction for this minute
      tx += (rng() - 0.5) * roamX * intensity;
      ty += (rng() - 0.5) * roamY * intensity;

      // Ball attraction — closer players drawn harder
      const distToBall = Math.hypot(ballX - p.x, ballY - p.y);

      if (pos === 'GK') {
        // GK: track ball Y, stay near goal
        const goalX = isHome ? 0.04 : 0.96;
        tx = goalX + (ballX - goalX) * 0.08;
        ty = p.baseY + (ballY - p.baseY) * 0.6;
      } else if (distToBall < 0.20) {
        // Very close to ball — strong pull
        const pull = myTeamHasBall ? 0.55 : 0.40;
        tx += (ballX - tx) * pull;
        ty += (ballY - ty) * pull;
      } else if (distToBall < 0.40) {
        // Medium range — moderate pull
        const pull = myTeamHasBall ? 0.25 : 0.15;
        tx += (ballX - tx) * pull;
        ty += (ballY - ty) * pull;
      } else {
        // Far — drift toward ball's lane
        ty += (ballY - ty) * 0.12;
      }

      // Attacking runs: forwards sprint toward goal when team has ball
      if (myTeamHasBall && pos === 'FWD') {
        const goalX = isHome ? 0.90 : 0.10;
        tx += (goalX - tx) * 0.20;
        // Spread wide or cut inside
        ty += (rng() - 0.5) * 0.12;
      }

      // Midfield support: push up when attacking
      if (myTeamHasBall && pos === 'MID') {
        const pushX = isHome ? 0.15 : -0.15;
        tx += pushX;
      }

      // Defensive compactness: defenders fall back when not in possession
      if (!myTeamHasBall && pos === 'DEF') {
        const ownGoalX = isHome ? 0.15 : 0.85;
        tx += (ownGoalX - tx) * 0.18;
        // Compress vertically toward ball lane
        ty += (ballY - ty) * 0.10;
      }

      // Clamp targets
      tx = Math.max(0.03, Math.min(0.97, tx));
      ty = Math.max(0.06, Math.min(0.94, ty));

      // Store target on the player object
      p.targetX = tx;
      p.targetY = ty;
    });
  }

  // Substep: smoothly move players toward their minute targets
  function stepPositions(minute, substep) {
    const allPos = [...hPositions, ...aPositions];
    // Lerp speed: higher = snappier arrival. 0.22 means ~85% arrival in 8 substeps
    const lerpSpeed = 0.22;

    allPos.forEach(p => {
      p.x += (p.targetX - p.x) * lerpSpeed;
      p.y += (p.targetY - p.y) * lerpSpeed;

      // Clamp
      p.x = Math.max(0.02, Math.min(0.98, p.x));
      p.y = Math.max(0.05, Math.min(0.95, p.y));
    });

    positionSnapshots.push({
      minute,
      substep,
      ball: { x: ballX, y: ballY },
      home: hPositions.map(p => ({ x: p.x, y: p.y, name: p.player.n, pos: p.player.p, num: p.player.num })),
      away: aPositions.map(p => ({ x: p.x, y: p.y, name: p.player.n, pos: p.player.p, num: p.player.num })),
      score: [...score],
      possession,
    });
  }

  // ── KICKOFF ────────────────────────────────────────────
  addEvent(0, EVT.KICKOFF, { team: 'home' });
  ballX = 0.5; ballY = 0.5;
  computePlayerTargets(0, 0.3); // gentle start
  for (let s = 0; s < SUBSTEPS; s++) stepPositions(0, s);

  // ── SIMULATE EACH MINUTE ──────────────────────────────
  for (let min = 1; min <= 90; min++) {
    // Half time
    if (min === 46) {
      addEvent(45, EVT.HALFTIME, { score: [...score] });
      // Reset positions for second half
      hPositions.forEach(p => { p.x = p.baseX; p.y = p.baseY; });
      aPositions.forEach(p => { p.x = p.baseX; p.y = p.baseY; });
      ballX = 0.5; ballY = 0.5;
      possession = 'away'; // away kicks off 2nd half
    }

    // Determine possession this minute
    const possRoll = rng();
    possession = possRoll < hPossBase ? 'home' : 'away';
    const attacking = possession;
    const defending = attacking === 'home' ? 'away' : 'home';

    // Set ball target for this minute (substeps will interpolate toward it)
    const ballTargetX = attacking === 'home'
      ? Math.min(0.95, ballX + rng() * 0.15 + 0.02)
      : Math.max(0.05, ballX - rng() * 0.15 - 0.02);
    const ballTargetY = 0.15 + rng() * 0.7;

    // ── EVENT GENERATION ────────────────────────────────
    const r = rng();
    const atkStr = attacking === 'home' ? hStr : aStr;
    const defStr = defending === 'home' ? hStr : aStr;
    const qualityEdge = atkStr / (atkStr + defStr);

    // Substitution window (60-80 min)
    if (min >= 55 && min <= 82 && rng() < 0.06) {
      const subSide = rng() < 0.5 ? 'home' : 'away';
      if (subsUsed[subSide] < maxSubs) {
        const squad = subSide === 'home' ? hSquad : aSquad;
        const onField = squad.slice(0, 11);
        const bench = squad.slice(11);
        if (bench.length > 0) {
          const out = pick(onField.filter(p => p.p !== 'GK'), rng);
          const inP = pick(bench, rng);
          if (out && inP) {
            subsUsed[subSide]++;
            addEvent(min, EVT.SUB, { team: subSide, playerOut: out.n, playerIn: inP.n });
          }
        }
      }
    }

    // Foul (common event, ~18% of minutes)
    if (r < 0.18) {
      const fouler = getFouler(defending);
      const fouled = getAnyPlayer(attacking);
      const isInBox = (attacking === 'home' && ballX > 0.82) || (attacking === 'away' && ballX < 0.18);

      addEvent(min, EVT.FOUL, { team: defending, player: fouler.n, fouled: fouled.n });

      // Card chance on foul
      const cardRoll = rng();
      if (cardRoll < 0.12) {
        // Check for second yellow
        const side = defending;
        if (!cardCount[side][fouler.n]) cardCount[side][fouler.n] = 0;
        cardCount[side][fouler.n]++;

        if (cardCount[side][fouler.n] >= 2) {
          addEvent(min, EVT.YELLOW, { team: side, player: fouler.n });
          addEvent(min, EVT.RED, { team: side, player: fouler.n, reason: 'second_yellow' });
        } else {
          addEvent(min, EVT.YELLOW, { team: side, player: fouler.n });
        }
      } else if (cardRoll < 0.015) {
        addEvent(min, EVT.RED, { team: defending, player: fouler.n, reason: 'straight_red' });
      }

      // Penalty?
      if (isInBox && rng() < 0.35) {
        const taker = getScorer(attacking);
        addEvent(min, EVT.PENALTY, { team: attacking, player: taker.n });
        if (rng() < 0.78) {
          score[attacking === 'home' ? 0 : 1]++;
          addEvent(min, EVT.PEN_GOAL, { team: attacking, player: taker.n, score: [...score] });
          ballX = 0.5; ballY = 0.5;
        } else {
          addEvent(min, EVT.PEN_MISS, { team: attacking, player: taker.n });
        }
      } else if (!isInBox) {
        // Free kick
        addEvent(min, EVT.FREEKICK, { team: attacking, player: fouled.n });
        // Free kick goal (rare)
        if (rng() < 0.06) {
          const scorer = getScorer(attacking);
          score[attacking === 'home' ? 0 : 1]++;
          addEvent(min, EVT.GOAL, { team: attacking, player: scorer.n, assist: fouled.n, goalType: 'freekick', score: [...score] });
          ballX = 0.5; ballY = 0.5;
        }
      }
    }
    // Shot / chance (attacking moment)
    else if (r < 0.35) {
      const shooter = getScorer(attacking);
      const shotQuality = rng() * qualityEdge;

      addEvent(min, EVT.CHANCE, { team: attacking, player: shooter.n });

      if (shotQuality > 0.38) {
        // Shot on target
        addEvent(min, EVT.SHOT, { team: attacking, player: shooter.n });
        const goalChance = 0.18 + (qualityEdge - 0.5) * 0.2;

        if (rng() < goalChance) {
          // GOAL!
          const assistPool = (attacking === 'home' ? hSquad : aSquad).slice(0, 11).filter(p => p.n !== shooter.n);
          const assister = assistPool.length > 0 ? pick(assistPool, rng) : null;
          score[attacking === 'home' ? 0 : 1]++;
          addEvent(min, EVT.GOAL, {
            team: attacking, player: shooter.n,
            assist: assister ? assister.n : null,
            goalType: 'open_play', score: [...score]
          });
          ballX = 0.5; ballY = 0.5;
        } else {
          // Saved
          const gk = (defending === 'home' ? hSquad : aSquad).find(p => p.p === 'GK');
          addEvent(min, EVT.SHOT_SAVED, { team: attacking, player: shooter.n, keeper: gk ? gk.n : 'GK' });

          // Corner from save
          if (rng() < 0.4) {
            addEvent(min, EVT.CORNER, { team: attacking });
            // Corner goal
            if (rng() < 0.04) {
              const header = getScorer(attacking);
              score[attacking === 'home' ? 0 : 1]++;
              addEvent(min, EVT.GOAL, { team: attacking, player: header.n, goalType: 'corner', score: [...score] });
              ballX = 0.5; ballY = 0.5;
            }
          }
        }
      } else if (shotQuality > 0.25) {
        addEvent(min, EVT.SHOT_WIDE, { team: attacking, player: shooter.n });
      }
    }
    // Offside
    else if (r < 0.39) {
      const runner = getScorer(attacking);
      addEvent(min, EVT.OFFSIDE, { team: attacking, player: runner.n });
    }
    // Corner (standalone)
    else if (r < 0.43) {
      addEvent(min, EVT.CORNER, { team: attacking });
      if (rng() < 0.05) {
        const header = getScorer(attacking);
        score[attacking === 'home' ? 0 : 1]++;
        addEvent(min, EVT.GOAL, { team: attacking, player: header.n, goalType: 'corner', score: [...score] });
        ballX = 0.5; ballY = 0.5;
      }
    }
    // Possession / build-up (no notable event)
    else {
      if (rng() < 0.15) {
        addEvent(min, EVT.ATTACK, { team: attacking });
      }
    }

    // Compute targets once per minute, then substeps interpolate
    const intensity = min > 75 ? 1.3 : 1;
    computePlayerTargets(min, intensity);

    for (let s = 0; s < SUBSTEPS; s++) {
      // Smoothly interpolate ball toward this minute's target
      ballX += (ballTargetX - ballX) * 0.30;
      ballY += (ballTargetY - ballY) * 0.30;
      // Slight wobble
      ballX += (rng() - 0.5) * 0.012;
      ballY += (rng() - 0.5) * 0.012;
      ballX = Math.max(0.03, Math.min(0.97, ballX));
      ballY = Math.max(0.05, Math.min(0.95, ballY));
      stepPositions(min, s);
    }
  }

  // ── FULL TIME ──────────────────────────────────────────
  addEvent(90, EVT.FULLTIME, { score: [...score] });

  // Determine result
  let result;
  if (score[0] > score[1]) result = 'home';
  else if (score[1] > score[0]) result = 'away';
  else result = 'draw';

  return {
    events,
    positionSnapshots,
    score,
    result,
    homeSquad: hSquad,
    awaySquad: aSquad,
    homeFormation,
    awayFormation,
  };
}

export { EVT, SUBSTEPS };
