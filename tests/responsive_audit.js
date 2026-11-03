// Responsive layout audit. Serve the project, open a page, set the window width, then run:
//   await import('/tests/responsive_audit.js?v=' + Date.now()).then(m => m.audit())
// Returns every problem found at the current width.
export async function audit() {
  const w = innerWidth;
  const touch = w <= 1024;
  const problems = [];
  const label = (e) => (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '') || e.tagName.toLowerCase();
  const text = (e) => (e.textContent || e.value || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30);
  const visible = (e) => {
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && !e.closest('[hidden]');
  };
  const add = (kind, e, detail) => problems.push({ kind, el: label(e), text: text(e), detail });
  const all = [...document.querySelectorAll('body *')].filter(visible);

  // 1. Sideways scrolling of the whole page
  if (document.documentElement.scrollWidth > w) problems.push({ kind: 'page scrolls sideways', detail: `${document.documentElement.scrollWidth}px > ${w}px` });

  // 2. Elements sticking out past the screen edge (intentional scrollers excluded)
  for (const e of all) {
    if (e.closest('.strip, .filters, .lightbox, svg')) continue;
    const r = e.getBoundingClientRect();
    if (r.right > w + 1 || r.left < -1) add('sticks out of screen', e, `left ${Math.round(r.left)}, right ${Math.round(r.right)}`);
  }

  // 3. Text cut off inside its own box (long words, fixed widths, nowrap)
  for (const e of all.filter((e) => /^(H1|H2|H3|P|A|BUTTON|LABEL|LI|SPAN|STRONG|BLOCKQUOTE|LEGEND)$/.test(e.tagName))) {
    if (e.closest('.strip, .filters, svg')) continue;
    if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'visible') add('text clipped', e, `${e.scrollWidth} > ${e.clientWidth}`);
  }

  // 3b. Text spilling outside a button's box (overflow: visible hides this from check 3)
  for (const e of all.filter((e) => e.matches('.pill, .btn, .filter'))) {
    const r = e.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(e);
    const t = range.getBoundingClientRect();
    if (t.left < r.left - 1 || t.right > r.right + 1) add('text spills out of button', e, `${Math.round(t.width)}px text in ${Math.round(r.width)}px button`);
  }

  // 4. Tap targets too small on touch screens (Apple/Google guidance: ~44px)
  if (touch) {
    for (const e of all.filter((e) => e.matches('a, button, input:not([type=hidden]), select, textarea, .pill, .check'))) {
      if (e.closest('p, .contact-list li, blockquote')) continue; // inline text links
      if (e.matches('input[type=radio], input[type=checkbox]') && e.closest('label')) continue; // the whole label is the target
      const r = e.getBoundingClientRect();
      if (r.height < 40 || r.width < 40) add('tap target too small', e, `${Math.round(r.width)}×${Math.round(r.height)}`);
    }
  }

  // 5. Form fields under 16px make iPhones zoom in when tapped
  for (const e of all.filter((e) => e.matches('input:not([type=radio]):not([type=checkbox]), select, textarea'))) {
    const fs = parseFloat(getComputedStyle(e).fontSize);
    if (fs < 16) add('field text < 16px (iPhone zooms)', e, `${fs}px`);
  }

  // 6. Tiny text
  for (const e of all.filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) {
    const fs = parseFloat(getComputedStyle(e).fontSize);
    if (fs < 12) add('text smaller than 12px', e, `${fs}px`);
  }

  // 7. Squashed or stretched images
  for (const img of [...document.images].filter(visible)) {
    if (!img.complete && img.loading === 'lazy') continue; // not scrolled into view yet
    if (!img.naturalWidth) { add('image not loaded', img, img.src); continue; }
    if (getComputedStyle(img).objectFit === 'cover') continue;
    const r = img.getBoundingClientRect();
    const ratio = (r.width / r.height) / (img.naturalWidth / img.naturalHeight);
    if (Math.abs(ratio - 1) > 0.03) add('image distorted', img, ratio.toFixed(2));
  }

  // 8. Headings that take too many lines (look broken on small screens)
  for (const h of all.filter((e) => /^H[12]$/.test(e.tagName))) {
    const lh = parseFloat(getComputedStyle(h).lineHeight) || parseFloat(getComputedStyle(h).fontSize) * 1.2;
    const lines = Math.round(h.getBoundingClientRect().height / lh);
    if (lines > 5) add('heading wraps onto many lines', h, `${lines} lines`);
  }

  // 9. Things overlapping the fixed WhatsApp button's spot are fine; check it doesn't cover the submit buttons when scrolled to them
  const fab = document.querySelector('.wa-float');
  if (fab && visible(fab)) {
    const f = fab.getBoundingClientRect();
    document.documentElement.style.scrollBehavior = 'auto';
    for (const btn of document.querySelectorAll('.reg-submit, .enquiry button')) {
      btn.scrollIntoView({ block: 'end' });
      window.dispatchEvent(new Event('scroll')); // hidden/background tabs delay real scroll events
      await new Promise((r) => setTimeout(r, 300)); // let the page react (e.g. hide the button)
      if (getComputedStyle(fab).pointerEvents === 'none') continue; // button is hidden while the form is on screen
      const r = btn.getBoundingClientRect();
      const fr = fab.getBoundingClientRect();
      if (r.right > fr.left && r.left < fr.right && r.bottom > fr.top && r.top < fr.bottom) add('WhatsApp button covers', btn, '');
    }
    window.scrollTo(0, 0);
    void f;
  }

  return { width: w, height: innerHeight, problems };
}
