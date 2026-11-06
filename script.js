// Mobile menu
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');

toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});

links.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', false);
  })
);

// Gallery lightbox
const lightbox = document.getElementById('lightbox');
const lbImg = lightbox.querySelector('img');

document.querySelectorAll('.gallery figure').forEach((fig) =>
  fig.addEventListener('click', () => {
    const img = fig.querySelector('img');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lightbox.hidden = false;
  })
);

const closeLightbox = () => { lightbox.hidden = true; };
lightbox.addEventListener('click', (e) => { if (e.target !== lbImg) closeLightbox(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

// Enquiry form -> WhatsApp
document.getElementById('enquiry').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  if (!f.name.value.trim()) {
    f.name.value = '';
    f.name.reportValidity();
    return;
  }
  const text =
    `Hi Tech Fusion,\n` +
    `Name: ${f.name.value.trim()}\n` +
    `Looking for: ${f.type.value}\n` +
    (f.msg.value.trim() ? `Details: ${f.msg.value.trim()}` : '');
  window.open(`https://wa.me/917507190468?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
});

// Project filters
const projects = document.querySelectorAll('.project');
const projectsEmpty = document.querySelector('.projects-empty');

document.querySelectorAll('.filter').forEach((btn) =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', b === btn);
    });
    const cat = btn.dataset.filter;
    let shown = 0;
    projects.forEach((p) => {
      const match = cat === 'all' || p.dataset.cat.split(' ').includes(cat);
      p.hidden = !match;
      if (match) shown++;
    });
    projectsEmpty.hidden = shown > 0;
  })
);

// "Explore Tech" on a service card jumps to Projects with the matching filter on
document.querySelectorAll('.card-action[data-filter]').forEach((link) =>
  link.addEventListener('click', () => {
    const btn = document.querySelector(`.filter[data-filter="${link.dataset.filter}"]`);
    if (btn) btn.click();
  })
);

// Project registration -> booking invoice
const reg = document.getElementById('register-form');
const regError = reg.querySelector('.form-error');
const charCount = reg.querySelector('.char-count');

// Keep the counter and the "College" / "Company" labels in step with the form,
// including after a reset or when the browser restores a half-filled form (Back button).
function syncRegForm() {
  charCount.textContent = `${reg.description.value.length} / 2000`;
  const industry = reg.clientType.value === 'Industry';
  reg.querySelectorAll('[data-student]').forEach((el) => { el.hidden = industry; });
  reg.querySelectorAll('[data-industry]').forEach((el) => { el.hidden = !industry; });
}
reg.description.addEventListener('input', syncRegForm);
reg.querySelectorAll('input[name="clientType"]').forEach((r) => r.addEventListener('change', syncRegForm));
reg.addEventListener('reset', () => setTimeout(syncRegForm)); // values change after the reset event
window.addEventListener('pageshow', syncRegForm);
syncRegForm();

reg.querySelectorAll('input[name="projectType"]').forEach((r) =>
  r.addEventListener('change', () => reg.querySelector('.reg-type').removeAttribute('aria-invalid'))
);

function regFail(field, message) {
  regError.textContent = message;
  regError.hidden = false;
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }
  return false;
}

function validateRegistration(f) {
  f.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  regError.hidden = true;

  const required = [
    ['fullName', 'Please enter your full name.'],
    ['organisation', f.clientType.value === 'Industry' ? 'Please enter your company name.' : 'Please enter your college name.'],
    ['email', 'Please enter your email.'],
    ['phone', 'Please enter your phone / WhatsApp number.'],
    ['projectName', 'Please enter the project title.'],
  ];
  for (const [name, msg] of required) {
    if (!f[name].value.trim()) return regFail(f[name], msg);
  }
  if (!f.projectType.value) {
    const group = f.querySelector('.reg-type');
    group.setAttribute('aria-invalid', 'true');
    regFail(null, 'Please choose Mini project or Mega project.');
    f.projectType[0].focus();
    return false;
  }
  if (!f.description.value.trim()) return regFail(f.description, 'Please describe your project.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())) return regFail(f.email, 'Please enter a valid email address.');
  const digits = f.phone.value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(digits)) return regFail(f.phone, 'Please enter a valid 10-digit Indian mobile number.');
  if (f.description.value.trim().length < 20) return regFail(f.description, 'Please add a little more detail (at least 20 characters).');
  if (!f.agree.checked) return regFail(f.agree, 'Please confirm your details are correct.');
  return true;
}

const regSubmit = reg.querySelector('.reg-submit');

reg.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  if (regSubmit.disabled || !validateRegistration(f)) return;

  const v = (name) => f[name].value.trim();
  const phone = f.phone.value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  const booking = {
    id: TFInvoice.newBookingId(),
    createdAt: new Date().toISOString(),
    clientType: f.clientType.value,
    fullName: v('fullName'),
    organisation: v('organisation'),
    department: v('department'),
    email: v('email'),
    phone: `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`,
    city: v('city'),
    projectName: v('projectName'),
    projectType: f.projectType.value,
    description: v('description'),
  };

  try {
    const saved = JSON.parse(localStorage.getItem('tf-bookings') || '[]');
    saved.push({ id: booking.id, projectName: booking.projectName, createdAt: booking.createdAt });
    localStorage.setItem('tf-bookings', JSON.stringify(saved.slice(-20)));
  } catch (err) { /* storage unavailable: the invoice link still carries the booking */ }

  TFInvoice.download(booking);

  const hash = TFInvoice.encode(booking);
  const invoiceUrl = new URL(`invoice.html#${hash}`, window.location.href).href;
  regSubmit.disabled = true;
  regSubmit.textContent = 'Sending confirmation…';
  const mail = await TFInvoice.sendEmails(booking, invoiceUrl);
  regSubmit.disabled = false;
  regSubmit.textContent = 'Submit & get invoice';

  TFInvoice.navigate(`invoice.html?mail=${mail}#${hash}`);
});

// Hide the floating WhatsApp button while a form's submit area is on screen
const waFloat = document.querySelector('.wa-float');
const submitButtons = document.querySelectorAll('.reg-submit, #enquiry button[type="submit"]');
function updateWaFloat() {
  const onScreen = [...submitButtons].some((btn) => {
    const r = btn.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  });
  waFloat.classList.toggle('wa-away', onScreen);
}
window.addEventListener('scroll', updateWaFloat, { passive: true });
window.addEventListener('resize', updateWaFloat);
updateWaFloat();

// Reveal on scroll
const revealEls = document.querySelectorAll('.card, .stack-group, .steps li, .gallery figure, .section-head, .project');
revealEls.forEach((el) => el.classList.add('reveal'));

const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach((el) => io.observe(el));

document.getElementById('year').textContent = new Date().getFullYear();


// 3D Card Tilt on Hover
function init3DTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const tiltEls = document.querySelectorAll('[data-tilt]');
  tiltEls.forEach((el) => {
    let ticking = false;
    let rect = null;

    const onMouseEnter = () => {
      rect = el.getBoundingClientRect();
      el.style.transition = 'transform .1s ease-out';
    };

    const onMouseMove = (e) => {
      if (!rect) rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      if (!ticking) {
        requestAnimationFrame(() => {
          const rx = -y * 8;
          const ry = x * 8;
          el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
          ticking = false;
        });
        ticking = true;
      }
    };

    const onMouseLeave = () => {
      rect = null;
      el.style.transition = 'transform .35s ease';
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    };

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);
  });
}
init3DTilt();

