// ── TEAMS ──────────────────────────────────────────────────
export const TEAMS=[
  {id:'FRA',name:'France',     flag:'\u{1F1EB}\u{1F1F7}',str:92,group:'A'},
  {id:'MAR',name:'Morocco',    flag:'\u{1F1F2}\u{1F1E6}',str:82,group:'A'},
  {id:'COL',name:'Colombia',   flag:'\u{1F1E8}\u{1F1F4}',str:79,group:'A'},
  {id:'NZL',name:'New Zealand',flag:'\u{1F1F3}\u{1F1FF}',str:58,group:'A'},
  {id:'BRA',name:'Brazil',     flag:'\u{1F1E7}\u{1F1F7}',str:91,group:'B'},
  {id:'SRB',name:'Serbia',     flag:'\u{1F1F7}\u{1F1F8}',str:76,group:'B'},
  {id:'CRI',name:'Costa Rica', flag:'\u{1F1E8}\u{1F1F7}',str:63,group:'B'},
  {id:'IRN',name:'Iran',       flag:'\u{1F1EE}\u{1F1F7}',str:67,group:'B'},
  {id:'ARG',name:'Argentina',  flag:'\u{1F1E6}\u{1F1F7}',str:93,group:'C'},
  {id:'NED',name:'Netherlands',flag:'\u{1F1F3}\u{1F1F1}',str:86,group:'C'},
  {id:'ECU',name:'Ecuador',    flag:'\u{1F1EA}\u{1F1E8}',str:71,group:'C'},
  {id:'CMR',name:'Cameroon',   flag:'\u{1F1E8}\u{1F1F2}',str:68,group:'C'},
  {id:'ENG',name:'England',    flag:'\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',str:88,group:'D'},
  {id:'USA',name:'USA',        flag:'\u{1F1FA}\u{1F1F8}',str:79,group:'D'},
  {id:'SEN',name:'Senegal',    flag:'\u{1F1F8}\u{1F1F3}',str:80,group:'D'},
  {id:'POL',name:'Poland',     flag:'\u{1F1F5}\u{1F1F1}',str:73,group:'D'},
  {id:'ESP',name:'Spain',      flag:'\u{1F1EA}\u{1F1F8}',str:90,group:'E'},
  {id:'JPN',name:'Japan',      flag:'\u{1F1EF}\u{1F1F5}',str:82,group:'E'},
  {id:'URU',name:'Uruguay',    flag:'\u{1F1FA}\u{1F1FE}',str:80,group:'E'},
  {id:'ALG',name:'Algeria',    flag:'\u{1F1E9}\u{1F1FF}',str:71,group:'E'},
  {id:'GER',name:'Germany',    flag:'\u{1F1E9}\u{1F1EA}',str:87,group:'F'},
  {id:'CAN',name:'Canada',     flag:'\u{1F1E8}\u{1F1E6}',str:77,group:'F'},
  {id:'KOR',name:'South Korea',flag:'\u{1F1F0}\u{1F1F7}',str:79,group:'F'},
  {id:'TUN',name:'Tunisia',    flag:'\u{1F1F9}\u{1F1F3}',str:69,group:'F'},
  {id:'POR',name:'Portugal',   flag:'\u{1F1F5}\u{1F1F9}',str:88,group:'G'},
  {id:'MEX',name:'Mexico',     flag:'\u{1F1F2}\u{1F1FD}',str:76,group:'G'},
  {id:'AUS',name:'Australia',  flag:'\u{1F1E6}\u{1F1FA}',str:72,group:'G'},
  {id:'GHA',name:'Ghana',      flag:'\u{1F1EC}\u{1F1ED}',str:70,group:'G'},
  {id:'BEL',name:'Belgium',    flag:'\u{1F1E7}\u{1F1EA}',str:83,group:'H'},
  {id:'CRO',name:'Croatia',    flag:'\u{1F1ED}\u{1F1F7}',str:82,group:'H'},
  {id:'NGR',name:'Nigeria',    flag:'\u{1F1F3}\u{1F1EC}',str:75,group:'H'},
  {id:'QAT',name:'Qatar',      flag:'\u{1F1F6}\u{1F1E6}',str:60,group:'H'},
  {id:'ITA',name:'Italy',      flag:'\u{1F1EE}\u{1F1F9}',str:84,group:'I'},
  {id:'SAU',name:'Saudi Arabia',flag:'\u{1F1F8}\u{1F1E6}',str:68,group:'I'},
  {id:'DEN',name:'Denmark',    flag:'\u{1F1E9}\u{1F1F0}',str:83,group:'I'},
  {id:'CIV',name:'Ivory Coast',flag:'\u{1F1E8}\u{1F1EE}',str:74,group:'I'},
  {id:'SUI',name:'Switzerland',flag:'\u{1F1E8}\u{1F1ED}',str:80,group:'J'},
  {id:'CHI',name:'Chile',      flag:'\u{1F1E8}\u{1F1F1}',str:72,group:'J'},
  {id:'TUR',name:'Turkey',     flag:'\u{1F1F9}\u{1F1F7}',str:78,group:'J'},
  {id:'UZB',name:'Uzbekistan', flag:'\u{1F1FA}\u{1F1FF}',str:62,group:'J'},
  {id:'AUT',name:'Austria',    flag:'\u{1F1E6}\u{1F1F9}',str:78,group:'K'},
  {id:'EGY',name:'Egypt',      flag:'\u{1F1EA}\u{1F1EC}',str:71,group:'K'},
  {id:'PAR',name:'Paraguay',   flag:'\u{1F1F5}\u{1F1FE}',str:69,group:'K'},
  {id:'UAE',name:'UAE',        flag:'\u{1F1E6}\u{1F1EA}',str:61,group:'K'},
  {id:'CZE',name:'Czech Rep',  flag:'\u{1F1E8}\u{1F1FF}',str:76,group:'L'},
  {id:'JAM',name:'Jamaica',    flag:'\u{1F1EF}\u{1F1F2}',str:64,group:'L'},
  {id:'PAN',name:'Panama',     flag:'\u{1F1F5}\u{1F1E6}',str:66,group:'L'},
  {id:'UKR',name:'Ukraine',    flag:'\u{1F1FA}\u{1F1E6}',str:75,group:'L'},
];
export const T={};TEAMS.forEach(t=>T[t.id]=t);

