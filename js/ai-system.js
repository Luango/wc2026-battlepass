// ═══════════════════════════════════════════════════════════
// AI SYSTEM — Pervasive match intelligence engine
// ═══════════════════════════════════════════════════════════
import { state } from './state.js?v=9';
import { T } from './data/teams.js?v=9';
import { genSquad } from './data/squads.js?v=9';
import { calcOdds, calcSpreadOdds, calcTotalOdds, calcBttsOdds,
         calcDoubleChanceOdds, calcDrawNoBetOdds,
         calcGoalscorerOdds } from './betting/odds.js?v=9';

// ── AI VERDICT — Main match prediction for match cards ────
export function getAIVerdict(mid) {
  const m = state.MS.find(x => x.id === mid);
  if (!m) return null;
  const h = T[m.home], a = T[m.away];
  if (!h || !a) return null;

  const hSquad = genSquad(m.home), aSquad = genSquad(m.away);
  const hAvg = Math.round(hSquad.slice(0, 11).reduce((s, p) => s + p.r, 0) / 11);
  const aAvg = Math.round(aSquad.slice(0, 11).reduce((s, p) => s + p.r, 0) / 11);
  const diff = hAvg - aAvg;

  // Calculate win probabilities from strength
  const tot = h.str + a.str;
  const hp = (h.str / tot) * 0.82 + 0.07;
  const ap = (a.str / tot) * 0.82 + 0.07;
  const dp = Math.max(0.05, 1 - hp - ap);

  let pick, confidence, label;
  if (hp > ap && hp > dp) {
    pick = 'home';
    confidence = Math.round(hp * 100);
    label = h.name;
  } else if (ap > hp && ap > dp) {
    pick = 'away';
    confidence = Math.round(ap * 100);
    label = a.name;
  } else {
    pick = 'draw';
    confidence = Math.round(dp * 100);
    label = 'Draw';
  }

  // Value bet detection — find biggest edge
  const odds = calcOdds(h.str, a.str);
  const impliedHome = 1 / odds.home, impliedAway = 1 / odds.away;
  let valueBet = null;
  if (Math.abs(diff) <= 3) {
    valueBet = 'Draw looks undervalued';
  } else if (diff > 8) {
    const to = calcTotalOdds(h.str, a.str);
    if (to.over < 2.0) valueBet = `Over ${to.line} goals`;
    else valueBet = `${h.name} spread`;
  } else if (diff < -8) {
    valueBet = `${a.name} Draw No Bet`;
  }

  return { pick, confidence, label, valueBet, hAvg, aAvg };
}

// ── AI CONFIDENCE — Per-bet-option confidence ─────────────
export function getAIConfidence(mid, betType, pick) {
  const m = state.MS.find(x => x.id === mid);
  if (!m) return { level: 'neutral', pct: 50 };
  const h = T[m.home], a = T[m.away];
  if (!h || !a) return { level: 'neutral', pct: 50 };

  const tot = h.str + a.str;
  const hp = (h.str / tot) * 0.82 + 0.07;
  const ap = (a.str / tot) * 0.82 + 0.07;
  const dp = Math.max(0.05, 1 - hp - ap);

  let pct = 50;

  if (betType === 'match') {
    if (pick === 'home') pct = Math.round(hp * 100);
    else if (pick === 'away') pct = Math.round(ap * 100);
    else if (pick === 'draw') pct = Math.round(dp * 100);
  } else if (betType === 'spread') {
    pct = pick === 'home_spread' ? Math.round(hp * 85) : Math.round(ap * 85 + 15);
  } else if (betType === 'totals') {
    const avg = (h.str + a.str) / 2;
    const overP = Math.max(0.15, Math.min(0.85, 0.35 + (avg - 70) * 0.008));
    pct = pick === 'over' ? Math.round(overP * 100) : Math.round((1 - overP) * 100);
  } else if (betType === 'btts') {
    const avg = (h.str + a.str) / 2, diff = Math.abs(h.str - a.str);
    const yP = Math.max(0.15, Math.min(0.8, 0.45 + (avg - 70) * 0.005 - diff * 0.005));
    pct = pick === 'btts_yes' ? Math.round(yP * 100) : Math.round((1 - yP) * 100);
  } else if (betType === 'double') {
    if (pick === 'home_draw') pct = Math.round((hp + dp) * 100);
    else if (pick === 'away_draw') pct = Math.round((ap + dp) * 100);
    else if (pick === 'home_away') pct = Math.round((hp + ap) * 100);
  } else if (betType === 'dnb') {
    const hNd = hp / (hp + ap);
    pct = pick === 'dnb_home' ? Math.round(hNd * 100) : Math.round((1 - hNd) * 100);
  }

  const level = pct >= 62 ? 'strong' : pct >= 45 ? 'lean' : 'neutral';
  return { level, pct };
}

