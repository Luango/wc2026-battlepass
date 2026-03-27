// ═══════════════════════════════════════════════════════════
// BET ACTIONS — User interaction: pick, place, switch tabs
// ═══════════════════════════════════════════════════════════
import { state, BET_TYPES } from '../state.js?v=9';
import { T } from '../data/teams.js?v=9';
import {
  calcOdds, calcTotalOdds, calcBttsOdds,
  calcFormationOdds, calcGoalscorerOdds,
  calcStartingXIOdds, calcMVPOdds
} from './odds.js?v=9';
import { SFX } from '../audio-fx.js?v=9';
import { animateElement, coinPopAnimation, shakeElement } from '../visual-fx.js?v=9';

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
  if(tab==='totals'){
    const o=calcTotalOdds(h.str,a.str);
    return pick==='over'?o.over:o.under;
  }
  if(tab==='btts'){
    const o=calcBttsOdds(h.str,a.str);
    return pick==='btts_yes'?o.yes:o.no;
  }
  if(tab==='formation'){
    const hForm=state.previewFormations?.home||'4-3-3';
    const aForm=state.previewFormations?.away||'4-3-3';
    const o=calcFormationOdds(h.str,a.str,hForm,aForm);
    return pick==='form_home'?o.home:o.away;
  }
  if(tab==='scorer'){
    const gs=calcGoalscorerOdds(m.id);
    const name=pick.replace('gs_','');
    const p=gs.find(x=>x.name===name);
    return p?p.odds:5;
  }
  if(tab==='starting11'){
    const side=pick.startsWith('s11_h_')?'home':'away';
    const name=pick.replace('s11_h_','').replace('s11_a_','');
    const s11=calcStartingXIOdds(m.id,side);
    const p=s11.find(x=>x.name===name);
    return p?p.odds:3.5;
  }
  if(tab==='mvp'){
    const side=pick.startsWith('mvp_h_')?'home':'away';
    const name=pick.replace('mvp_h_','').replace('mvp_a_','');
    const mvp=calcMVPOdds(m.id,side);
    const p=mvp.find(x=>x.name===name);
    return p?p.odds:6;
  }
  return 1;
}

// ── BET PICK LABEL ─────────────────────────────────────────
export function betPickLabel(m,pick,tab){
  const h=T[m.home],a=T[m.away];
  if(tab==='match')return pick==='home'?h.name:pick==='draw'?'Draw':a.name;
  if(tab==='totals')return pick==='over'?'Over 2.5':'Under 2.5';
  if(tab==='btts')return pick==='btts_yes'?'BTTS Yes':'BTTS No';
  if(tab==='formation'){
    const form=pick==='form_home'?(state.previewFormations?.home||'4-3-3'):(state.previewFormations?.away||'4-3-3');
    return pick==='form_home'?`${h.name} ${form}`:`${a.name} ${form}`;
  }
  if(tab==='scorer')return pick.replace('gs_','')+ ' to score';
  if(tab==='starting11')return pick.replace('s11_h_','').replace('s11_a_','') + ' in Starting XI';
  if(tab==='mvp')return pick.replace('mvp_h_','').replace('mvp_a_','') + ' MVP';
  return pick;
}

// ── PICK OPTION ────────────────────────────────────────────
export function pickOpt(evt,mid,pick,el){
  if(evt&&evt.stopPropagation)evt.stopPropagation();
  const m=state.MS.find(x=>x.id===mid);
  if(!m||m.status==='settled')return;
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

// ── SELECT STAKE (click chips) ─────────────────────────────
export function selectStake(evt,mid,amount){
  if(evt&&evt.stopPropagation)evt.stopPropagation();
  const inp=document.getElementById(`bi-${mid}`);
  if(inp)inp.value=amount;
  const display=document.getElementById(`stake-display-${mid}`);
  if(display){display.textContent=`${amount} coins`;display.classList.add('stake-active');}
  // Highlight selected chip
  const container=evt.target.closest('.chip-buttons');
  if(container)container.querySelectorAll('.chip-btn').forEach(b=>b.classList.remove('sel'));
  evt.target.classList.add('sel');
  SFX.select();
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
  if(amt<10){SFX.error();_deps.toast('Select a bet amount first');return;}
  if(amt>state.ST.coins){SFX.error();shakeElement(document.getElementById('h-coins'));_deps.toast('Not enough coins!');return;}
  const tab=state.betTabs[mid]||'match';
  const ov=getOddsForPick(m,pick,tab);
  const lbl=betPickLabel(m,pick,tab);
  state.ST.coins-=amt;
  // Initialize bets array if needed (backwards compat)
  if(!Array.isArray(state.ST.bets[mid]))state.ST.bets[mid]=[];
  state.ST.bets[mid].push({type:tab,pick,amount:amt,odds:ov,status:'pending',payout:null,
                phase:m.phase,home:m.home,away:m.away,date:m.date});
  _deps.addXP(15);_deps.saveState();
  // Audio + visual feedback for bet placement
  SFX.betPlace();
  coinPopAnimation();
  const betBtn=evt?.target?.closest('.btn-bet');
  if(betBtn)animateElement(betBtn,'anim-pulse-gold',600);
  _deps.toast(`\u2705 ${amt} coins on ${lbl} @ ${ov}x`);
  delete state.picks[mid];
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
