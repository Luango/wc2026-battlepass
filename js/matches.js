// ═══════════════════════════════════════════════════════════
// MATCHES — Generation, simulation helpers, stats
// ═══════════════════════════════════════════════════════════
import { TEAMS, T } from './data/teams.js';
import { WC_VENUES, WC_REFS, WC_TIMES } from './data/phases.js';
import { genSquad, seededRand } from './data/squads.js';

export function genMatches() {
  const ms = []; let id = 1;
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const pairs = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
  function D(y,m,d) { return new Date(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T12:00:00Z`); }
  function dk(dt) { return dt.toISOString().slice(0,10); }
  function ds(dt) { const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return M[dt.getUTCMonth()]+' '+dt.getUTCDate(); }
  function addD(dt,n) { const d2=new Date(dt); d2.setUTCDate(d2.getUTCDate()+n); return d2; }

  const mdBase = [D(2026,6,11), D(2026,6,19), D(2026,6,29)];
  const koSlots = ['13:00','16:00','19:00','22:00','13:00','16:00'];
  groups.forEach((g,gi) => {
    const ts = TEAMS.filter(t => t.group === g);
    const off = Math.floor(gi / 3);
    pairs.forEach(([a,b], pi) => {
      const d = addD(mdBase[Math.floor(pi/2)], off);
      const ko = koSlots[(gi%3)*2+(pi%2)];
      ms.push({id:id++, home:ts[a].id, away:ts[b].id, phaseId:'group',
        phase:`Group ${g}`, date:ds(d), dateKey:dk(d), kickoff:ko,
        status:'pending', result:null, score:null});
    });
  });

  const r32 = [['FRA','USA'],['BRA','ENG'],['ARG','GER'],['ESP','POR'],
               ['BEL','ITA'],['NED','CRO'],['JPN','SEN'],['URU','MEX'],
               ['MAR','DEN'],['SRB','SUI'],['KOR','AUT'],['COL','TUR'],
               ['CAN','EGY'],['CZE','NGR'],['CIV','CHI'],['POL','AUS']];
  const r32ko = ['13:00','16:00','19:00','22:00','13:00','16:00','19:00','22:00'];
  r32.forEach(([h,a], i) => {
    const d = D(2026,7, i<8?4:5);
    ms.push({id:id++, home:h, away:a, phaseId:'r32', phase:'Round of 32',
      date:ds(d), dateKey:dk(d), kickoff:r32ko[i%8],
      status:'pending', result:null, score:null});
  });

  [[8,'13:00'],[8,'16:00'],[8,'19:00'],[8,'22:00'],[9,'13:00'],[9,'16:00'],[9,'19:00'],[9,'22:00']]
    .forEach(([day,ko]) => { const d=D(2026,7,day); ms.push({id:id++, home:'TBD', away:'TBD', phaseId:'r16',
      phase:'Round of 16', date:ds(d), dateKey:dk(d), kickoff:ko, status:'tbd', result:null, score:null}); });

  [[12,'18:00'],[12,'21:00'],[13,'18:00'],[13,'21:00']]
    .forEach(([day,ko]) => { const d=D(2026,7,day); ms.push({id:id++, home:'TBD', away:'TBD', phaseId:'qf',
      phase:'Quarter-Final', date:ds(d), dateKey:dk(d), kickoff:ko, status:'tbd', result:null, score:null}); });

  [[16,'20:00'],[17,'20:00']]
    .forEach(([day,ko]) => { const d=D(2026,7,day); ms.push({id:id++, home:'TBD', away:'TBD', phaseId:'sf',
      phase:'Semi-Final', date:ds(d), dateKey:dk(d), kickoff:ko, status:'tbd', result:null, score:null}); });

  const fd = D(2026,7,19);
  ms.push({id:id++, home:'TBD', away:'TBD', phaseId:'final', phase:'Final',
    date:ds(fd), dateKey:dk(fd), kickoff:'20:00', status:'tbd', result:null, score:null});

  return ms;
}

export function simResult(hs, as) {
  const t=hs+as, hp=(hs/t)*.78+.05, dp=.22, r=Math.random();
  return r<hp ? 'home' : r<hp+dp ? 'draw' : 'away';
}

export function simScore(res) {
  const h=Math.floor(Math.random()*3), a=Math.floor(Math.random()*3);
  if (res==='home') return [Math.max(h,a+1), Math.min(h,a)];
  if (res==='away') return [Math.min(h,a), Math.max(h,a+1)];
  const s=Math.floor(Math.random()*3); return [s,s];
}

export function simMatchStats(m, score) {
  const hTeam=T[m.home], aTeam=T[m.away];
  if (!hTeam||!aTeam) return null;
  const hSquad=genSquad(m.home), aSquad=genSquad(m.away);
  const rng=seededRand(m.id*31337+13);

  const tot=hTeam.str+aTeam.str;
  const hPoss=Math.min(72, Math.max(28, Math.round(38+(hTeam.str/tot)*24+rng()*10-5)));
  const aPoss=100-hPoss;

  const hShots=Math.max(score[0], Math.round(7+score[0]*2.2+rng()*6));
  const aShots=Math.max(score[1], Math.round(7+score[1]*2.2+rng()*6));
  const hSOT=Math.min(hShots, Math.max(score[0], score[0]+Math.floor(rng()*4)+1));
  const aSOT=Math.min(aShots, Math.max(score[1], score[1]+Math.floor(rng()*4)+1));

  const hCorners=Math.round(2+rng()*8);
  const aCorners=Math.round(2+rng()*8);
  const hFouls=Math.round(8+rng()*9);
  const aFouls=Math.round(8+rng()*9);
  const hOffsides=Math.floor(rng()*5);
  const aOffsides=Math.floor(rng()*5);

  function pickScorer(squad) {
    const pool=[];
    squad.forEach(pl => {
      const w = pl.p==='FWD'?5 : pl.p==='MID'?2 : pl.p==='DEF'?1 : 0;
      for (let j=0; j<w; j++) pool.push(pl);
    });
    return pool[Math.floor(rng()*pool.length)] || squad[0];
  }
  const goals=[];
  for (let i=0; i<score[0]; i++) {
    const pl=pickScorer(hSquad);
    goals.push({team:'home', player:pl.n, minute:Math.floor(rng()*89)+1, type:rng()<0.13?'penalty':'goal'});
  }
  for (let i=0; i<score[1]; i++) {
    const pl=pickScorer(aSquad);
    goals.push({team:'away', player:pl.n, minute:Math.floor(rng()*89)+1, type:rng()<0.13?'penalty':'goal'});
  }
  goals.sort((a,b) => a.minute-b.minute);

  const yellowCards=[];
  const totalYC=2+Math.floor(rng()*4);
  for (let i=0; i<totalYC; i++) {
    const isH=rng()<0.5;
    const sq=isH?hSquad:aSquad;
    const pl=sq[Math.floor(rng()*sq.length)];
    yellowCards.push({team:isH?'home':'away', player:pl.n, minute:Math.floor(rng()*88)+1});
  }
  yellowCards.sort((a,b) => a.minute-b.minute);

  const redCards=[];
  if (rng()<0.10) {
    const isH=rng()<0.5;
    const sq=isH?hSquad:aSquad;
    const pl=sq[Math.floor(rng()*sq.length)];
    redCards.push({team:isH?'home':'away', player:pl.n, minute:Math.floor(rng()*55)+30});
  }

  const v=WC_VENUES[m.id%WC_VENUES.length];
  const attendance=Math.round(v.cap*(0.87+rng()*0.13));
  const referee=WC_REFS[m.id%WC_REFS.length];
  const kickoff=m.kickoff || WC_TIMES[m.id%WC_TIMES.length];

  return {
    possession:{home:hPoss, away:aPoss},
    shots:{home:hShots, away:aShots},
    shotsOnTarget:{home:hSOT, away:aSOT},
    corners:{home:hCorners, away:aCorners},
    fouls:{home:hFouls, away:aFouls},
    offsides:{home:hOffsides, away:aOffsides},
    goals, yellowCards, redCards,
    venue:`${v.name}, ${v.city}`,
    attendance, referee, kickoff,
  };
}