// ── FLAG / AVATAR HELPERS ──────────────────────────────────
export const FLAG_CC={
  FRA:'fr',MAR:'ma',COL:'co',NZL:'nz',BRA:'br',SRB:'rs',CRI:'cr',IRN:'ir',
  ARG:'ar',NED:'nl',ECU:'ec',CMR:'cm',ENG:'gb-eng',USA:'us',SEN:'sn',POL:'pl',
  ESP:'es',JPN:'jp',URU:'uy',ALG:'dz',GER:'de',CAN:'ca',KOR:'kr',TUN:'tn',
  POR:'pt',MEX:'mx',AUS:'au',GHA:'gh',BEL:'be',CRO:'hr',NGR:'ng',QAT:'qa',
  ITA:'it',SAU:'sa',DEN:'dk',CIV:'ci',SUI:'ch',CHI:'cl',TUR:'tr',UZB:'uz',
  AUT:'at',EGY:'eg',PAR:'py',UAE:'ae',CZE:'cz',JAM:'jm',PAN:'pa',UKR:'ua',
};
export function flagImg(tid,cls='flag-img'){
  const cc=FLAG_CC[tid];
  if(!cc)return`<span style="font-size:18px;flex-shrink:0">${T[tid]?.flag||''}</span>`;
  return`<img class="${cls}" src="https://flagcdn.com/w40/${cc}.png" alt="${tid}" loading="lazy" onerror="this.style.opacity=.25">`;
}
// Wikipedia article titles for real named players
export const WIKI_MAP={
  // France
  'Maignan':'Mike_Maignan','T.Hern\u00e1ndez':'Theo_Hern\u00e1ndez','Saliba':'William_Saliba',
  'Upamecano':'Dayot_Upamecano','Kound\u00e9':'Jules_Kound\u00e9','Tchouam\u00e9ni':'Aur\u00e9lien_Tchouam\u00e9ni',
  'Camavinga':'Eduardo_Camavinga','Griezmann':'Antoine_Griezmann','Mbapp\u00e9':'Kylian_Mbapp\u00e9',
  'Thuram':'Marcus_Thuram','Demb\u00e9l\u00e9':'Ousmane_Demb\u00e9l\u00e9','Maatsen':'Ian_Maatsen',
  'Fofana':'Youssouf_Fofana','Coman':'Kingsley_Coman',
  // Brazil
  'Alisson':'Alisson_Becker','Danilo':'Danilo_(footballer,_born_1991)',
  'Marquinhos':'Marquinhos_(footballer)','G.Magalh\u00e3es':'Gabriel_Magalh\u00e3es',
  'B.Guimar\u00e3es':'Bruno_Guimar\u00e3es','Paquet\u00e1':'Lucas_Paquet\u00e1','Rodrygo':'Rodrygo',
  'Vin\u00edcius Jr.':'Vin\u00edcius_J\u00fanior','Endrick':'Endrick_(footballer)',
  'Richarlison':'Richarlison','Milit\u00e3o':'\u00c9der_Milit\u00e3o','Savinho':'S\u00e1vio_(footballer,_born_2004)',
  // Argentina
  'E.Mart\u00ednez':'Emiliano_Mart\u00ednez_(goalkeeper)','Molina':'Nahuel_Molina',
  'Romero':'Cristian_Romero','L.Mart\u00ednez':'Lautaro_Mart\u00ednez','Tagliafico':'Nicol\u00e1s_Tagliafico',
  'De Paul':'Rodrigo_De_Paul','E.Fern\u00e1ndez':'Enzo_Fern\u00e1ndez','Mac Allister':'Alexis_Mac_Allister',
  'Messi':'Lionel_Messi','J.\u00c1lvarez':'Juli\u00e1n_\u00c1lvarez','Di Mar\u00eda':'\u00c1ngel_Di_Mar\u00eda',
  'Dybala':'Paulo_Dybala','Lo Celso':'Giovani_Lo_Celso','Lisandro':'Lisandro_Mart\u00ednez',
  // Spain
  'U.Sim\u00f3n':'Unai_Sim\u00f3n','Carvajal':'Dani_Carvajal','Le Normand':'Robin_Le_Normand',
  'Laporte':'Aymeric_Laporte','Cucurella':'Marc_Cucurella','Pedri':'Pedri',
  'Gavi':'Gavi_(footballer)','F.Ruiz':'Fabi\u00e1n_Ruiz','Yamal':'Lamine_Yamal',
  'Morata':'\u00c1lvaro_Morata','N.Williams':'Nico_Williams','Olmo':'Dani_Olmo',
  'Merino':'Mikel_Merino','Torres':'Ferran_Torres',
  // Germany
  'ter Stegen':'Marc-Andr\u00e9_ter_Stegen','Kimmich':'Joshua_Kimmich','R\u00fcdiger':'Antonio_R\u00fcdiger',
  'Tah':'Jonathan_Tah','Raum':'David_Raum','G\u00fcndogan':'\u0130lkay_G\u00fcndo\u011fan',
  'Wirtz':'Florian_Wirtz','Kroos':'Toni_Kroos','Musiala':'Jamal_Musiala',
  'Havertz':'Kai_Havertz','Gnabry':'Serge_Gnabry','Schlotterbeck':'Nico_Schlotterbeck',
  'Andrich':'Robert_Andrich','F\u00fcllkrug':'Niclas_F\u00fcllkrug',
  // England
  'Raya':'David_Raya','Trippier':'Kieran_Trippier','Stones':'John_Stones_(footballer)',
  'Gu\u00e9hi':'Marc_Gu\u00e9hi','Trent A-A':'Trent_Alexander-Arnold','Rice':'Declan_Rice',
  'Bellingham':'Jude_Bellingham','Saka':'Bukayo_Saka','Foden':'Phil_Foden',
  'Kane':'Harry_Kane','Palmer':'Cole_Palmer','Mainoo':'Kobbie_Mainoo',
  'Walker':'Kyle_Walker','Rashford':'Marcus_Rashford',
  // Portugal
  'D.Costa':'Diogo_Costa','Cancelo':'Jo\u00e3o_Cancelo','R.Dias':'R\u00faben_Dias',
  'A.Silva':'Ant\u00f3nio_Silva_(footballer,_born_2003)','N.Mendes':'Nuno_Mendes_(footballer)',
  'B.Fernandes':'Bruno_Fernandes_(Portuguese_footballer)','Vitinha':'Vitinha_(footballer)',
  'Neves':'R\u00faben_Neves','Ronaldo':'Cristiano_Ronaldo','Le\u00e3o':'Rafael_Le\u00e3o',
  'Jota':'Diogo_Jota','W.Carvalho':'William_Carvalho','Trinc\u00e3o':'Francisco_Trinc\u00e3o',
  'Concei\u00e7\u00e3o':'Francisco_Concei\u00e7\u00e3o_(footballer)',
  // Netherlands
  'Flekken':'Mark_Flekken','Dumfries':'Denzel_Dumfries','van Dijk':'Virgil_van_Dijk',
  'de Vrij':'Stefan_de_Vrij','T.Timber':'Jurri\u00ebn_Timber','F.de Jong':'Frenkie_de_Jong',
  'X.Simons':'Xavi_Simons','Reijnders':'Tijjani_Reijnders','Gakpo':'Cody_Gakpo',
  'Depay':'Memphis_Depay','Bergwijn':'Steven_Bergwijn','Blind':'Daley_Blind',
  'de Roon':'Marten_de_Roon','Zirkzee':'Joshua_Zirkzee',
};

// Photo cache: name -> url string or 'NONE'
export const _photoCache={};
export async function loadPlayerPhoto(name){
  if(name in _photoCache) return _photoCache[name]==='NONE'?null:_photoCache[name];
  _photoCache[name]='NONE';
  const wikiTitle=WIKI_MAP[name];
  if(!wikiTitle) return null;
  try{
    const r=await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
      {headers:{'Accept':'application/json'}});
    if(!r.ok) throw 0;
    const d=await r.json();
    if(d.thumbnail?.source&&d.type!=='disambiguation'){
      // Request a larger version: replace /NNNpx- with /400px-
      const url=d.thumbnail.source.replace(/\/\d+px-/,'/400px-');
      _photoCache[name]=url;
      return url;
    }
  }catch(e){}
  return null;
}

export function playerAvatar(name,size=24){
  const seed=encodeURIComponent(name);
  return`<img src="https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&clothing=shirtCrewNeck&backgroundColor=1a2438&top=shortFlat,shortCurly,shortRound,sides,theCaesar,hijab,dreads01&style=default" alt="${name}" loading="lazy"
              style="width:${size}px;height:${size}px;border-radius:50%;border:1px solid rgba(200,160,82,.25);flex-shrink:0;display:block;background:#1a2438">`;
}
