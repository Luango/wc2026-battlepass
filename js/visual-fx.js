// ═══════════════════════════════════════════════════════════
// VISUAL FX — Ripple, Confetti, Animations
// ═══════════════════════════════════════════════════════════

export function spawnRipple(x,y){
  const r=document.createElement('div');
  r.className='anim-ripple';
  r.style.left=x+'px';r.style.top=y+'px';
  document.body.appendChild(r);
  setTimeout(()=>r.remove(),500);
}

export function spawnConfetti(x,y,count=20){
  const colors=['#f0c870','#c8a052','#5aaa5e','#4488cc','#e86060','#fff','#ffaa00'];
  for(let i=0;i<count;i++){
    const p=document.createElement('div');
    p.className='confetti-piece';
    p.style.left=(x+Math.random()*80-40)+'px';
    p.style.top=(y-10)+'px';
    p.style.background=colors[Math.floor(Math.random()*colors.length)];
    p.style.width=(4+Math.random()*6)+'px';
    p.style.height=(4+Math.random()*6)+'px';
    p.style.animationDuration=(0.8+Math.random()*0.8)+'s';
    p.style.transform=`rotate(${Math.random()*360}deg)`;
    const dx=(Math.random()-.5)*120;
    p.style.animationName='none';
    document.body.appendChild(p);
    // Custom trajectory via JS
    let vy=-3-Math.random()*4,vx=dx/30,ay=0.12,op=1,rot=Math.random()*15;
    let px=parseFloat(p.style.left),py=parseFloat(p.style.top);
    function step(){
      vy+=ay;px+=vx;py+=vy;op-=0.015;rot+=8;
      p.style.left=px+'px';p.style.top=py+'px';
      p.style.opacity=Math.max(0,op);
      p.style.transform=`rotate(${rot}deg)`;
      if(op>0)requestAnimationFrame(step);else p.remove();
    }
    requestAnimationFrame(step);
  }
}

export function animateElement(el,cls,dur=600){
  if(!el)return;
  el.classList.remove(cls);
  void el.offsetWidth; // force reflow
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls),dur);
}

export function flashElement(el,color='gold',dur=400){
  if(!el)return;
  const cls=color==='green'?'anim-flash-green':color==='red'?'anim-flash-red':'anim-glow';
  animateElement(el,cls,dur);
}

export function coinPopAnimation(){
  const coinEl=document.getElementById('h-coins');
  if(coinEl)animateElement(coinEl,'anim-coin-pop',400);
  const lpCoins=document.getElementById('lp-coins');
  if(lpCoins)animateElement(lpCoins,'anim-coin-pop',400);
}

export function shakeElement(el){animateElement(el,'anim-shake',400);}

// ── Global click ripple on interactive elements ──
export function registerGlobalRipple(){
  document.addEventListener('click',(e)=>{
    const t=e.target.closest('.btn-g,.btn-r,.btn-back,.btn-bet,.bkt-open-btn,.hud-nav,.mc-clickable,.bopt,.bet-tab,.lineup-tab,.lock-pred-btn,.hud-tick,.tier-dot');
    if(t){spawnRipple(e.clientX,e.clientY);}
  },{passive:true});
}
