import { T } from './teams.js';

export const SQUADS={
  FRA:[
    {n:'Maignan',   p:'GK', r:87,a:29,num:1},
    {n:'T.Hern\u00e1ndez',p:'DEF',r:85,a:26,num:22},
    {n:'Saliba',    p:'DEF',r:86,a:24,num:12},
    {n:'Upamecano', p:'DEF',r:84,a:26,num:4},
    {n:'Kound\u00e9',    p:'DEF',r:84,a:26,num:5},
    {n:'Tchouam\u00e9ni',p:'MID',r:84,a:25,num:8},
    {n:'Camavinga', p:'MID',r:84,a:22,num:14},
    {n:'Griezmann', p:'MID',r:83,a:34,num:7},
    {n:'Mbapp\u00e9',    p:'FWD',r:94,a:27,num:10},
    {n:'Thuram',    p:'FWD',r:80,a:27,num:9},
    {n:'Demb\u00e9l\u00e9',   p:'FWD',r:82,a:28,num:11},
    {n:'Maatsen',   p:'DEF',r:78,a:23,num:3},
    {n:'Fofana',    p:'MID',r:80,a:25,num:6},
    {n:'Coman',     p:'FWD',r:80,a:29,num:20},
  ],
  BRA:[
    {n:'Alisson',   p:'GK', r:89,a:32,num:1},
    {n:'Danilo',    p:'DEF',r:80,a:34,num:2},
    {n:'Marquinhos',p:'DEF',r:85,a:31,num:4},
    {n:'G.Magalh\u00e3es',p:'DEF',r:82,a:27,num:3},
    {n:'Guilherme', p:'DEF',r:78,a:28,num:6},
    {n:'B.Guimar\u00e3es',p:'MID',r:85,a:27,num:5},
    {n:'Paquet\u00e1',   p:'MID',r:83,a:27,num:10},
    {n:'Rodrygo',   p:'MID',r:86,a:24,num:11},
    {n:'Vin\u00edcius Jr.',p:'FWD',r:92,a:24,num:7},
    {n:'Endrick',   p:'FWD',r:79,a:19,num:9},
    {n:'Richarlison',p:'FWD',r:80,a:27,num:21},
    {n:'Milit\u00e3o',   p:'DEF',r:84,a:27,num:14},
    {n:'Gerson',    p:'MID',r:79,a:28,num:8},
    {n:'Savinho',   p:'FWD',r:80,a:21,num:17},
  ],
  ARG:[
    {n:'E.Mart\u00ednez', p:'GK', r:88,a:32,num:23},
    {n:'Molina',     p:'DEF',r:80,a:27,num:26},
    {n:'Romero',     p:'DEF',r:84,a:27,num:13},
    {n:'L.Mart\u00ednez', p:'DEF',r:82,a:27,num:25},
    {n:'Tagliafico', p:'DEF',r:78,a:32,num:3},
    {n:'De Paul',    p:'MID',r:82,a:31,num:7},
    {n:'E.Fern\u00e1ndez',p:'MID',r:82,a:24,num:24},
    {n:'Mac Allister',p:'MID',r:82,a:26,num:20},
    {n:'Messi',      p:'FWD',r:92,a:38,num:10},
    {n:'J.\u00c1lvarez',  p:'FWD',r:81,a:25,num:9},
    {n:'Di Mar\u00eda',   p:'FWD',r:80,a:38,num:11},
    {n:'Dybala',     p:'FWD',r:80,a:31,num:21},
    {n:'Lo Celso',   p:'MID',r:78,a:29,num:5},
    {n:'Lisandro',   p:'DEF',r:83,a:27,num:14},
  ],
  ESP:[
    {n:'U.Sim\u00f3n',    p:'GK', r:84,a:28,num:1},
    {n:'Carvajal',   p:'DEF',r:82,a:33,num:2},
    {n:'Le Normand', p:'DEF',r:82,a:28,num:6},
    {n:'Laporte',    p:'DEF',r:82,a:32,num:14},
    {n:'Cucurella',  p:'DEF',r:79,a:26,num:24},
    {n:'Pedri',      p:'MID',r:87,a:23,num:26},
    {n:'Gavi',       p:'MID',r:84,a:21,num:9},
    {n:'F.Ruiz',     p:'MID',r:81,a:28,num:8},
    {n:'Yamal',      p:'FWD',r:88,a:18,num:19},
    {n:'Morata',     p:'FWD',r:78,a:32,num:7},
    {n:'N.Williams', p:'FWD',r:82,a:22,num:11},
    {n:'Olmo',       p:'MID',r:83,a:27,num:10},
    {n:'Merino',     p:'MID',r:80,a:28,num:22},
    {n:'Torres',     p:'FWD',r:79,a:25,num:18},
  ],
  GER:[
    {n:'ter Stegen',  p:'GK', r:85,a:33,num:22},
    {n:'Kimmich',     p:'DEF',r:86,a:30,num:6},
    {n:'R\u00fcdiger',     p:'DEF',r:84,a:32,num:2},
    {n:'Tah',         p:'DEF',r:80,a:29,num:4},
    {n:'Raum',        p:'DEF',r:79,a:27,num:20},
    {n:'G\u00fcndogan',    p:'MID',r:83,a:34,num:21},
    {n:'Wirtz',       p:'MID',r:87,a:22,num:10},
    {n:'Kroos',       p:'MID',r:86,a:35,num:8},
    {n:'Musiala',     p:'FWD',r:87,a:22,num:14},
    {n:'Havertz',     p:'FWD',r:82,a:26,num:7},
    {n:'Gnabry',      p:'FWD',r:81,a:30,num:10},
    {n:'Schlotterbeck',p:'DEF',r:80,a:28,num:3},
    {n:'Andrich',     p:'MID',r:78,a:30,num:23},
    {n:'F\u00fcllkrug',    p:'FWD',r:80,a:32,num:9},
  ],
  ENG:[
    {n:'Raya',       p:'GK', r:83,a:30,num:22},
    {n:'Trippier',   p:'DEF',r:80,a:34,num:12},
    {n:'Stones',     p:'DEF',r:82,a:31,num:5},
    {n:'Gu\u00e9hi',      p:'DEF',r:80,a:24,num:6},
    {n:'Trent A-A',  p:'DEF',r:85,a:27,num:66},
    {n:'Rice',       p:'MID',r:84,a:26,num:4},
    {n:'Bellingham', p:'MID',r:90,a:22,num:22},
    {n:'Saka',       p:'FWD',r:86,a:23,num:7},
    {n:'Foden',      p:'FWD',r:87,a:25,num:11},
    {n:'Kane',       p:'FWD',r:87,a:32,num:9},
    {n:'Palmer',     p:'FWD',r:85,a:23,num:20},
    {n:'Mainoo',     p:'MID',r:80,a:20,num:26},
    {n:'Walker',     p:'DEF',r:80,a:35,num:2},
    {n:'Rashford',   p:'FWD',r:80,a:28,num:11},
  ],
  POR:[
    {n:'D.Costa',    p:'GK', r:84,a:35,num:1},
    {n:'Cancelo',    p:'DEF',r:82,a:31,num:20},
    {n:'R.Dias',     p:'DEF',r:86,a:28,num:6},
    {n:'A.Silva',    p:'DEF',r:81,a:26,num:4},
    {n:'N.Mendes',   p:'DEF',r:82,a:23,num:19},
    {n:'B.Fernandes',p:'MID',r:85,a:30,num:8},
    {n:'Vitinha',    p:'MID',r:82,a:25,num:16},
    {n:'Neves',      p:'MID',r:81,a:28,num:15},
    {n:'Ronaldo',    p:'FWD',r:87,a:41,num:7},
    {n:'Le\u00e3o',       p:'FWD',r:85,a:26,num:11},
    {n:'Jota',       p:'FWD',r:81,a:28,num:17},
    {n:'W.Carvalho', p:'MID',r:78,a:33,num:14},
    {n:'Trinc\u00e3o',    p:'FWD',r:79,a:25,num:17},
    {n:'Concei\u00e7\u00e3o',  p:'FWD',r:81,a:22,num:10},
  ],
  NED:[
    {n:'Flekken',    p:'GK', r:79,a:31,num:1},
    {n:'Dumfries',   p:'DEF',r:81,a:29,num:2},
    {n:'van Dijk',   p:'DEF',r:86,a:34,num:4},
    {n:'de Vrij',    p:'DEF',r:82,a:33,num:6},
    {n:'T.Timber',   p:'DEF',r:82,a:23,num:12},
    {n:'F.de Jong',  p:'MID',r:86,a:28,num:21},
    {n:'X.Simons',   p:'MID',r:84,a:22,num:7},
    {n:'Reijnders',  p:'MID',r:82,a:26,num:14},
    {n:'Gakpo',      p:'FWD',r:83,a:26,num:11},
    {n:'Depay',      p:'FWD',r:80,a:31,num:10},
    {n:'Bergwijn',   p:'FWD',r:78,a:27,num:7},
    {n:'Blind',      p:'DEF',r:78,a:35,num:17},
    {n:'de Roon',    p:'MID',r:79,a:33,num:15},
    {n:'Zirkzee',    p:'FWD',r:81,a:24,num:9},
  ],
};