// ── AI TICKER — Short insights for tactical board ─────────
export function getAITicker(mid) {
  const m = state.MS.find(x => x.id === mid);
  if (!m) return [];
  const h = T[m.home], a = T[m.away];
  if (!h || !a) return [];

  const hSquad = genSquad(m.home), aSquad = genSquad(m.away);
  const hStar = hSquad.reduce((best, p) => p.r > best.r ? p : best, hSquad[0]);
  const aStar = aSquad.reduce((best, p) => p.r > best.r ? p : best, aSquad[0]);
  const hAvg = Math.round(hSquad.slice(0, 11).reduce((s, p) => s + p.r, 0) / 11);
  const aAvg = Math.round(aSquad.slice(0, 11).reduce((s, p) => s + p.r, 0) / 11);
  const hFwd = hSquad.filter(p => p.p === 'FWD');
  const aFwd = aSquad.filter(p => p.p === 'FWD');
  const hDef = hSquad.filter(p => p.p === 'DEF');
  const aDef = aSquad.filter(p => p.p === 'DEF');
  const hDefAvg = hDef.length ? Math.round(hDef.reduce((s, p) => s + p.r, 0) / hDef.length) : 0;
  const aDefAvg = aDef.length ? Math.round(aDef.reduce((s, p) => s + p.r, 0) / aDef.length) : 0;

  const odds = calcOdds(h.str, a.str);
  const to = calcTotalOdds(h.str, a.str);

  const insights = [
    `${hStar.n} (${hStar.r}) is ${h.name}'s key threat`,
    `${aStar.n} (${aStar.r}) leads ${a.name}'s attack`,
    `Squad ratings: ${h.name} ${hAvg} vs ${a.name} ${aAvg}`,
    hAvg > aAvg + 3 ? `${h.name} have a clear quality edge` : aAvg > hAvg + 3 ? `${a.name} hold the statistical advantage` : 'Evenly matched on paper',
    `${h.name} attack: ${hFwd.length} FWDs available`,
    `${a.name} defense averages ${aDefAvg} OVR`,
    to.over < 1.8 ? 'Goals expected — Over 2.5 looks likely' : to.under < 1.8 ? 'Tight game — Under 2.5 favored' : 'Goal line finely balanced',
    `Market odds: ${h.name} ${odds.home}x | Draw ${odds.draw}x | ${a.name} ${odds.away}x`,
  ];

  return insights;
}

// ── SCORER INSIGHT — Short tag for goalscorer options ──────
export function getAIScorerInsight(playerName, mid) {
  const m = state.MS.find(x => x.id === mid);
  if (!m) return '';

  const allSquad = [...genSquad(m.home), ...genSquad(m.away)];
  const pl = allSquad.find(p => p.n === playerName);
  if (!pl) return '';

  if (pl.p === 'FWD') {
    if (pl.r >= 88) return 'Elite finisher';
    if (pl.r >= 83) return 'Hot form';
    if (pl.r >= 78) return 'Reliable scorer';
    return 'Impact sub';
  }
  if (pl.p === 'MID') {
    if (pl.r >= 86) return 'Set piece threat';
    if (pl.r >= 80) return 'Arrives late in box';
    return 'Long-range threat';
  }
  if (pl.p === 'DEF') {
    if (pl.r >= 84) return 'Aerial threat';
    return 'Set piece only';
  }
  return '';
}

