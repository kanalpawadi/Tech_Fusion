// In-browser component tests for the Tech Fusion site.
// Usage: serve the project, open the page, then run:
//   await import('/tests/browser_tests.js').then(m => m.run())
// Yields to the event loop without setTimeout, which is throttled in hidden tabs.
const wait = () => new Promise((r) => {
  const c = new MessageChannel();
  c.port1.onmessage = () => r();
  c.port2.postMessage(0);
});
// Waits for an image to finish loading (decode() can hang in hidden tabs).
const loaded = (img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; }));
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

export async function run() {
  const results = [];
  const check = (group, name, ok, detail = '') => results.push({ group, name, ok: !!ok, detail: ok ? '' : String(detail) });
  const isVisible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const errors = [];
  const onErr = (e) => errors.push(e.message);
  window.addEventListener('error', onErr);

  // Capture window.open calls instead of opening tabs
  const opened = [];
  const realOpen = window.open;
  window.open = (url) => { opened.push(url); return null; };

  const w = innerWidth;
  const mobile = w <= 760;

  // ---------- Header ----------
  const nav = $('.nav');
  check('Header', 'header is sticky', getComputedStyle(nav).position === 'sticky');
  check('Header', 'logo visible and links to #top', isVisible($('.nav .logo')) && $('.nav .logo').getAttribute('href') === '#top');
  const navLinks = $$('.nav-links a');
  check('Header', '6 nav links present', navLinks.length === 6, navLinks.length);
  for (const a of navLinks.filter((a) => a.hash)) {
    check('Header', `nav link ${a.hash} has target section`, document.querySelector(a.hash));
  }
  check('Header', 'Register Project button -> #register', $('.nav-links .btn').hash === '#register');

  const toggle = $('.nav-toggle');
  if (mobile) {
    check('Mobile menu', 'hamburger visible on phone', isVisible(toggle));
    check('Mobile menu', 'menu hidden initially', !isVisible($('.nav-links')));
    toggle.click(); await wait(100);
    check('Mobile menu', 'menu opens on tap', isVisible($('.nav-links')));
    check('Mobile menu', 'aria-expanded=true when open', toggle.getAttribute('aria-expanded') === 'true');
    navLinks[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await wait(100);
    check('Mobile menu', 'menu closes after choosing a link', !isVisible($('.nav-links')));
    check('Mobile menu', 'aria-expanded=false when closed', toggle.getAttribute('aria-expanded') === 'false');
    toggle.click(); await wait(50); toggle.click(); await wait(50);
    check('Mobile menu', 'toggle closes menu on second tap', !isVisible($('.nav-links')));
  } else {
    check('Header', 'hamburger hidden on desktop', !isVisible(toggle));
    check('Header', 'nav links visible on desktop', navLinks.every(isVisible));
  }

  // ---------- Hero ----------
  const hero = $('.hero');
  check('Hero', 'heading text', $('.hero h1').textContent.includes('Turning ideas into'));
  const bg = getComputedStyle($('.hero-bg')).backgroundImage;
  check('Hero', 'background photo set', bg.includes('photo-01.jpg'), bg);
  const bgImg = new Image(); bgImg.src = 'assets/photos/photo-01.jpg'; await loaded(bgImg);
  check('Hero', 'background photo loads', bgImg.naturalWidth > 0);
  const [waBtn, exploreBtn] = $$('.hero-cta a');
  check('Hero', 'WhatsApp button -> wa.me with message', /^https:\/\/wa\.me\/917507190468\?text=/.test(waBtn.href), waBtn.href);
  check('Hero', 'WhatsApp opens new tab safely', waBtn.target === '_blank' && waBtn.rel.includes('noopener'));
  check('Hero', 'Explore button -> #services', exploreBtn.hash === '#services');
  check('Hero', '3 badges (rating, stacks, hours)', $$('.hero-badges li').length === 3);
  check('Hero', 'text readable over photo (white on dark)', getComputedStyle($('.hero h1')).color === 'rgb(255, 255, 255)');
  check('Hero', 'yellow highlight on "reality."', getComputedStyle($('.hero h1 .hl')).color === 'rgb(255, 210, 31)');

  // ---------- Marquee strip ----------
  const track = $('.strip-track');
  check('Strip', 'marquee animates', getComputedStyle(track).animationName === 'scroll' || matchMedia('(prefers-reduced-motion: reduce)').matches);
  check('Strip', 'covers ML / DL / Gen AI', ['Machine Learning', 'Deep Learning', 'Generative AI'].every((t) => track.textContent.includes(t)));
  check('Strip', 'does not cause page to scroll sideways', document.documentElement.scrollWidth <= innerWidth);

  // ---------- Services ----------
  const cards = $$('#services .card');
  check('Services', '9 service cards', cards.length === 9, cards.length);
  const titles = cards.map((c) => c.querySelector('h3').textContent);
  for (const t of ['Electronics', 'IoT', 'Software', 'Machine Learning', 'Generative AI', 'Industry', 'B.Tech', 'Training', 'School']) {
    check('Services', `card for "${t}"`, titles.some((x) => x.includes(t)));
  }
  check('Services', 'every card has icon, title, text', cards.every((c) => c.querySelector('svg') && c.querySelector('h3') && c.querySelector('p').textContent.length > 20));
  const featured = $('.card-featured');
  check('Services', 'Gen AI card is black with "New" tag', getComputedStyle(featured).backgroundColor === 'rgb(11, 11, 11)' && featured.querySelector('.tag'));

  // ---------- Tech stack ----------
  const groups = $$('.stack-group');
  check('Tech stack', '6 stack groups', groups.length === 6, groups.length);
  check('Tech stack', 'every group has chips', groups.every((g) => g.querySelectorAll('.chips li').length >= 5));
  const chipText = $$('.chips li').map((c) => c.textContent);
  for (const t of ['React', 'Node.js', 'Django', 'TensorFlow', 'PyTorch', 'LangChain', 'RAG', 'Arduino', 'Flutter']) {
    check('Tech stack', `lists ${t}`, chipText.some((c) => c.includes(t)));
  }
  check('Tech stack', 'no duplicate chips in a group', groups.every((g) => {
    const items = [...g.querySelectorAll('li')].map((l) => l.textContent);
    return new Set(items).size === items.length;
  }));

  // ---------- Projects ----------
  const projectCards = $$('.project');
  check('Projects', '16 project cards', projectCards.length === 16, projectCards.length);
  for (const t of ['RV Fitness', 'Rising Sun', 'Sunbeam']) {
    check('Projects', `removed: ${t}`, !projectCards.some((p) => p.textContent.includes(t)));
  }
  check('Projects', 'all shown by default', projectCards.every((p) => !p.hidden));
  for (const t of ['AgroIntel', 'AI Personal Mentor', 'Amazon Review', 'Chicks', 'Demand IQ', 'Fruit Classification', 'Gas', 'Health', 'MediLing', 'Mess Tracker', 'Paraphrasing', 'Pothole', 'School Bus', 'Streetlight', 'Water', 'Portfolio']) {
    check('Projects', `card: ${t}`, projectCards.some((p) => p.querySelector('h3').textContent.includes(t)));
  }
  check('Projects', 'every card has category, title, text, tech', projectCards.every((p) =>
    p.querySelector('.project-cat') && p.querySelector('h3') && p.querySelector('p').textContent.length > 30 && p.querySelectorAll('.project-tech li').length >= 3));
  const filterBtns = $$('.filter');
  for (const btn of filterBtns) {
    btn.click(); await wait();
    const cat = btn.dataset.filter;
    const shown = projectCards.filter((p) => !p.hidden);
    const expected = projectCards.filter((p) => cat === 'all' || p.dataset.cat.split(' ').includes(cat));
    check('Projects', `filter "${btn.textContent}" shows ${expected.length}`, shown.length === expected.length && shown.length > 0 && shown.every((p) => expected.includes(p)), `${shown.length} shown`);
    check('Projects', `filter "${btn.textContent}" marked active`, btn.classList.contains('active') && btn.getAttribute('aria-pressed') === 'true' && filterBtns.filter((b) => b.classList.contains('active')).length === 1);
    check('Projects', `hidden cards really hidden (${btn.dataset.filter})`, projectCards.filter((p) => p.hidden).every((p) => !isVisible(p)));
  }
  check('Projects', 'Gen AI filter shows Gen AI projects only', (() => {
    filterBtns.find((b) => b.dataset.filter === 'genai').click();
    return projectCards.filter((p) => !p.hidden).every((p) => p.dataset.cat.includes('genai'));
  })());
  check('Projects', '"no projects" message stays hidden', $('.projects-empty').hidden);
  filterBtns[0].click(); await wait();
  check('Projects', '"All" restores every card', projectCards.every((p) => !p.hidden));
  check('Projects', 'CTA links to registration', $('#projects .center a').hash === '#register');

  // ---------- Register form ----------
  const rf = $('#register-form');
  const rErr = rf.querySelector('.form-error');
  const realDownload = TFInvoice.download;
  const downloads = [];
  TFInvoice.download = (b) => downloads.push(b);
  // Stop the redirect to invoice.html and fake the email service — tests never send real email.
  const realNavigate = TFInvoice.navigate;
  const redirects = [];
  TFInvoice.navigate = (url) => redirects.push(url);
  const realFetch = window.fetch;
  const mails = [];
  let mailMode = 'ok';
  window.fetch = async (url, opts) => {
    mails.push({ url, opts, body: JSON.parse(opts.body) });
    if (mailMode === 'network') throw new TypeError('Failed to fetch');
    if (mailMode === 'error') return new Response(JSON.stringify({ success: 'false', message: 'not activated' }), { status: 200 });
    return new Response(JSON.stringify({ success: 'true', message: 'The form was submitted successfully.' }), { status: 200 });
  };

  const fill = (over = {}) => {
    rf.reset();
    const base = {
      fullName: 'Test Student', organisation: 'DKTE College', department: 'B.Tech CSE', email: 'test@example.com',
      phone: '98765 43210', city: 'Ichalkaranji', projectName: 'Smart Parking',
      projectType: 'Mini project',
      description: 'Detect free parking slots with IR sensors and show them on a web page.',
    };
    Object.entries({ ...base, ...over }).forEach(([k, v]) => { rf[k].value = v; });
    rf.agree.checked = over.agree !== false;
  };
  const submit = async () => { downloads.length = 0; redirects.length = 0; mails.length = 0; rf.requestSubmit(); for (let i = 0; i < 5; i++) await wait(); };

  check('Register', 'section is reachable from nav', !!document.querySelector('#register'));
  check('Register', 'Student selected by default', rf.clientType.value === 'Student');
  check('Register', 'shows "College name" for students', isVisible(rf.querySelector('[data-student]')) && !isVisible(rf.querySelector('[data-industry]')));
  rf.querySelector('input[value="Industry"]').click(); await wait();
  check('Register', 'switches to "Company name" for industry', isVisible(rf.querySelector('[data-industry]')) && !isVisible(rf.querySelector('[data-student]')));
  rf.querySelector('input[value="Student"]').click(); await wait();
  const typeRadios = [...rf.querySelectorAll('input[name="projectType"]')];
  check('Register', 'project type is Mini or Mega only', typeRadios.map((r) => r.value).join() === 'Mini project,Mega project');
  check('Register', 'no project type chosen by default', typeRadios.every((r) => !r.checked));
  const projectFields = [...rf.querySelectorAll('.reg-block:nth-child(2) input, .reg-block:nth-child(2) select, .reg-block:nth-child(2) textarea')].map((e) => e.name);
  check('Register', 'project section has only title, type, description', [...new Set(projectFields)].join() === 'projectName,projectType,description', projectFields.join());
  for (const gone of ['category', 'deadline', 'budget', 'techStack', 'extras']) {
    check('Register', `removed field: ${gone}`, !rf.querySelector(`[name="${gone}"]`));
  }
  rf.description.value = 'abc'; rf.description.dispatchEvent(new Event('input'));
  check('Register', 'character counter updates', rf.querySelector('.char-count').textContent === '3 / 2000');

  const invalidCases = [
    ['empty name', { fullName: '' }, 'fullName'],
    ['spaces-only name', { fullName: '   ' }, 'fullName'],
    ['empty college', { organisation: '' }, 'organisation'],
    ['bad email', { email: 'abc@' }, 'email'],
    ['empty phone', { phone: '' }, 'phone'],
    ['short phone', { phone: '98765' }, 'phone'],
    ['phone not starting 6-9', { phone: '1234567890' }, 'phone'],
    ['empty project name', { projectName: '' }, 'projectName'],
    ['no project type', { projectType: '' }, 'projectType'],
    ['empty description', { description: '' }, 'description'],
    ['short description', { description: 'too short' }, 'description'],
    ['not agreed', { agree: false }, 'agree'],
  ];
  for (const [label, over, field] of invalidCases) {
    fill(over);
    await submit();
    check('Register', `blocks ${label}`, !downloads.length && !redirects.length && !mails.length, 'invoice was created');
    const flagged = field === 'projectType'
      ? document.activeElement === typeRadios[0] && rf.querySelector('.reg-type').getAttribute('aria-invalid') === 'true'
      : document.activeElement === rf[field] && rf[field].getAttribute('aria-invalid') === 'true';
    check('Register', `shows error for ${label}`, !rErr.hidden && rErr.textContent.length > 5 && flagged, `error: "${rErr.textContent}", focus: ${document.activeElement && document.activeElement.name}`);
  }

  rf.querySelector('input[value="Mega project"]').click();
  check('Register', 'choosing a type clears its red highlight', !rf.querySelector('.reg-type').hasAttribute('aria-invalid'));
  fill({ projectType: 'Mega project', phone: '+91 98765-43210' });
  await submit();
  check('Register', 'accepts Mega project and +91 phone format', downloads.length === 1 && downloads[0].projectType === 'Mega project', rErr.textContent);
  check('Register', 'error message clears on success', rErr.hidden);

  fill({ fullName: 'Asha <script>alert(1)</script> & Co', description: 'Line one with "quotes" & <b>tags</b>\nLine two — मराठी text ✓' });
  rf.querySelector('input[value="Industry"]').click();
  await submit();
  const bk = downloads[0];
  check('Register', 'valid form creates one booking', downloads.length === 1, rErr.textContent);
  check('Register', 'redirects to invoice after submit', redirects.length === 1 && redirects[0].startsWith('invoice.html?mail=sent#'), redirects[0]);
  check('Register', 'redirect carries the booking', redirects[0] && TFInvoice.decode(redirects[0].split('#')[1]).id === (bk && bk.id));

  // Email
  const m = mails[0];
  check('Email', 'one email request per booking', mails.length === 1, mails.length);
  check('Email', 'sent to techfusionteamwork@gmail.com via FormSubmit', m && m.url === 'https://formsubmit.co/ajax/techfusionteamwork@gmail.com', m && m.url);
  check('Email', 'POST JSON request', m && m.opts.method === 'POST' && m.opts.headers['Content-Type'] === 'application/json');
  check('Email', 'subject has booking ID and project', m && m.body._subject.includes(bk.id) && m.body._subject.includes('Smart Parking'));
  check('Email', 'table layout, no captcha page', m && m.body._template === 'table' && m.body._captcha === 'false');
  check('Email', 'client email set for reply + auto-reply', m && m.body.email === 'test@example.com');
  check('Email', 'all booking details included', m && ['Booking ID', 'Client type', 'Company', 'Branch / Designation', 'Phone', 'City', 'Project', 'Project type', 'Description', 'Invoice link'].every((k) => k in m.body), m && Object.keys(m.body).join());
  check('Email', 'industry client labelled Company (not College)', m && m.body.Company === 'DKTE College' && !('College' in m.body));
  check('Email', 'no removed fields in email', m && ['Category', 'Deadline', 'Budget', 'Tech stack', 'Extras'].every((k) => !(k in m.body)), m && Object.keys(m.body).join());
  check('Email', 'project type in email', m && m.body['Project type'] === 'Mini project');
  check('Email', 'Unicode description intact', m && m.body.Description.includes('मराठी text ✓'));
  const link = m && m.body['Invoice link'];
  check('Email', 'invoice link is an absolute invoice.html URL', link && /^https?:\/\/.+\/invoice\.html#[\w-]+$/.test(link), link);
  check('Email', 'invoice link opens this booking', link && TFInvoice.decode(link.split('#')[1]).id === bk.id);
  const auto = m ? m.body._autoresponse : '';
  check('Email', 'client auto-reply has greeting, ID, project, type, link', [`Hi ${bk.fullName}`, bk.id, 'Smart Parking', 'Type: Mini project', link, '+91 75071 90468'].every((x) => auto.includes(x)));

  fill();
  mailMode = 'error';
  await submit();
  check('Email', 'service error -> still shows invoice, marked failed', downloads.length === 1 && redirects[0] && redirects[0].startsWith('invoice.html?mail=failed#'), redirects[0]);
  mailMode = 'network';
  fill();
  await submit();
  check('Email', 'offline -> still shows invoice, marked failed', downloads.length === 1 && redirects[0] && redirects[0].startsWith('invoice.html?mail=failed#'), redirects[0]);
  check('Email', 'submit button re-enabled after sending', !rf.querySelector('.reg-submit').disabled && rf.querySelector('.reg-submit').textContent === 'Submit & get invoice');
  mailMode = 'ok';
  check('Register', 'booking ID format TF-YYMMDD-XXXX', bk && /^TF-\d{6}-[A-Z0-9]{4}$/.test(bk.id), bk && bk.id);
  check('Register', 'booking keeps all details', bk && bk.clientType === 'Industry' && bk.organisation === 'DKTE College' && bk.projectName === 'Smart Parking' && bk.projectType === 'Mini project' && bk.description.includes('मराठी'));
  check('Register', 'phone normalised to +91 format', bk && bk.phone === '+91 98765 43210', bk && bk.phone);
  check('Register', 'booking has no removed fields', bk && ['category', 'deadline', 'budget', 'techStack', 'extras'].every((k) => !(k in bk)), bk && Object.keys(bk).join());
  check('Register', 'two bookings get different IDs', new Set(Array.from({ length: 50 }, () => TFInvoice.newBookingId())).size >= 49);

  // Invoice content
  const round = bk && TFInvoice.decode(TFInvoice.encode(bk));
  check('Invoice', 'booking survives URL encoding (Unicode, quotes, newlines)', round && JSON.stringify(round) === JSON.stringify(bk));
  const docHtml = bk ? TFInvoice.renderDocument(bk) : '';
  check('Invoice', 'is a complete HTML document', docHtml.startsWith('<!DOCTYPE html>') && docHtml.includes('</html>') && docHtml.includes('<style>'));
  check('Invoice', 'escapes typed HTML / script', !docHtml.includes('<script>alert(1)</script>') && docHtml.includes('&lt;script&gt;') && !docHtml.includes('<b>tags</b>'));
  const parsed = new DOMParser().parseFromString(docHtml, 'text/html');
  check('Invoice', 'no script tags inside the invoice', parsed.querySelectorAll('script').length === 0);
  const invText = parsed.body.textContent;
  for (const [label, val] of [['booking ID', bk && bk.id], ['name', 'Asha <script>alert(1)</script> & Co'], ['company', 'DKTE College'], ['email', 'test@example.com'], ['phone', '+91 98765 43210'], ['project', 'Smart Parking'], ['type', 'Mini project'], ['Unicode description', 'मराठी text ✓'], ['status', 'Awaiting confirmation'], ['business phone', '+91 75071 90468']]) {
    check('Invoice', `shows ${label}`, invText.includes(val), val);
  }
  check('Invoice', 'labels industry client as Company', invText.includes('Company: DKTE College'));
  check('Invoice', 'no deadline / budget / category on invoice', !/Deadline|Time left|Budget|Category|Preferred stack/.test(invText));
  check('Invoice', 'one line item: the project', parsed.querySelectorAll('tbody tr').length === 1);
  check('Invoice', 'file name uses booking ID', bk && TFInvoice.fileName(bk) === `TechFusion-Invoice-${bk.id}.html`);
  const wa = bk ? TFInvoice.whatsappText(bk) : '';
  check('Invoice', 'WhatsApp message has ID, name, project, type', bk && [bk.id, bk.fullName, bk.projectName, 'Type: Mini project'].every((x) => wa.includes(x)) && !wa.includes('Deadline'));

  window.fetch = realFetch;
  TFInvoice.navigate = realNavigate;
  TFInvoice.download = realDownload;
  rf.reset();
  rf.querySelector('input[value="Student"]').click();
  rErr.hidden = true;

  // ---------- Process ----------
  const steps = $$('.steps li');
  check('Process', '5 steps numbered 01–05', steps.length === 5 && steps.every((s, i) => s.querySelector('.step-num').textContent === `0${i + 1}`));

  // ---------- Training ----------
  const tImgs = $$('#training img');
  for (const img of tImgs) { img.loading = 'eager'; await loaded(img); }
  check('Training', '2 training photos load', tImgs.length === 2 && tImgs.every((i) => i.naturalWidth > 0));
  check('Training', '5 bullet points', $$('.ticks li').length === 5);
  check('Training', 'mentions ML/DL/Gen AI track', $('.ticks').textContent.includes('Gen AI'));
  check('Training', 'enquiry button -> WhatsApp', /wa\.me\/917507190468/.test($('#training .btn').href));

  // ---------- Gallery ----------
  const figs = $$('.gallery figure');
  check('Gallery', '13 photos', figs.length === 13, figs.length);
  const gImgs = figs.map((f) => f.querySelector('img'));
  for (const img of gImgs) { img.loading = 'eager'; }
  await Promise.all(gImgs.map(loaded));
  const broken = gImgs.filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src'));
  check('Gallery', 'all gallery photos load', !broken.length, broken.join(', '));
  check('Gallery', 'photos fill their tiles (object-fit: cover)', gImgs.every((i) => getComputedStyle(i).objectFit === 'cover'));

  const lb = $('#lightbox');
  check('Lightbox', 'hidden by default', lb.hidden && !isVisible(lb));
  figs[2].click(); await wait(100);
  check('Lightbox', 'opens when a photo is clicked', !lb.hidden && isVisible(lb));
  check('Lightbox', 'shows the clicked photo', lb.querySelector('img').src === gImgs[2].src);
  check('Lightbox', 'copies alt text', lb.querySelector('img').alt === gImgs[2].alt);
  lb.querySelector('img').click(); await wait(50);
  check('Lightbox', 'stays open when clicking the photo itself', !lb.hidden);
  lb.querySelector('.lb-close').click(); await wait(50);
  check('Lightbox', 'closes with × button', lb.hidden);
  figs[0].click(); await wait(50);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await wait(50);
  check('Lightbox', 'closes with Escape key', lb.hidden);
  figs[5].click(); await wait(50);
  lb.dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait(50);
  check('Lightbox', 'closes when clicking dark background', lb.hidden);
  check('Gallery', 'Instagram button link', $('#gallery .btn').href.startsWith('https://www.instagram.com/tech_fusion_pvt'));

  // ---------- Review ----------
  check('Review', '5 stars shown', $('.stars').textContent.trim() === '★★★★★');
  check('Review', 'quote and reviewer name', $('.review blockquote').textContent.includes('Arduino/ESP32') && $('.review-by').textContent.includes('Onkar Patil'));

  // ---------- Contact ----------
  const contactText = $('.contact-list').textContent;
  check('Contact', 'both phone numbers', contactText.includes('75071 90468') && contactText.includes('96896 33915'));
  check('Contact', 'address with PIN 416115', contactText.includes('Ichalkaranji') && contactText.includes('416115'));
  check('Contact', 'hours 9 am – 9 pm', contactText.includes('9:00 am – 9:00 pm'));
  check('Contact', 'Get Directions -> Google Maps place', $('#contact .btn-outline').href.includes('google.com/maps/place/Tech_Fusion'));
  const map = $('.map iframe');
  check('Map', 'map iframe points at shop coordinates', map.src.includes('16.6847592,74.4734028'));
  check('Map', 'map has a title for screen readers', !!map.title);
  check('Map', 'map is visible with height', map.getBoundingClientRect().height >= 300);

  // ---------- Enquiry form ----------
  const form = $('#enquiry');
  const nameInput = form.elements.name;
  form.reset();
  check('Form', 'empty name is invalid', !form.checkValidity());
  check('Form', '8 project types in dropdown', form.elements.type.options.length === 8);
  opened.length = 0;
  nameInput.value = 'Test Student';
  form.elements.type.value = 'Generative AI project';
  form.elements.msg.value = 'Chatbot using RAG & PDFs, due 15/12';
  form.requestSubmit(); await wait(50);
  const sent = opened[0] || '';
  const text = decodeURIComponent((sent.split('text=')[1] || ''));
  check('Form', 'submit opens WhatsApp to 917507190468', sent.startsWith('https://wa.me/917507190468?text='), sent);
  check('Form', 'message includes name', text.includes('Name: Test Student'), text);
  check('Form', 'message includes chosen project type', text.includes('Looking for: Generative AI project'), text);
  check('Form', 'special characters (& /) survive encoding', text.includes('RAG & PDFs, due 15/12'), text);
  opened.length = 0;
  form.elements.msg.value = '';
  form.requestSubmit(); await wait(50);
  check('Form', 'details are optional', opened.length === 1 && !decodeURIComponent(opened[0]).includes('Details:'));
  opened.length = 0;
  nameInput.value = '   ';
  form.requestSubmit(); await wait(50);
  check('Form', 'name of only spaces is rejected', opened.length === 0, 'form was sent with a blank name');
  form.reset();

  // ---------- Footer & floating button ----------
  check('Footer', 'year is current', $('#year').textContent === String(new Date().getFullYear()));
  check('Footer', 'logo links to top', $('.footer .logo').getAttribute('href') === '#top');
  const fab = $('.wa-float');
  check('WhatsApp button', 'fixed in bottom-right corner', getComputedStyle(fab).position === 'fixed' && fab.getBoundingClientRect().right <= innerWidth);
  check('WhatsApp button', 'links to WhatsApp', fab.href === 'https://wa.me/917507190468');
  check('WhatsApp button', 'has accessible label', !!fab.getAttribute('aria-label'));
  check('WhatsApp button', 'tap target at least 44px', fab.offsetWidth >= 44);

  // ---------- Scroll reveal ----------
  const reveals = $$('.reveal');
  check('Animation', 'reveal applied to sections', reveals.length > 30, reveals.length);

  // ---------- Layout ----------
  check('Layout', `no sideways scroll at ${w}px`, document.documentElement.scrollWidth <= innerWidth, document.documentElement.scrollWidth);
  // .filters is an intentional sideways-scrolling row on phones
  const offenders = $$('body *').filter((e) => !e.closest('.strip, .lightbox, .filters') && isVisible(e) && e.getBoundingClientRect().right > innerWidth + 1);
  check('Layout', 'no element overflows the screen', !offenders.length, offenders.slice(0, 5).map((e) => e.className || e.tagName).join(', '));
  const smallTaps = $$('a, button').filter((e) => isVisible(e) && !e.closest('.contact-list') && e.getBoundingClientRect().height < 32);
  check('Layout', 'buttons/links are big enough to tap', !smallTaps.length, smallTaps.map((e) => e.textContent.trim().slice(0, 20) || e.className).join(' | '));
  const fontSmall = $$('p, li, a, label').filter((e) => isVisible(e) && parseFloat(getComputedStyle(e).fontSize) < 12);
  check('Layout', 'no text smaller than 12px', !fontSmall.length, fontSmall.slice(0, 5).map((e) => e.textContent.trim().slice(0, 20)).join(' | '));
  check('Fonts', 'Space Grotesk loaded', document.fonts.check('700 16px "Space Grotesk"'));
  check('Fonts', 'Inter loaded', document.fonts.check('400 16px Inter'));

  check('Console', 'no JavaScript errors', !errors.length, errors.join('; '));

  window.open = realOpen;
  window.removeEventListener('error', onErr);
  const failed = results.filter((r) => !r.ok);
  return { width: w, passed: results.length - failed.length, total: results.length, failed };
}

// Tests for invoice.html. Open invoice.html (with or without a booking in the hash), then:
//   await import('/tests/browser_tests.js?v=' + Date.now()).then(m => m.runInvoicePage())
export async function runInvoicePage() {
  const results = [];
  const check = (group, name, ok, detail = '') => results.push({ group, name, ok: !!ok, detail: ok ? '' : String(detail) });
  const T = window.TFInvoice;
  const hasBooking = location.hash.length > 1;

  if (!hasBooking) {
    check('Invoice page', 'shows "not found" without a booking', !$('#missing').hidden);
    check('Invoice page', 'hides toolbar without a booking', $('#bar').hidden);
    check('Invoice page', 'offers link back to the form', $('#missing a').getAttribute('href') === 'index.html#register');
  } else {
    const b = T.decode(location.hash.slice(1));
    check('Invoice page', 'renders the invoice', !!$('.tfi') && $('.tfi').textContent.includes(b.id));
    check('Invoice page', 'page title has booking ID', document.title.includes(b.id));
    check('Invoice page', 'success banner with booking ID', !$('#success').hidden && $('#success-msg').textContent.includes(b.id));
    check('Invoice page', 'toolbar visible', !$('#bar').hidden);
    const mail = new URLSearchParams(location.search).get('mail');
    const st = $('#mail-status');
    if (mail === 'sent') check('Invoice page', 'shows "emailed to <client>"', !st.hidden && st.textContent.includes(b.email) && st.classList.contains('ok'));
    else if (mail === 'failed') check('Invoice page', 'shows email-failed warning pointing to WhatsApp', !st.hidden && st.textContent.includes('WhatsApp') && st.classList.contains('warn'));
    else check('Invoice page', 'opened from email link: no status, "Your booking invoice"', st.hidden && $('#success-title').textContent === 'Your booking invoice');
    check('Invoice page', 'footer shows business email', $('.tfi-foot').textContent.includes('techfusionteamwork@gmail.com'));
    check('Invoice page', 'Back link -> index.html', $('#bar a').getAttribute('href') === 'index.html');
    const wa = $('#whatsapp').href;
    check('Invoice page', 'WhatsApp button -> 917507190468 with booking ID', wa.startsWith('https://wa.me/917507190468?text=') && decodeURIComponent(wa).includes(b.id));
    check('Invoice page', 'WhatsApp opens new tab safely', $('#whatsapp').target === '_blank' && $('#whatsapp').rel.includes('noopener'));

    // Download button builds a self-contained HTML file named after the booking
    const realClick = HTMLAnchorElement.prototype.click;
    let got = null;
    HTMLAnchorElement.prototype.click = function () { got = { name: this.download, href: this.href }; };
    $('#download').click();
    HTMLAnchorElement.prototype.click = realClick;
    check('Invoice page', 'Download creates TechFusion-Invoice-<ID>.html', got && got.name === `TechFusion-Invoice-${b.id}.html`, got && got.name);
    if (got) {
      const text = await (await fetch(got.href)).text().catch(() => '');
      check('Invoice page', 'downloaded file is a full invoice', text.startsWith('<!DOCTYPE html>') && text.includes(b.projectName.replace(/&/g, '&amp;')) && text.includes('BOOKING INVOICE'));
    }

    const realPrint = window.print;
    let printed = false;
    window.print = () => { printed = true; };
    $('#print').click();
    window.print = realPrint;
    check('Invoice page', 'Print / Save PDF opens print dialog', printed);
    check('Invoice page', 'toolbar hidden when printing', [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.media && r.media.mediaText === 'print' && r.cssText.includes('.bar')); } catch { return false; } }));
    check('Invoice page', 'no sideways scroll', document.documentElement.scrollWidth <= innerWidth, document.documentElement.scrollWidth);
  }

  const failed = results.filter((r) => !r.ok);
  return { width: innerWidth, passed: results.length - failed.length, total: results.length, failed };
}