// ── GENERATED SQUADS ───────────────────────────────────────
// Name pattern banks per region
export const NAME_BANKS={
  SA:['Carlos','Luis','Juan','Diego','Andr\u00e9s','Mateo','Sebasti\u00e1n','Gabriel','Nicol\u00e1s','Rodolfo',
      'L\u00f3pez','Garc\u00eda','Mart\u00ednez','Rodr\u00edguez','S\u00e1nchez','Torres','G\u00f3mez','Flores','Rivera','Castro'],
  AF:['Sadio','Karim','Youssef','Omar','Ibrahim','Moussa','Cheikh','Abdou','Naby','Isma\u00ebl',
      'Diallo','Tour\u00e9','Kon\u00e9','Bamba','Traor\u00e9','Coulibaly','Camara','Keita','Kouyat\u00e9','N\'Gom'],
  EA:['Takumi','Hiroki','Daichi','Kaoru','Ritsu','Wataru','Shoya','Junya','Sho','Yuya',
      'Nagatomo','Yoshida','Endo','Doan','Minamino','Kamada','Furuhashi','Maeda','Ito','Suzuki'],
  ME:['Mohammed','Ahmad','Ali','Saleh','Faisal','Hassan','Khalid','Abdullah','Omar','Yasser',
      'Al-Dawsari','Al-Abed','Al-Shahrani','Al-Burayk','Al-Faraj','Al-Mowalad','Al-Ghannam','Al-Najei'],
  EU:['Aleksandar','Milos','Nikola','Stefan','Filip','Dusan','Sergej','Nemanja','Luka','Ivan',
      'Jovic','Mitrovic','Tadic','Milinkovic','Vlahovic','Lazovic','Lukic','Pavlovic','Racic','Grujic'],
  CC:['Alphonso','Jonathan','Tajon','Mark-Anthony','Cyle','Scott','Doneil','Alistair','Samuel','Richie',
      'Davies','David','Buchanan','Kaye','Larin','Kennedy','Henry','Johnston','Hoilett','Millar'],
};
export function regionForTeam(id){
  const sa=['COL','ECU','URU','PAR','CHI'];
  const af=['MAR','SEN','CMR','NGR','GHA','CIV','EGY','ALG','TUN'];
  const ea=['JPN','KOR','AUS'];
  const me=['SAU','IRN','QAT','UAE'];
  const cc=['MEX','CAN','USA','CRI','JAM','PAN'];
  if(sa.includes(id))return'SA';
  if(af.includes(id))return'AF';
  if(ea.includes(id))return'EA';
  if(me.includes(id))return'ME';
  if(cc.includes(id))return'CC';
  return'EU';
}
export function seededRand(seed){
  let s=seed;
  return function(){s=(s*16807+0)%2147483647;return(s-1)/2147483646;};
}
export function getPlayerStats(pl) {
  const r = pl.r;
  let seed = 0;
  for (let i = 0; i < pl.n.length; i++) seed = (seed * 31 + pl.n.charCodeAt(i)) & 0x7fffffff;
  const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const profiles = {
    GK:  { att:-42, tec:-15, sta:4,  def:10, pow:6,  spd:-22 },
    DEF: { att:-14, tec:-5,  sta:7,  def:14, pow:8,  spd:-2  },
    MID: { att:2,   tec:8,   sta:6,  def:0,  pow:-2, spd:2   },
    FWD: { att:14,  tec:8,   sta:-4, def:-16,pow:0,  spd:10  },
  };
  const p = profiles[pl.p] || profiles.MID;
  const c = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const s = (off) => c(Math.round(r * 0.86 + off + (rng() - 0.48) * 12), 25, 99);

  const hRanges = { GK:[181,198], DEF:[176,193], MID:[169,186], FWD:[168,190] };
  const hR = hRanges[pl.p] || [170,188];
  return {
    att: s(p.att), tec: s(p.tec), sta: s(p.sta),
    def: s(p.def), pow: s(p.pow), spd: s(p.spd),
    height: Math.round(hR[0] + rng() * (hR[1] - hR[0])),
    foot: rng() > 0.72 ? 'L' : 'R',
  };
}