// Interactive 3D Electronic Nodes Canvas in Hero
function initHero3DCanvas() {
  const canvas = document.getElementById('hero-3d-canvas');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0, height = 0;
  let isVisible = true;
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

  const resize = () => {
    width = canvas.width = canvas.parentElement.offsetWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  const nodeCount = 36;
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: (Math.random() - 0.5) * 550,
      y: (Math.random() - 0.5) * 450,
      z: (Math.random() - 0.5) * 450,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      vz: (Math.random() - 0.5) * 0.35,
      color: Math.random() > 0.45 ? '#ffd21f' : '#00e5ff',
      isChip: Math.random() > 0.65
    });
  }

  const heroSection = document.querySelector('.hero');
  if (heroSection) {
    heroSection.addEventListener('mousemove', (e) => {
      const r = heroSection.getBoundingClientRect();
      mouse.targetX = ((e.clientX - r.left) / r.width - 0.5) * 0.6;
      mouse.targetY = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
    });
  }

  const obs = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
  }, { threshold: 0.05 });
  obs.observe(heroSection);

  let rotX = 0, rotY = 0;

  function loop() {
    if (!isVisible) {
      requestAnimationFrame(loop);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    rotY += 0.002 + mouse.x * 0.008;
    rotX += 0.001 - mouse.y * 0.008;

    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const fov = 420;
    const cx = width * 0.65;
    const cy = height * 0.48;

    const projected = [];

    for (let i = 0; i < nodeCount; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;
      n.z += n.vz;

      if (n.x < -280 || n.x > 280) n.vx *= -1;
      if (n.y < -230 || n.y > 230) n.vy *= -1;
      if (n.z < -230 || n.z > 230) n.vz *= -1;

      const x1 = n.x * cosY - n.z * sinY;
      const z1 = n.z * cosY + n.x * sinY;
      const y1 = n.y * cosX - z1 * sinX;
      const z2 = z1 * cosX + n.y * sinX;

      const scale = fov / (fov + z2 + 300);
      const px = cx + x1 * scale;
      const py = cy + y1 * scale;
      const alpha = Math.max(0.08, Math.min(0.85, (z2 + 250) / 500));

      projected.push({ px, py, scale, alpha, color: n.color, isChip: n.isChip, z: z2 });
    }

    for (let i = 0; i < projected.length; i++) {
      for (let j = i + 1; j < projected.length; j++) {
        const p1 = projected[i];
        const p2 = projected[j];
        const dx = p1.px - p2.px;
        const dy = p1.py - p2.py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 110) {
          const lineAlpha = (1 - dist / 110) * 0.22 * Math.min(p1.alpha, p2.alpha);
          ctx.beginPath();
          ctx.strokeStyle = p1.color === '#00e5ff'
            ? `rgba(0, 229, 255, ${lineAlpha})`
            : `rgba(255, 210, 31, ${lineAlpha})`;
          ctx.lineWidth = p1.isChip || p2.isChip ? 1.4 : 0.8;
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        }
      }
    }

    for (let i = 0; i < projected.length; i++) {
      const p = projected[i];
      if (p.px < -20 || p.px > width + 20 || p.py < -20 || p.py > height + 20) continue;

      if (p.isChip) {
        const size = Math.max(3, 7 * p.scale);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.px - size / 2, p.py - size / 2, size, size);
      } else {
        const r = Math.max(1.5, 3.5 * p.scale);
        ctx.beginPath();
        ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
initHero3DCanvas();

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

function initDiwali() {
  const banner = document.getElementById('diwali');
  if (!banner) return;
  let dismissed = false;
  try { dismissed = sessionStorage.getItem('tf-diwali-closed') === '1'; } catch (err) { /* storage blocked */ }
  if (!isDiwaliSeason() || dismissed) return;
  banner.hidden = false;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fireworks inside the banner
  const bannerFw = createFireworks(banner.querySelector('.diwali-canvas'), {
    sideBias: true,
    interval: [450, 1000],
    rays: [36, 56],
    radius: (w, h) => h * (Math.random() * 0.15 + 0.28),
    maxSparks: 700,
  });

  // A see-through fireworks layer over the whole page (never blocks taps or clicks)
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

  if (reduceMotion) {
    bannerFw.still([[0.15, 0.4], [0.85, 0.35]]);
  } else {
    pageFw.start();
    if ('IntersectionObserver' in window) {
      // banner fireworks only while the banner is on screen (saves phone battery)
      new IntersectionObserver(([entry]) => (entry.isIntersecting ? bannerFw.start() : bannerFw.stop())).observe(banner);
    } else {
      bannerFw.start();
    }
  }

  // Closing the greeting stops all fireworks for this visit
  banner.querySelector('.diwali-close').addEventListener('click', () => {
    bannerFw.stop();
    pageFw.stop();
    layer.remove();
    banner.hidden = true;
    try { sessionStorage.setItem('tf-diwali-closed', '1'); } catch (err) { /* storage blocked */ }
  });
}
initDiwali();
