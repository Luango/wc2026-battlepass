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

// ── Sparkle burst — twinkling star particles ──
export function spawnSparkles(x,y,count=30,color='#f0c870'){
  for(let i=0;i<count;i++){
    const p=document.createElement('div');
    p.className='sparkle-particle';
    const angle=Math.random()*Math.PI*2;
    const speed=2+Math.random()*5;
    const size=2+Math.random()*4;
    p.style.cssText=`left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};box-shadow:0 0 ${size*2}px ${color},0 0 ${size*4}px ${color}`;
    document.body.appendChild(p);
    let vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed,op=1,px=x,py=y,life=60+Math.random()*40;
    let frame=0;
    function step(){
      frame++;vx*=0.97;vy*=0.97;vy+=0.03;px+=vx;py+=vy;op=1-frame/life;
      const flicker=0.5+Math.sin(frame*0.8)*0.5;
      p.style.left=px+'px';p.style.top=py+'px';
      p.style.opacity=Math.max(0,op*flicker);
      p.style.transform=`scale(${op})`;
      if(frame<life)requestAnimationFrame(step);else p.remove();
    }
    requestAnimationFrame(step);
  }
}

// ── Light rays — radial god rays from center ──
export function spawnLightRays(x,y,color='rgba(240,200,112,.6)',count=12){
  const container=document.createElement('div');
  container.className='light-rays-container';
  container.style.cssText=`position:fixed;left:${x}px;top:${y}px;pointer-events:none;z-index:10001`;
  for(let i=0;i<count;i++){
    const ray=document.createElement('div');
    ray.className='light-ray';
    const angle=(i/count)*360;
    const width=3+Math.random()*4;
    const length=80+Math.random()*200;
    ray.style.cssText=`
      position:absolute;left:0;top:0;width:${width}px;height:${length}px;
      background:linear-gradient(180deg,${color},transparent);
      transform-origin:top center;transform:rotate(${angle}deg);
      opacity:0;border-radius:${width}px;
      animation:light-ray-burst 1.2s ${i*30}ms ease-out forwards`;
    container.appendChild(ray);
  }
  document.body.appendChild(container);
  setTimeout(()=>container.remove(),2000);
}

// ── Screen shake — juicy impact ──
export function screenShake(intensity=8,duration=400){
  const el=document.body;
  const start=Date.now();
  const orig=el.style.transform;
  function shake(){
    const elapsed=Date.now()-start;
    if(elapsed>duration){el.style.transform=orig;return;}
    const decay=1-elapsed/duration;
    const dx=(Math.random()-.5)*2*intensity*decay;
    const dy=(Math.random()-.5)*2*intensity*decay;
    el.style.transform=`translate(${dx}px,${dy}px)`;
    requestAnimationFrame(shake);
  }
  requestAnimationFrame(shake);
}

// ── Screen flash — full-screen color burst ──
export function screenFlash(color='rgba(240,200,112,.4)',duration=600){
  const flash=document.createElement('div');
  flash.style.cssText=`position:fixed;inset:0;pointer-events:none;z-index:10002;
    background:radial-gradient(circle at 50% 50%,${color},transparent 70%);
    animation:screen-flash-generic ${duration}ms ease-out forwards`;
  document.body.appendChild(flash);
  setTimeout(()=>flash.remove(),duration+50);
}

// ── Coin shower — falling coins across screen ──
export function spawnCoinShower(count=25){
  for(let i=0;i<count;i++){
    setTimeout(()=>{
      const coin=document.createElement('div');
      coin.className='shower-coin';
      coin.textContent='🪙';
      const x=Math.random()*window.innerWidth;
      coin.style.cssText=`left:${x}px;top:-30px;font-size:${14+Math.random()*16}px;
        animation-duration:${1.5+Math.random()*1.5}s;
        animation-delay:0s`;
      document.body.appendChild(coin);
      setTimeout(()=>coin.remove(),3500);
    },i*60+Math.random()*40);
  }
}

// ── Emoji explosion — burst of emojis from a point ──
export function emojiExplosion(x,y,emoji='⭐',count=15){
  for(let i=0;i<count;i++){
    const p=document.createElement('div');
    p.textContent=emoji;
    p.style.cssText=`position:fixed;left:${x}px;top:${y}px;font-size:${16+Math.random()*16}px;
      pointer-events:none;z-index:10003;user-select:none`;
    document.body.appendChild(p);
    const angle=Math.random()*Math.PI*2;
    const speed=3+Math.random()*6;
    let vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed-2;
    let px=x,py=y,op=1,rot=0;
    function step(){
      vy+=0.15;px+=vx;py+=vy;op-=0.018;rot+=vx*3;vx*=0.98;
      p.style.left=px+'px';p.style.top=py+'px';
      p.style.opacity=Math.max(0,op);
      p.style.transform=`rotate(${rot}deg) scale(${0.5+op*0.5})`;
      if(op>0)requestAnimationFrame(step);else p.remove();
    }
    requestAnimationFrame(step);
  }
}

// ── Rarity ring pulse — expanding rings ──
export function spawnRarityRings(x,y,color,count=3){
  for(let i=0;i<count;i++){
    setTimeout(()=>{
      const ring=document.createElement('div');
      ring.className='rarity-ring';
      ring.style.cssText=`left:${x}px;top:${y}px;border-color:${color};
        animation:rarity-ring-expand 1s ease-out forwards`;
      document.body.appendChild(ring);
      setTimeout(()=>ring.remove(),1200);
    },i*200);
  }
}

// ── Global click ripple on interactive elements ──
export function registerGlobalRipple(){
  document.addEventListener('click',(e)=>{
    const t=e.target.closest('.btn-g,.btn-r,.btn-back,.btn-bet,.bkt-open-btn,.hud-nav,.mc-clickable,.bopt,.bet-tab,.lineup-tab,.lock-pred-btn,.hud-tick,.tier-dot');
    if(t){spawnRipple(e.clientX,e.clientY);}
  },{passive:true});
}
