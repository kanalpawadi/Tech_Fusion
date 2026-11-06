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

function initDiwali() {
  const banner = document.getElementById('diwali');
  if (!banner) return;
  let dismissed = false;
  try { dismissed = sessionStorage.getItem('tf-diwali-closed') === '1'; } catch (err) { /* storage blocked */ }
  if (!isDiwaliSeason() || dismissed) return;
  banner.hidden = false;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stopPageFireworks = () => {};

  // Fireworks inside the banner
  const bannerFw = createFireworks(banner.querySelector('.diwali-canvas'), {
    sideBias: true,
    interval: [450, 1000],
    rays: [36, 56],
    radius: (w, h) => h * (Math.random() * 0.15 + 0.28),
    maxSparks: 700,
  });

  if (reduceMotion) {
    bannerFw.still([[0.15, 0.4], [0.85, 0.35]]);
  } else {
    stopPageFireworks = startPageFireworks();
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
    stopPageFireworks();
    banner.hidden = true;
    try { sessionStorage.setItem('tf-diwali-closed', '1'); } catch (err) { /* storage blocked */ }
  });
}
initDiwali();
