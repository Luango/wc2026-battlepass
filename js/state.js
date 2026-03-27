// ═══════════════════════════════════════════════════════════
// STATE — Central mutable state container
// ═══════════════════════════════════════════════════════════
import { XP_PER_TIER } from './data/tiers.js?v=9';

export const LS_S='wc26s3',LS_M='wc26m4'; // m4: added dateKey+kickoff fields

export function loadState(){
  try{
    const s=JSON.parse(localStorage.getItem(LS_S));
    if(s){
      if(!s.inventory) s.inventory=[];
      if(s.champion===undefined) s.champion=null;
      return s;
    }
  }catch(e){}
  return{coins:1000,xp:0,tier:1,bets:{},claimed:[],inventory:[],champion:null};
}
export function saveState(){localStorage.setItem(LS_S,JSON.stringify(state.ST));}
export function loadMatches(genMatchesFn){
  try{const m=JSON.parse(localStorage.getItem(LS_M));if(m&&m.length)return m;}catch(e){}
  const m=genMatchesFn();localStorage.setItem(LS_M,JSON.stringify(m));return m;
}
export function saveMatches(){localStorage.setItem(LS_M,JSON.stringify(state.MS));}

export const BET_TYPES=[
  {id:'match',label:'Match Result'},
  {id:'totals',label:'Over/Under'},
  {id:'btts',label:'BTTS'},
  {id:'starting11',label:'Starting XI',visible:false},
];

export const state = {
  ST: loadState(),
  MS: null,
  activePhase: 'group',
  activeDay: '',
  previewMode: false,
  previewMatchId: null,
  previewFormations: {home:'4-3-3',away:'4-3-3'},
  previewPredictions: {home:false,away:false},
  selectedPlayerId: null,
  previewLineups: {home:[],away:[]},
  previewTeams: {home:null,away:null},
  swapSourceBySide: {home:null,away:null},
  fallbackPlayers: [],
  previewLineupTab: 'home',
  silent: false,
  picks: {},
  betTabs: {},
  aiChatOpen: false,
  aiFloatTab: 'chat',
};

export function initState(genMatchesFn){
  state.MS = loadMatches(genMatchesFn);
}
