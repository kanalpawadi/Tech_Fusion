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

// Project registration -> booking invoice
const reg = document.getElementById('register-form');
const regError = reg.querySelector('.form-error');
const charCount = reg.querySelector('.char-count');
reg.description.addEventListener('input', () => {
  charCount.textContent = `${reg.description.value.length} / 2000`;
});

// Swap "College" / "Company" labels by client type
reg.querySelectorAll('input[name="clientType"]').forEach((r) =>
  r.addEventListener('change', () => {
    const industry = reg.clientType.value === 'Industry';
    reg.querySelectorAll('[data-student]').forEach((el) => { el.hidden = industry; });
    reg.querySelectorAll('[data-industry]').forEach((el) => { el.hidden = !industry; });
  })
);

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
  const mailed = await TFInvoice.sendEmails(booking, invoiceUrl);
  regSubmit.disabled = false;
  regSubmit.textContent = 'Submit & get invoice';

  TFInvoice.navigate(`invoice.html?mail=${mailed ? 'sent' : 'failed'}#${hash}`);
});

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
