// ═══════════════════════════════════════════════════════════
// REWARD FX — Canvas-based particle engine + God Rays
// Vampire Survivors / Slot Machine style chest opening
// ═══════════════════════════════════════════════════════════

// ── Particle class ──
class Particle {
  constructor(x, y, vx, vy, size, color, life, gravity = 0, friction = 1, glow = 0) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.size = size; this.color = color;
    this.life = life; this.maxLife = life;
    this.gravity = gravity; this.friction = friction;
    this.glow = glow;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.3;
  }
  update() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotSpeed;
    this.life--;
    return this.life > 0;
  }
  get alpha() { return Math.max(0, this.life / this.maxLife); }
}

// ── Loot Item (parabolic arc) ──
class LootItem {
  constructor(x, y, emoji, targetX, targetY) {
    this.x = x; this.y = y;
    this.emoji = emoji;
    this.targetX = targetX;
    this.targetY = targetY;
    this.startX = x; this.startY = y;
    this.t = 0;
    this.duration = 50 + Math.random() * 20; // frames
    this.arcHeight = 150 + Math.random() * 100;
    this.landed = false;
    this.scale = 0;
    this.landBounce = 0;
  }
  update() {
    if (this.landed) {
      this.landBounce *= 0.85;
      this.scale = 1 + this.landBounce;
      return true;
    }
    this.t++;
    const p = Math.min(1, this.t / this.duration);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - p, 3);
    this.x = this.startX + (this.targetX - this.startX) * ease;
    // Parabolic arc: y = start + (target-start)*p - arc*sin(pi*p)
    this.y = this.startY + (this.targetY - this.startY) * ease - Math.sin(Math.PI * p) * this.arcHeight;
    this.scale = 0.3 + p * 0.7;
    if (p >= 1) {
      this.landed = true;
      this.landBounce = 0.3;
      this.x = this.targetX;
      this.y = this.targetY;
    }
    return true;
  }
}

// ── Main FX Controller ──
export class RewardFX {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.lootItems = [];
    this.running = false;
    this.animId = null;

    // God rays state
    this.raysActive = false;
    this.rayAngle = 0;
    this.rayCount = 16;
    this.rayColor = { h: 45, s: 100, l: 55 }; // gold
    this.rayCycleSpeed = 0;
    this.rayIntensity = 0;
    this.rayTargetIntensity = 0;
    this.cx = 0;
    this.cy = 0;

    // Screen shake
    this.shakeIntensity = 0;
    this.shakeDecay = 0.92;

    // White flash
    this.flashAlpha = 0;

    // Progressive shake (phase 1)
    this.progShakeIntensity = 0;
    this.progShakeTarget = 0;