export function genSquad(teamId){
  if(SQUADS[teamId])return SQUADS[teamId];
  const team=T[teamId];
  if(!team)return[];
  const rng=seededRand(teamId.split('').reduce((a,c)=>a+c.charCodeAt(0),0)*7919);
  const region=regionForTeam(teamId);
  const bank=NAME_BANKS[region]||NAME_BANKS.EU;
  const splitAt=Math.max(1,Math.floor(bank.length/2));
  const firstPool=bank.slice(0,splitAt);
  const lastPool=bank.slice(splitAt).length?bank.slice(splitAt):bank.slice(0,splitAt);
  const baseR=Math.round(team.str*0.88);
  const positions=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','MID','FWD','FWD','FWD','DEF','MID'];
  const squad=[];
  const usedNames=new Set();
  for(let i=0;i<14;i++){
    const fname=firstPool[Math.floor(rng()*firstPool.length)]||`P${i+1}`;
    let sname='';
    let attempts=0;
    while(attempts<50){
      const si=Math.floor(rng()*lastPool.length);
      const candidate=lastPool[si]||lastPool[0]||'Player';
      if(!usedNames.has(candidate)){sname=candidate;break;}
      attempts++;
    }
    // Prevent dead loop when surname pool is smaller than squad size.
    if(!sname){
      const base=lastPool[i%Math.max(1,lastPool.length)]||'Player';
      let suffix=2;
      sname=`${base}-${suffix}`;
      while(usedNames.has(sname)&&suffix<99){
        suffix++;
        sname=`${base}-${suffix}`;
      }
    }
    usedNames.add(sname);
    const pos=positions[i];
    const variation=Math.round((rng()-0.4)*12);
    const r=Math.max(60,Math.min(92,baseR+variation));
    const age=20+Math.floor(rng()*15);
    const shirtnums=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26];
    const num=shirtnums[i]||i+1;
    const displayName=i<6?sname:`${fname} ${sname}`;
    squad.push({n:displayName,p:pos,r,a:age,num});
  }
  squad[0].num=1;
  return squad;
}
