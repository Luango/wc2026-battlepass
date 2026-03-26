// ═══════════════════════════════════════════════════════════
// BET SETTLEMENT — Resolve bet outcomes
// ═══════════════════════════════════════════════════════════
import { calcSpreadLine } from './odds.js';
import { T } from '../data/teams.js';

export function resolveBet(bet,m,res,score,stats){
  const type=bet.type||'match';
  const ov=bet.odds;
  const hg=score[0],ag=score[1],total=hg+ag;

  // Match Result (3-way moneyline)
  if(type==='match'){
    return bet.pick===res?'won':'lost';
  }
  // Spread / Goal Line
  if(type==='spread'){
    const h=T[m.home],a=T[m.away];
    const line=calcSpreadLine(h.str,a.str);
    if(bet.pick==='home_spread')return(hg-ag)>line?'won':'lost';
    return(ag-hg+line)>0?'won':'lost';
  }
  // Totals Over/Under
  if(type==='totals'){
    if(bet.pick==='over')return total>=3?'won':'lost';
    return total<=2?'won':'lost';
  }
  // Both Teams to Score
  if(type==='btts'){
    const both=hg>0&&ag>0;
    if(bet.pick==='btts_yes')return both?'won':'lost';
    return!both?'won':'lost';
  }
  // Double Chance
  if(type==='double'){
    if(bet.pick==='home_draw')return(res==='home'||res==='draw')?'won':'lost';
    if(bet.pick==='away_draw')return(res==='away'||res==='draw')?'won':'lost';
    if(bet.pick==='home_away')return(res==='home'||res==='away')?'won':'lost';
  }
  // Draw No Bet
  if(type==='dnb'){
    if(res==='draw')return'push';
    if(bet.pick==='dnb_home')return res==='home'?'won':'lost';
    return res==='away'?'won':'lost';
  }
  // Exact Score
  if(type==='exact'){
    const parts=bet.pick.replace('es_','').split('_');
    return(hg===+parts[0]&&ag===+parts[1])?'won':'lost';
  }
  // Anytime Goalscorer
  if(type==='scorer'){
    const name=bet.pick.replace('gs_','');
    const scored=stats.goals.some(g=>g.player===name);
    return scored?'won':'lost';
  }
  return'lost';
}