// ── AI MATCH NEWS — Pre-match intel feed ──────────────────
export function generateMatchNews(mid) {
  const m = state.MS.find(x => x.id === mid);
  if (!m) return [];
  const h = T[m.home], a = T[m.away];
  if (!h || !a) return [];
  const hSquad = genSquad(m.home), aSquad = genSquad(m.away);
  const hStar = hSquad.reduce((best, p) => p.r > best.r ? p : best, hSquad[0]);
  const aStar = aSquad.reduce((best, p) => p.r > best.r ? p : best, aSquad[0]);
  const hAvg = Math.round(hSquad.slice(0, 11).reduce((s, p) => s + p.r, 0) / 11);
  const aAvg = Math.round(aSquad.slice(0, 11).reduce((s, p) => s + p.r, 0) / 11);

  return [
    { cat: 'PREVIEW', icon: '📰', text: `${h.name} vs ${a.name} is one of the most anticipated fixtures of the ${m.phase}. Both sides are expected to field strong lineups.` },
    { cat: 'STAR WATCH', icon: '⭐', text: `${hStar.n} (${hStar.r} OVR) leads the charge for ${h.name}, while ${aStar.n} (${aStar.r} OVR) is ${a.name}'s key man to watch.` },
    { cat: 'FORM GUIDE', icon: '📊', text: `${h.name} average squad rating: ${hAvg}. ${a.name} average squad rating: ${aAvg}. ${hAvg > aAvg ? h.name + ' have the statistical edge.' : aAvg > hAvg ? a.name + ' hold a slight advantage.' : 'Both teams are evenly matched on paper.'}` },
    { cat: 'TACTICS', icon: '🧠', text: `Analysts expect ${h.name} to deploy a high press, while ${a.name} could look to exploit space on the counter-attack through ${aStar.n}.` },
    { cat: 'INJURY NEWS', icon: '🏥', text: `Both squads report a clean bill of health ahead of this crucial ${m.phase} clash. All key players are available for selection.` },
    { cat: 'BETTING INTEL', icon: '💰', text: `The market slightly favors ${hAvg >= aAvg ? h.name : a.name} based on squad ratings, but upsets are common in World Cup football.` },
    { cat: 'HISTORY', icon: '📜', text: `This is a high-stakes encounter in the ${m.phase}. Historical data suggests tight matches between teams of similar caliber.` },
    { cat: 'VENUE', icon: '🏟️', text: `The match will be played in a state-of-the-art venue in North America. Expect a packed crowd and electric atmosphere for this ${m.phase} fixture.` },
  ];
}

