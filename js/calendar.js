// ═══════════════════════════════════════════════════════════
// CALENDAR — Day navigation, drag handlers
// ═══════════════════════════════════════════════════════════
import { state } from './state.js?v=9';
import { SFX } from './audio-fx.js?v=9';

let _deps = {};
export function setCalendarDeps({ renderCalendarHUD, renderMatches }) {
  _deps = { renderCalendarHUD, renderMatches };
}

export function getAllMatchDays() {
  const seen = new Set(), days = [];
  state.MS.filter(m => m.dateKey).sort((a,b) => a.dateKey.localeCompare(b.dateKey))
    .forEach(m => {
      if (!seen.has(m.dateKey)) {
        seen.add(m.dateKey);
        days.push({key:m.dateKey, date:m.date, phaseId:m.phaseId});
      }
    });
  return days;
}

export function setActiveDay(key) {
  if (!key) return;
  if (key !== state.activeDay) SFX.calTick();
  state.activeDay = key;
  const m = state.MS.find(m => m.dateKey === key);
  if (m) state.activePhase = m.phaseId;
  _deps.renderCalendarHUD();
  _deps.renderMatches();
}

export function navDay(dir) {
  const days = getAllMatchDays();
  const idx = days.findIndex(d => d.key === state.activeDay);
  const ni = Math.max(0, Math.min(days.length-1, idx+dir));
  if (days[ni] && days[ni].key !== state.activeDay) {
    SFX.nav();
    setActiveDay(days[ni].key);
  }
}

let _calDrag = false;
function _calDayFromX(cx) {
  const el = document.getElementById('hud-cal'); if (!el) return null;
  const r = el.getBoundingClientRect();
  const pad=26, trackW=r.width-2*pad;
  const pct = Math.max(0, Math.min(1, (cx-r.left-pad)/trackW));
  const days = getAllMatchDays(); if (!days.length) return null;
  const t0 = new Date(days[0].key).getTime();
  const t1 = new Date(days[days.length-1].key).getTime();
  const tgt = t0+(t1-t0)*pct;
  let best=null, bd=Infinity;
  days.forEach(d => { const dist=Math.abs(new Date(d.key).getTime()-tgt); if (dist<bd){bd=dist;best=d;} });
  return best;
}
export function calDragStart(e) { _calDrag=true; const d=_calDayFromX(e.clientX); if(d)setActiveDay(d.key); e.preventDefault(); }
export function calDragMove(e) { if(!_calDrag)return; const d=_calDayFromX(e.clientX); if(d&&d.key!==state.activeDay)setActiveDay(d.key); }
export function calDragEnd() { _calDrag=false; }
export function calTouchStart(e) { _calDrag=true; const d=_calDayFromX(e.touches[0].clientX); if(d)setActiveDay(d.key); e.preventDefault(); }
export function calTouchMove(e) { if(!_calDrag)return; const d=_calDayFromX(e.touches[0].clientX); if(d&&d.key!==state.activeDay)setActiveDay(d.key); }
