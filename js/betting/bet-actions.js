// ═══════════════════════════════════════════════════════════
// BET ACTIONS — User interaction: pick, place, switch tabs
// ═══════════════════════════════════════════════════════════
import { state, BET_TYPES } from '../state.js';
import { T } from '../data/teams.js';
import {
  calcOdds, calcSpreadOdds, calcTotalOdds, calcBttsOdds,
  calcDoubleChanceOdds, calcDrawNoBetOdds, calcExactScoreOdds,
  calcGoalscorerOdds
} from './odds.js';
import { SFX } from '../audio-fx.js';
import { animateElement, coinPopAnimation, shakeElement } from '../visual-fx.js';

// ── Late-binding dependencies to avoid circular imports ──
let _deps = {};
export function setBetDeps({toast, renderMatches, renderPreviewBetting, addXP, saveState}){
  _deps = {toast, renderMatches, renderPreviewBetting, addXP, saveState};
}

// ── GET ODDS FOR PICK ──────────────────────────────────────
export function getOddsForPick(m,pick,tab){
  const h=T[m.home],a=T[m.away];
  if(tab==='match'){
    const o=calcOdds(h.str,a.str);
    return pick==='home'?o.home:pick==='draw'?o.draw:o.away;
  }
  if(tab==='spread'){
    const o=calcSpreadOdds(h.str,a.str);
    return pick==='home_spread'?o.home:o.away;
  }
  if(tab==='totals'){
    const o=calcTotalOdds(h.str,a.str);
    return pick==='over'?o.over:o.under;
  }
  if(tab==='btts'){
    const o=calcBttsOdds(h.str,a.str);
    return pick==='btts_yes'?o.yes:o.no;
  }
  if(tab==='double'){
    const o=calcDoubleChanceOdds(h.str,a.str);
    return o[pick]||1;
  }
  if(tab==='dnb'){
    const o=calcDrawNoBetOdds(h.str,a.str);
    return pick==='dnb_home'?o.home:o.away;
  }
  if(tab==='exact'){
    const es=calcExactScoreOdds(h.str,a.str);
    const parts=pick.replace('es_','').split('_');
    const s=es.find(x=>x.h===+parts[0]&&x.a===+parts[1]);
    return s?s.odds:10;
  }
  if(tab==='scorer'){
    const gs=calcGoalscorerOdds(m.id);
    const name=pick.replace('gs_','');
    const p=gs.find(x=>x.name===name);
    return p?p.odds:5;
  }
  return 1;
}

// ── BET PICK LABEL ─────────────────────────────────────────
export function betPickLabel(m,pick,tab){
  const h=T[m.home],a=T[m.away];
  if(tab==='match')return pick==='home'?h.name:pick==='draw'?'Draw':a.name;
  if(tab==='spread'){
    const so=calcSpreadOdds(h.str,a.str);
    return pick==='home_spread'?`${h.name} ${so.homeLine}`:`${a.name} +${so.awayLine}`;
  }
  if(tab==='totals')return pick==='over'?'Over 2.5':'Under 2.5';
  if(tab==='btts')return pick==='btts_yes'?'BTTS Yes':'BTTS No';
  if(tab==='double'){
    if(pick==='home_draw')return`${h.name}/Draw`;
    if(pick==='away_draw')return`${a.name}/Draw`;
    return`${h.name}/${a.name}`;
  }
  if(tab==='dnb')return pick==='dnb_home'?`${h.name} (DNB)`:`${a.name} (DNB)`;
  if(tab==='exact'){const p=pick.replace('es_','').split('_');return`Exact ${p[0]}\u2013${p[1]}`;}
  if(tab==='scorer')return pick.replace('gs_','')+ ' to score';
  return pick;
}

// ── PICK OPTION ────────────────────────────────────────────
export function pickOpt(evt,mid,pick,el){
  if(evt&&evt.stopPropagation)evt.stopPropagation();
  const m=state.MS.find(x=>x.id===mid);
  if(!m||m.status==='settled'||state.ST.bets[mid])return;
  const container=document.getElementById('preview-right')
    ||document.querySelector(`.mc[data-mid="${mid}"]`);
  const wasSel=el.classList.contains('sel');
  if(container)container.querySelectorAll('.bopt').forEach(o=>o.classList.remove('sel'));
  el.classList.add('sel');
  state.picks[mid]=pick;
  // Audio + visual
  SFX.select();
  animateElement(el,'anim-glow',500);
  const oddsEl=el.querySelector('.odds,.odds-sm');
  if(oddsEl)animateElement(oddsEl,'anim-odds-flash',500);
}

// ── PLACE BET ──────────────────────────────────────────────
export function placeBet(evt,mid){
  if(evt&&evt.stopPropagation)evt.stopPropagation();
  const m=state.MS.find(x=>x.id===mid);
  if(!m||m.status!=='pending')return;
  const pick=state.picks[mid];
  if(!pick){SFX.error();_deps.toast('Select an outcome first');return;}
  const inp=document.getElementById(`bi-${mid}`);
  const amt=parseInt(inp.value)||0;
  if(amt<10){SFX.error();_deps.toast('Minimum bet: 10 coins');return;}
  if(amt>state.ST.coins){SFX.error();shakeElement(document.getElementById('h-coins'));_deps.toast('Not enough coins!');return;}
  const tab=state.betTabs[mid]||'match';
  const ov=getOddsForPick(m,pick,tab);
  const lbl=betPickLabel(m,pick,tab);
  state.ST.coins-=amt;
  state.ST.bets[mid]={type:tab,pick,amount:amt,odds:ov,status:'pending',payout:null,
                phase:m.phase,home:m.home,away:m.away,date:m.date};
  _deps.addXP(15);_deps.saveState();
  // Audio + visual feedback for bet placement
  SFX.betPlace();
  coinPopAnimation();
  const betBtn=evt?.target?.closest('.btn-bet');
  if(betBtn)animateElement(betBtn,'anim-pulse-gold',600);
  _deps.toast(`\u2705 ${amt} coins on ${lbl} @ ${ov}x`);
  _deps.renderMatches();
  const rpanel=document.getElementById('preview-right');
  if(rpanel&&state.previewMode)_deps.renderPreviewBetting(rpanel, mid);
}

// ── SWITCH BET TAB ─────────────────────────────────────────
export function switchBetTab(evt,mid,tabId){
  if(evt)evt.stopPropagation();
  SFX.tab();
  state.betTabs[mid]=tabId;
  delete state.picks[mid];
  _deps.renderMatches();
}

// ── SWITCH PREVIEW BET TAB ─────────────────────────────────
export function switchPreviewBetTab(mid,tabId){
  SFX.tab();
  state.betTabs[mid]=tabId;
  delete state.picks[mid];
  const container=document.getElementById('preview-right');
  if(container)_deps.renderPreviewBetting(container, mid);
}