// ── AI CHAT RESPONSE — Keyword-matched analysis ───────────
export function generateAIResponse(question, mid) {
  const m = state.MS.find(x => x.id === mid);
  if (!m) return "I don't have data for this match.";
  const h = T[m.home], a = T[m.away];
  if (!h || !a) return "Match data unavailable.";
  const hSquad = genSquad(m.home), aSquad = genSquad(m.away);
  const hStar = hSquad.reduce((best, p) => p.r > best.r ? p : best, hSquad[0]);
  const aStar = aSquad.reduce((best, p) => p.r > best.r ? p : best, aSquad[0]);
  const hAvg = Math.round(hSquad.slice(0, 11).reduce((s, p) => s + p.r, 0) / 11);
  const aAvg = Math.round(aSquad.slice(0, 11).reduce((s, p) => s + p.r, 0) / 11);
  const q = question.toLowerCase();

  if (q.includes('who') && q.includes('win')) {
    const verdict = getAIVerdict(mid);
    return `Based on squad analysis, I'm backing <strong>${verdict.label}</strong> with ${verdict.confidence}% confidence. ${h.name} averages ${hAvg} OVR vs ${a.name}'s ${aAvg}. ${verdict.valueBet ? `💡 Value tip: ${verdict.valueBet}` : ''} But World Cup matches are unpredictable!`;
  }
  if (q.includes('best player') || q.includes('star') || q.includes('key player')) {
    return `For ${h.name}, watch <strong>${hStar.n}</strong> (${hStar.p}, ${hStar.r} OVR) — their most impactful player. ${a.name} relies on <strong>${aStar.n}</strong> (${aStar.p}, ${aStar.r} OVR) to deliver in big moments.`;
  }
  if (q.includes('lineup') || q.includes('formation') || q.includes('team')) {
    return `${h.name} has ${hSquad.length} players in the squad with an average XI rating of ${hAvg}. ${a.name} carries ${aSquad.length} players averaging ${aAvg}. Use the Tactical Board to experiment with formations!`;
  }
  if (q.includes('bet') || q.includes('odds') || q.includes('wager') || q.includes('tip')) {
    const verdict = getAIVerdict(mid);
    const odds = calcOdds(h.str, a.str);
    return `📊 <strong>AI Betting Analysis:</strong><br>• Match favorite: ${verdict.label} (${verdict.confidence}%)<br>• Odds: ${h.name} ${odds.home}x | Draw ${odds.draw}x | ${a.name} ${odds.away}x<br>${verdict.valueBet ? `• 💡 Value pick: ${verdict.valueBet}` : '• No clear value edges detected'}<br>Remember: bet smart, not big!`;
  }
  if (q.includes('tactic') || q.includes('strategy') || q.includes('play style')) {
    const hFwd = hSquad.filter(p => p.p === 'FWD').length;
    const aFwd = aSquad.filter(p => p.p === 'FWD').length;
    return `${h.name} has ${hFwd} forwards suggesting an attacking approach. ${a.name} with ${aFwd} forwards could match that intensity. Try different formations on the pitch to see how tactics shift the prediction!`;
  }
  if (q.includes('goalkeeper') || q.includes('gk') || q.includes('keeper')) {
    const hGK = hSquad.find(p => p.p === 'GK');
    const aGK = aSquad.find(p => p.p === 'GK');
    return `${h.name}'s #1 is ${hGK ? hGK.n : 'TBD'} (${hGK ? hGK.r : '?'} OVR). ${a.name} has ${aGK ? aGK.n : 'TBD'} (${aGK ? aGK.r : '?'} OVR) between the sticks.`;
  }
  if (q.includes('defend') || q.includes('defense') || q.includes('back')) {
    const hDef = hSquad.filter(p => p.p === 'DEF');
    const aDef = aSquad.filter(p => p.p === 'DEF');
    const hDefAvg = hDef.length ? Math.round(hDef.reduce((s, p) => s + p.r, 0) / hDef.length) : 0;
    const aDefAvg = aDef.length ? Math.round(aDef.reduce((s, p) => s + p.r, 0) / aDef.length) : 0;
    return `${h.name} defenders average ${hDefAvg} OVR across ${hDef.length} players. ${a.name}'s backline averages ${aDefAvg} across ${aDef.length}. ${hDefAvg > aDefAvg ? h.name : a.name} looks more solid at the back.`;
  }
  if (q.includes('midfield') || q.includes('mid')) {
    const hMid = hSquad.filter(p => p.p === 'MID');
    const aMid = aSquad.filter(p => p.p === 'MID');
    const hMidAvg = hMid.length ? Math.round(hMid.reduce((s, p) => s + p.r, 0) / hMid.length) : 0;
    const aMidAvg = aMid.length ? Math.round(aMid.reduce((s, p) => s + p.r, 0) / aMid.length) : 0;
    return `Midfield battle: ${h.name} has ${hMid.length} options averaging ${hMidAvg}. ${a.name} counters with ${aMid.length} midfielders at ${aMidAvg} average.`;
  }
  if (q.includes('value') || q.includes('edge')) {
    const verdict = getAIVerdict(mid);
    return verdict.valueBet
      ? `💡 I see value in: <strong>${verdict.valueBet}</strong>. The market might be underpricing this outcome based on squad analysis.`
      : `No strong value edges for this match. The market looks fairly priced. Consider smaller stakes or exploring exotic markets like goalscorer bets.`;
  }
  return `For ${h.name} vs ${a.name} (${m.phase}): ${h.name} fields a squad averaging ${hAvg} OVR led by ${hStar.n}, while ${a.name} counters with ${aAvg} avg OVR and star player ${aStar.n}. Ask me about predictions, tactics, betting tips, value picks, or any position group!`;
}

// ── CHAT HISTORY ──────────────────────────────────────────
export const aiChatHistory = {};
