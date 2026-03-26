// ═══════════════════════════════════════════════════════════
// UTILS — Toast, debug, helpers
// ═══════════════════════════════════════════════════════════
import { animateElement } from './visual-fx.js';

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

let _tt;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'on';
  animateElement(el, 'anim-slide-up', 300);
  clearTimeout(_tt);
  _tt = setTimeout(() => el.className = '', 3000);
}

export function runtimeDebug(msg) {
  const text = String(msg || 'unknown runtime error');
  let el = document.getElementById('runtime-debug');
  if (!el) {
    el = document.createElement('div');
    el.id = 'runtime-debug';
    document.body.appendChild(el);
  }
  el.style.display = 'block';
  el.textContent = text;
}

export function registerErrorHandlers() {
  window.addEventListener('error', (e) => {
    runtimeDebug(`ERR: ${e.message}\n${e.filename || ''}:${e.lineno || 0}:${e.colno || 0}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    const txt = r && r.message ? r.message : String(r || 'unhandled rejection');
    runtimeDebug(`REJ: ${txt}`);
  });
}
