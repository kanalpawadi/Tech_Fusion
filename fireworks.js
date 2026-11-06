// Diwali fireworks shared by every page (index.html, invoice.html)
// Diwali greeting: shown until the end of DIWALI_LAST_DAY (visitor's local time), with looping fireworks
const DIWALI_LAST_DAY = '2026-11-12';

function isDiwaliSeason(now = new Date()) {
  return now <= new Date(`${DIWALI_LAST_DAY}T23:59:59`);
}

// Fireworks engine shared by the banner and the whole-page layer.
// Each burst is a ring of rays drawn as fading dotted trails (green, white, red, orange, gold).
function createFireworks(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const palette = opts.palette || ['#7cffb2', '#3ddc97', '#ffffff', '#ff4d4d', '#ff8c42', '#ffd21f', '#5eead4', '#ff6b9a'];
  const sparkle = opts.sparkle || '#ffffff';
  const blend = opts.blend || 'lighter';
  const rockets = [];
  const sparks = [];
  const TRAIL = 7;
  let width = 0, height = 0, running = false, raf = 0, nextLaunch = 0, lastTime = 0;
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = () => palette[Math.floor(Math.random() * palette.length)];

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr || 2);
    // fixed layer: the visible viewport without the scrollbar
    width = opts.fixed ? document.documentElement.clientWidth : canvas.parentElement.clientWidth;
    height = opts.fixed ? document.documentElement.clientHeight : canvas.parentElement.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const launch = () => {
    let x = rand(width * 0.08, width * 0.92);
    if (opts.sideBias && width > 760) {
      // keep bursts beside the greeting so it stays readable
      x = Math.random() < 0.5 ? rand(width * 0.03, width * 0.3) : rand(width * 0.7, width * 0.97);
    }
    const targetY = opts.fixed ? rand(height * 0.12, height * 0.7) : rand(height * 0.15, height * 0.5);
    const startY = opts.fixed ? Math.min(height + 10, targetY + rand(150, 260)) : height + 5;
    rockets.push({ x, y: startY, targetY, vy: -rand(7, 10), trail: [] });
  };

  const burst = (x, y) => {
    const radius = opts.radius(width, height);
    const rays = width < 500 ? opts.rays[0] : opts.rays[1];
    const main = pick();
    const second = pick();
    for (let i = 0; i < rays; i++) {
      const angle = (Math.PI * 2 * i) / rays + rand(-0.06, 0.06);
      // with 0.96 friction a spark travels about 25 × its starting speed
      const speed = (radius / 25) * rand(0.7, 1.05);
      sparks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: rand(0.011, 0.017),
        color: Math.random() < 0.2 ? sparkle : (i % 3 === 0 ? second : main),
        size: rand(1.3, 2.3),
        trail: [],
      });
    }
  };

  const dottedTrail = (trail, color, size, alpha) => {
    ctx.fillStyle = color;
    for (let k = 0; k < trail.length; k++) {
      const f = (k + 1) / trail.length;
      ctx.globalAlpha = alpha * f * 0.9;
      ctx.beginPath();
      ctx.arc(trail[k].x, trail[k].y, size * (0.35 + 0.65 * f), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const frame = (time) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    // dt = frames elapsed at 60 fps, so bursts last the same time on fast and slow devices
    const dt = lastTime ? Math.min((time - lastTime) / 16.67, 4) : 1;
    lastTime = time;
    const drag = Math.pow(0.96, dt);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = blend;

    if (time > nextLaunch && sparks.length < opts.maxSparks) {
      launch();
      nextLaunch = time + rand(opts.interval[0], opts.interval[1]);
    }

    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > TRAIL) r.trail.shift();
      r.y += r.vy * dt;
      r.vy *= Math.pow(0.975, dt);
      dottedTrail(r.trail, '#ffd98a', 1.6, 0.9);
      if (r.y <= r.targetY || r.vy > -1.2) {
        burst(r.x, r.y);
        rockets.splice(i, 1);
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > TRAIL) s.trail.shift();
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= drag;
      s.vy = s.vy * drag + 0.045 * dt;
      s.life -= s.decay * dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      if (opts.shadow) {
        // faint dark halo so sparks stay visible over white sections
        ctx.globalAlpha = s.life * 0.22;
        ctx.fillStyle = '#1a0f00';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
      dottedTrail(s.trail, s.color, s.size, s.life);
      // brighter head
      ctx.globalAlpha = s.life;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  resize();
  window.addEventListener('resize', resize);

  return {
    start() { if (running) return; running = true; lastTime = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); ctx.clearRect(0, 0, width, height); },
    // one still burst (for visitors who prefer reduced motion)
    still(points) {
      ctx.globalCompositeOperation = blend;
      points.forEach(([fx, fy]) => {
        const before = sparks.length;
        burst(width * fx, height * fy);
        sparks.slice(before).forEach((s) => {
          ctx.fillStyle = s.color;
          for (let k = 1; k <= 5; k++) {
            ctx.globalAlpha = 0.25 + k * 0.15;
            ctx.beginPath();
            ctx.arc(s.x + s.vx * k * 4, s.y + s.vy * k * 4, s.size * (0.4 + k * 0.12), 0, Math.PI * 2);
            ctx.fill();
          }
        });
        sparks.length = before;
      });
      ctx.globalAlpha = 1;
    },
  };
}

// Starts the see-through fireworks layer over the whole page; returns a function that removes it.
function startPageFireworks() {
  const layer = document.createElement('canvas');
  layer.className = 'site-fireworks';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const pageFw = createFireworks(layer, {
    fixed: true,
    maxDpr: 1.5,
    // strong colours + faint halo: readable over both the dark and the white sections
    palette: ['#16a34a', '#22c55e', '#f97316', '#ea580c', '#e11d48', '#db2777', '#f59e0b', '#7c3aed', '#0891b2'],
    sparkle: '#f59e0b',
    blend: 'source-over',
    shadow: true,
    interval: [1500, 3000],
    rays: [40, 56],
    radius: (w) => (w < 500 ? 45 : 65) + Math.random() * (w < 500 ? 35 : 55),
    maxSparks: 120, // about two bursts at a time
  });
  pageFw.start();
  return () => { pageFw.stop(); layer.remove(); };
}

// Fireworks are on while it is Diwali, the visitor hasn't closed the greeting and motion is allowed
function pageFireworksWanted() {
  let closed = false;
  try { closed = sessionStorage.getItem('tf-diwali-closed') === '1'; } catch (err) { /* storage blocked */ }
  return isDiwaliSeason() && !closed && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
