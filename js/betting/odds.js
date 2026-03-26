// ═══════════════════════════════════════════════════════════
// BETTING ODDS — All odds calculation functions
// ═══════════════════════════════════════════════════════════
import { state } from '../state.js';
import { T } from '../data/teams.js';
import { genSquad } from '../data/squads.js';

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