    this._boundLoop = this._loop.bind(this);
  }

  // ── Setup / Teardown ──
  start(container) {
    if (this.canvas) this.destroy();
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'reward-fx-canvas';
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
    container.appendChild(this.canvas);
    this._resize();
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.lootItems = [];
    this.raysActive = false;
    this.rayAngle = 0;
    this.rayIntensity = 0;
    this.shakeIntensity = 0;
    this.flashAlpha = 0;
    this.progShakeIntensity = 0;
    this.running = true;
    this._loop();
    this._resizeHandler = () => this._resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  destroy() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.canvas && this.canvas.parentNode) this.canvas.remove();
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.lootItems = [];
  }

  _resize() {
    if (!this.canvas) return;
    const r = this.canvas.parentNode.getBoundingClientRect();
    this.canvas.width = r.width * devicePixelRatio;
    this.canvas.height = r.height * devicePixelRatio;
    this.w = r.width;
    this.h = r.height;
  }

  // ── Set center point for rays ──
  setCenter(x, y) {
    this.cx = x; this.cy = y;
  }

  // ── God Rays ──
  startRays(colorHue = 45) {
    this.raysActive = true;
    this.rayColor.h = colorHue;
    this.rayCycleSpeed = 0;
    this.rayTargetIntensity = 0.5;
  }

  setRayIntensity(intensity) {
    this.rayTargetIntensity = intensity;
  }

  startRainbowCycle(speed = 5) {
    this.rayCycleSpeed = speed;
  }

  stopRays() {
    this.rayTargetIntensity = 0;
  }

  // ── Screen shake ──
  triggerShake(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  setProgressiveShake(target) {
    this.progShakeTarget = target;
  }

  // ── White flash ──
  triggerFlash() {
    this.flashAlpha = 1;
  }

  // ── Particle spawners ──
  burstParticles(x, y, count, opts = {}) {
    const {
      speed = 8, speedVar = 4,
      size = 4, sizeVar = 3,
      life = 40, lifeVar = 20,
      gravity = 0.08, friction = 0.96,
      colors = ['#f0c870', '#ff6b35', '#e84060', '#4488cc', '#5aaa5e'],
      glow = 8
    } = opts;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed + (Math.random() - 0.5) * speedVar * 2;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        size + Math.random() * sizeVar,
        colors[Math.floor(Math.random() * colors.length)],
        life + Math.floor(Math.random() * lifeVar),
        gravity, friction, glow
      ));
    }
  }

  sparkStream(x, y, count, color = '#f0c870') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 3;
      this.particles.push(new Particle(
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        1 + Math.random() * 3,
        color,
        20 + Math.floor(Math.random() * 30),
        -0.02, 0.98, 6
      ));
    }
  }

  // ── Loot fountain ──
  spawnLootItem(startX, startY, emoji, targetX, targetY) {
    this.lootItems.push(new LootItem(startX, startY, emoji, targetX, targetY));
  }

  // Massive radial burst — the "climax pop"
  climaxBurst(x, y) {
    // Hundreds of tiny glowing squares
    const colors = ['#ff3333', '#f0c870', '#ffaa00', '#4488cc', '#ff6bff', '#33ff88', '#ffffff'];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 14;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        2 + Math.random() * 5,
        colors[Math.floor(Math.random() * colors.length)],
        50 + Math.floor(Math.random() * 60),
        0.06, 0.965, 10
      ));
    }
    // Extra bright center burst
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        6 + Math.random() * 8,
        '#ffffff',
        15 + Math.floor(Math.random() * 15),
        0, 0.94, 20
      ));
    }
  }

  // Continuous sparkle rain during reveal
  sparkleRain(count = 5) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(
        Math.random() * this.w,
        -5,
        (Math.random() - 0.5) * 1.5,
        1 + Math.random() * 2,
        1 + Math.random() * 2,
        ['#f0c870', '#ffffff', '#ffaa00', '#ff6bff'][Math.floor(Math.random() * 4)],
        60 + Math.floor(Math.random() * 60),
        0.02, 0.995, 4
      ));
    }
  }

  // ── Main render loop ──
  _loop() {
    if (!this.running || !this.ctx) return;
    this.animId = requestAnimationFrame(this._boundLoop);

    const ctx = this.ctx;
    const dpr = devicePixelRatio;
    const W = this.w * dpr;
    const H = this.h * dpr;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Apply progressive shake
    this.progShakeIntensity += (this.progShakeTarget - this.progShakeIntensity) * 0.08;
    const pShake = this.progShakeIntensity;
    // Apply burst shake
    const totalShake = pShake + this.shakeIntensity;
    if (totalShake > 0.5) {
      const sx = (Math.random() - 0.5) * totalShake * 2;
      const sy = (Math.random() - 0.5) * totalShake * 2;
      ctx.translate(sx, sy);
      // Also shake the overlay container
      const overlay = document.getElementById('rw-gift-overlay');
      if (overlay) overlay.style.transform = `translate(${sx}px,${sy}px)`;
    } else {
      const overlay = document.getElementById('rw-gift-overlay');
      if (overlay) overlay.style.transform = '';
    }
    this.shakeIntensity *= this.shakeDecay;

    // ── Draw God Rays ──
    if (this.raysActive) {
      this.rayIntensity += (this.rayTargetIntensity - this.rayIntensity) * 0.06;
      this.rayAngle += 0.008;
      if (this.rayCycleSpeed > 0) {
        this.rayColor.h = (this.rayColor.h + this.rayCycleSpeed) % 360;
      }

      if (this.rayIntensity > 0.01) {
        ctx.save();
        ctx.translate(this.cx, this.cy);
        ctx.rotate(this.rayAngle);
        ctx.globalAlpha = this.rayIntensity;

        for (let i = 0; i < this.rayCount; i++) {
          const a = (i / this.rayCount) * Math.PI * 2;
          const halfWidth = (Math.PI / this.rayCount) * 0.7;
          const len = Math.max(this.w, this.h) * 1.5;

          // Alternating hue offset for rainbow effect
          const hue = (this.rayColor.h + i * (360 / this.rayCount)) % 360;
          const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, len);
          grad.addColorStop(0, `hsla(${hue},${this.rayColor.s}%,${this.rayColor.l}%,0.9)`);
          grad.addColorStop(0.3, `hsla(${hue},${this.rayColor.s}%,${this.rayColor.l}%,0.4)`);
          grad.addColorStop(0.7, `hsla(${hue},${this.rayColor.s}%,${this.rayColor.l}%,0.1)`);
          grad.addColorStop(1, 'transparent');

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, len, a - halfWidth, a + halfWidth);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // ── Draw Particles ──
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.update()) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.glow > 0) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.glow * p.alpha;
      }

      ctx.fillStyle = p.color;
      const halfSize = p.size * p.alpha * 0.5;
      ctx.fillRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
      ctx.restore();
    }

    // ── Draw Loot Items ──
    for (let i = this.lootItems.length - 1; i >= 0; i--) {
      const item = this.lootItems[i];
      item.update();
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.translate(item.x, item.y);
      const s = item.scale;
      ctx.scale(s, s);
      ctx.font = '36px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Glow behind emoji
      ctx.shadowColor = '#f0c870';
      ctx.shadowBlur = 20;
      ctx.fillText(item.emoji, 0, 0);
      ctx.shadowBlur = 0;
      ctx.fillText(item.emoji, 0, 0);
      ctx.restore();

      // Trail sparkles while moving
      if (!item.landed && item.t % 3 === 0) {
        this.particles.push(new Particle(
          item.x, item.y,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          2 + Math.random() * 2,
          '#f0c870',
          15 + Math.floor(Math.random() * 10),
          0, 0.95, 6
        ));
      }
    }

    // ── White flash ──
    if (this.flashAlpha > 0) {
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.w, this.h);
      this.flashAlpha *= 0.7; // fast decay: ~50ms effective
      if (this.flashAlpha < 0.01) this.flashAlpha = 0;
    }

    ctx.restore();
  }
}
