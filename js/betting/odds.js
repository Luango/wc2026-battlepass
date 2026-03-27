// ═══════════════════════════════════════════════════════════
// BETTING ODDS — All odds calculation functions
// ═══════════════════════════════════════════════════════════
import { state } from '../state.js?v=9';
import { T } from '../data/teams.js?v=9';
import { genSquad } from '../data/squads.js?v=9';

export function calcOdds(hs,as){
  const tot=hs+as,hp=(hs/tot)*.82+.07,ap=(as/tot)*.82+.07;
  const dp=Math.max(.05,1-hp-ap),e=.88;
  return{home:+(Math.max(1.05,1/(hp*e)).toFixed(2)),
         draw:+(Math.max(2.2,1/(dp*e)).toFixed(2)),
         away:+(Math.max(1.05,1/(ap*e)).toFixed(2))};
}

// ── EXTENDED BETTING ODDS ────────────────────────────────
export function calcSpreadLine(hs,as){
  const d=Math.abs(hs-as);
  if(d>25)return 2.5;if(d>12)return 1.5;return 0.5;
}
export function calcSpreadOdds(hs,as){
  const line=calcSpreadLine(hs,as);
  const tot=hs+as,hp=(hs/tot)*.82+.07;
  const coverP=Math.max(.1,Math.min(.9,hp-(line-.5)*.18));
  const e=.88;
  return{homeLine:-line,awayLine:+line,
    home:+(Math.max(1.15,1/(coverP*e)).toFixed(2)),
    away:+(Math.max(1.15,1/((1-coverP)*e)).toFixed(2))};
}
export function calcTotalOdds(hs,as){
  const avg=(hs+as)/2;
  const overP=Math.max(.15,Math.min(.85,.35+(avg-70)*.008));
  const e=.88;
  return{line:2.5,
    over:+(Math.max(1.15,1/(overP*e)).toFixed(2)),
    under:+(Math.max(1.15,1/((1-overP)*e)).toFixed(2))};
}
export function calcBttsOdds(hs,as){
  const avg=(hs+as)/2,diff=Math.abs(hs-as);
  const yP=Math.max(.15,Math.min(.8,.45+(avg-70)*.005-diff*.005));
  const e=.88;
  return{yes:+(Math.max(1.25,1/(yP*e)).toFixed(2)),
         no:+(Math.max(1.25,1/((1-yP)*e)).toFixed(2))};
}
export function calcDoubleChanceOdds(hs,as){
  const tot=hs+as,hp=(hs/tot)*.82+.07,ap=(as/tot)*.82+.07;
  const dp=Math.max(.05,1-hp-ap),e=.88;
  return{home_draw:+(Math.max(1.02,1/((hp+dp)*e)).toFixed(2)),
         away_draw:+(Math.max(1.02,1/((ap+dp)*e)).toFixed(2)),
         home_away:+(Math.max(1.02,1/((hp+ap)*e)).toFixed(2))};
}
export function calcDrawNoBetOdds(hs,as){
  const tot=hs+as,hp=(hs/tot)*.82+.07,ap=(as/tot)*.82+.07;
  const hNd=hp/(hp+ap),e=.90;
  return{home:+(Math.max(1.05,1/(hNd*e)).toFixed(2)),
         away:+(Math.max(1.05,1/((1-hNd)*e)).toFixed(2))};
}
export function _poisson(k,lam){
  let f=1;for(let i=2;i<=k;i++)f*=i;
  return Math.exp(-lam)*Math.pow(lam,k)/f;
}
export function calcExactScoreOdds(hs,as){
  const tot=hs+as,hStr=hs/tot;
  const hExp=.5+hStr*1.5,aExp=.5+(1-hStr)*1.5;
  const scores=[];
  for(let h=0;h<=4;h++)for(let a=0;a<=4;a++){
    if(h+a>6)continue;
    const p=_poisson(h,hExp)*_poisson(a,aExp);
    if(p>.003)scores.push({h,a,odds:+(Math.max(3,1/(p*.85)).toFixed(1))});
  }
  return scores.sort((a,b)=>a.odds-b.odds).slice(0,12);
}
// ── FORMATION BET ────────────────────────────────────────
// Player bets which team's formation (from the draft board) performs better
import { FORMATION_PROFILE } from '../data/formations.js?v=9';
export function calcFormationOdds(hs,as,hForm,aForm){
  const hProf=FORMATION_PROFILE[hForm]||{atk:0,mid:0,def:0};
  const aProf=FORMATION_PROFILE[aForm]||{atk:0,mid:0,def:0};
  // Each formation has atk/mid/def bonuses — combine with team strength
  const hScore=hs + hProf.atk*2 + hProf.mid*1.5 + hProf.def*1;
  const aScore=as + aProf.atk*2 + aProf.mid*1.5 + aProf.def*1;
  const tot=hScore+aScore;
  const hP=hScore/tot, aP=aScore/tot;
  const e=0.88;
  return{
    home:+(Math.max(1.15,1/(hP*e)).toFixed(2)),
    away:+(Math.max(1.15,1/(aP*e)).toFixed(2)),
    homeForm:hForm, awayForm:aForm
  };
}

export function calcGoalscorerOdds(mid){
  const m=state.MS.find(x=>x.id===mid);if(!m)return[];
  const hSq=genSquad(m.home),aSq=genSquad(m.away);
  const out=[];
  const addPlayers=(sq,tid)=>{
    sq.forEach(pl=>{
      if(pl.p==='GK')return;
      let base;
      if(pl.p==='FWD')base=2.0+(100-pl.r)*.08;
      else if(pl.p==='MID')base=3.5+(100-pl.r)*.1;
      else base=8.0+(100-pl.r)*.15;
      out.push({name:pl.n,team:tid,pos:pl.p,odds:+base.toFixed(2)});
    });
  };
  addPlayers(hSq,m.home);addPlayers(aSq,m.away);
  return out.sort((a,b)=>a.odds-b.odds);
}

// ── STARTING XI BET ──────────────────────────────────────────
// Odds for each player to be in the starting 11
export function calcStartingXIOdds(mid,side){
  const m=state.MS.find(x=>x.id===mid);if(!m)return[];
  const tid=side==='home'?m.home:m.away;
  const sq=genSquad(tid);
  // First 11 are typically starters; higher rating = more likely starter
  return sq.map((pl,idx)=>{
    const starterChance=(100-idx*2.5)/100;
    const odds=Math.max(1.15,1/(Math.min(.95,pl.r/100*0.8+0.15))).toFixed(2);
    return{name:pl.n,rating:pl.r,pos:pl.p,odds:+odds,idx};
  }).sort((a,b)=>+a.odds-+b.odds);
}

// ── MVP BET ──────────────────────────────────────────────────
// Odds for each player to be MVP (player of the match)
export function calcMVPOdds(mid,side){
  const m=state.MS.find(x=>x.id===mid);if(!m)return[];
  const tid=side==='home'?m.home:m.away;
  const sq=genSquad(tid);
  // Field players only; higher rating = better MVP odds
  return sq.filter(pl=>pl.p!=='GK').map(pl=>{
    const baseOdds=pl.p==='FWD'?1.5:pl.p==='MID'?2.5:4.5;
    const odds=Math.max(1.2,(baseOdds+(100-pl.r)*.008)).toFixed(2);
    return{name:pl.n,rating:pl.r,pos:pl.p,odds:+odds};
  }).sort((a,b)=>+a.odds-+b.odds);
}
