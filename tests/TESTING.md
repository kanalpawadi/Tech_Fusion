# Tech Fusion site — test report

Last run: 2026-10-31.

## How to run

1. Static checks (no browser needed):
   ```
   python tests/static_check.py
   ```
2. Component tests in the browser. Serve the project folder (`python -m http.server 5173`), open http://localhost:5173, open DevTools console, and run:
   ```js
   await import('/tests/browser_tests.js?v=' + Date.now()).then(m => m.run())
   ```
   Repeat at different window widths (DevTools device toolbar) to cover phone, tablet and desktop.
3. Invoice page tests. Open `invoice.html` (no booking) or the page you land on after registering a project, then run:
   ```js
   await import('/tests/browser_tests.js?v=' + Date.now()).then(m => m.runInvoicePage())
   ```

## Results (round 2 — projects, registration form, invoice)

| Suite | Width | Result |
|---|---|---|
| Static checks | — | 52 / 52 pass |
| Browser components | 1280 px (desktop) | 207 / 207 pass |
| Browser components | 768 px (tablet) | 207 / 207 pass |
| Browser components | 375 px (phone) | 212 / 212 pass |
| Browser components | 320 px (small phone) | 212 / 212 pass |
| Invoice page, with booking | 1280 / 375 / 320 px | 12 / 12 pass each |
| Invoice page, without booking | 320 px | 3 / 3 pass |
| Console errors | — | none |

Phone runs include 5 extra mobile-menu tests.

### Round 2 coverage

- **Projects:** 16 cards, each with category, title, description and tech; all 6 filter buttons show exactly the right cards, only one is active, hidden cards are truly hidden, "All" restores everything.
- **Registration form:** Student/Industry switches "College" ↔ "Company"; deadline can't be in the past; 14 invalid inputs are each blocked with a message and focus on the wrong field (empty/space-only name, college, bad email, short / non-Indian phone, missing project name/category/type/deadline, past deadline, short description, not agreed); `+91` phone formats accepted; character counter.
- **Booking & invoice:** ID format `TF-YYMMDD-XXXX`, unique IDs, all details saved, phone normalised, extras saved; booking survives the URL with Unicode (मराठी), quotes and new lines; typed HTML/`<script>` is shown as text, never run; invoice shows every field, readable deadline, correct days left; WhatsApp message carries ID, name, project and deadline.
- **Invoice page:** renders with booking ID in title and banner; Download creates `TechFusion-Invoice-<ID>.html` containing the full invoice; Print opens the print dialog and hides the toolbar; WhatsApp button; "not found" page when opened without a booking.

### Round 2 bugs found and fixed

1. **Phone field's `pattern` was an invalid regex in modern browsers** (console error). Removed — the phone is validated in `script.js`. Static check added so it can't come back.
2. **Invoice toolbar covered ~40% of a phone screen and stuck while scrolling.** Now a compact 2-column grid that scrolls away on phones.
3. **Booking ID wrapped onto two lines on phones.** Smaller size on small screens.

## What is covered

- **Static:** balanced HTML, title/description/viewport/lang, unique ids, every `#anchor` resolves, every local image/CSS/JS file exists, alt text on all images, `noopener` on new-tab links, valid `tel:` numbers, all WhatsApp links use the same number, form labels, JS selectors exist in HTML, every class is styled, image file sizes.
- **Header:** sticky, logo, 6 links each reach a section, Call Now number; hamburger opens/closes, closes after choosing a link, `aria-expanded` kept in sync.
- **Hero:** heading, background photo loads, WhatsApp button (pre-filled message, new tab), Explore button, badges, colours.
- **Strip:** animates, lists ML/DL/Gen AI, no sideways scroll.
- **Services:** 9 cards incl. Gen AI ("New"), Software, ML/DL, Industry, B.Tech; each has icon/title/text.
- **Tech stack:** 6 groups, key technologies present, no duplicate chips.
- **Process / Training:** 5 numbered steps; training photos load; bullets; enquiry button.
- **Gallery & lightbox:** 13 photos load; opens on click with correct photo + alt; stays open when clicking the photo; closes with ×, Escape, and background click; Instagram link.
- **Review, Contact, Map:** stars, quote, both phone numbers, address + PIN, hours, directions link, map coordinates and title.
- **Enquiry form:** blank name blocked, spaces-only name blocked, 8 project types, WhatsApp message contains name/type/details, `&` and `/` survive encoding, details optional.
- **Footer & floating WhatsApp:** current year, fixed position, label, 44 px tap target.
- **Layout:** no overflow, tap targets ≥ 32 px, no text under 12 px, fonts loaded, no JS errors.

## Bugs found and fixed

1. **Enquiry could be sent with a name of only spaces.** Now trimmed and blocked with the browser's "fill in this field" message (`script.js`).
2. **Header menu links were ~25 px tall** — hard to click. Added padding (`styles.css`).
3. **Five photos were 390–505 KB**, slowing mobile loading. Resized to max 1280 px; page images now total ~1.1 MB. Originals kept in `assets/originals/`.
4. **Browsers kept old CSS/JS after updates.** Added `?v=2` to the stylesheet and script links — bump this number whenever you change those files.
5. **`/favicon.ico` returned 404.** Added `favicon.ico` and `apple-touch-icon.png`.

## Not covered by automated tests

- Real phones (iPhone Safari, Android Chrome) — tested with browser emulation only.
- Whether the WhatsApp links open the WhatsApp app on a phone (tests confirm the link and message text are correct).
- Embedded Google Map rendering (only its address/coordinates are checked).
- Automated tests use a fake email service; real delivery was checked by hand once (see Round 3, live test).

## Round 3 — booking emails

Each registration is POSTed to FormSubmit (`https://formsubmit.co/ajax/techfusionteamwork@gmail.com`):
- **Tech Fusion** gets an email with every booking detail in a table and the invoice link; *Reply* goes straight to the client.
- **The client** gets an automatic plain-text reply with booking ID, project, deadline and a link to their HTML invoice.
- If the email can't be sent (offline, service error, not activated), the invoice still appears, with a warning asking the client to send it on WhatsApp.

| Suite | Width | Result |
|---|---|---|
| Static checks | — | 55 / 55 pass |
| Browser components | 1280 / 768 px | 224 / 224 pass |
| Browser components | 375 / 320 px | 229 / 229 pass |
| Invoice page: emailed / failed / opened from email link | 375 px | 14 / 14 pass each |

New email tests (all with a fake email service — no real emails sent): one request per booking to the right address, POST JSON, subject with ID and project, table template, client address for reply/auto-reply, every detail included, Company vs College label, extras, Unicode, absolute invoice link that opens the same booking, auto-reply content, service-error and offline both still show the invoice marked "failed", submit button resets.

**One-time activation (must be done by Tech Fusion):** after the site is online, submit one test booking. FormSubmit emails an *Activate Form* link to techfusionteamwork@gmail.com — click it. Until then, emails are not delivered and clients see the WhatsApp fallback message.

**Limits:** the client's auto-reply is plain text with a link to the invoice (FormSubmit can't attach files from this kind of form). The invoice link only works for others once the site is on a public web address — on `localhost` it opens only on this computer. Booking details pass through FormSubmit, a third-party service.

### Live test (2026-10-31)

1. Test booking 1 → FormSubmit replied "This form needs Activation" and emailed the activation link. The site correctly showed the invoice with the WhatsApp fallback warning.
2. Activation link clicked by Tech Fusion.
3. Test booking 2 (`TF-261031-WCA1`, client email set to techfusionteamwork@gmail.com) → FormSubmit replied "The form was submitted successfully"; invoice page showed "Confirmation emailed". **Both the booking email and the client auto-reply arrived in the inbox** (confirmed by Tech Fusion).

Activation was done while the site ran on `localhost`. When the site goes online at its own address, FormSubmit may send one more "Activate Form" email — click it once.

## Round 4 — simpler registration form (2026-11-03)

Project details now ask only for **project title**, **Mini / Mega project** and **description** (category, deadline, budget, tech stack and extras removed from the form, invoice, WhatsApp text and emails).

| Suite | Width | Result |
|---|---|---|
| Static checks | — | 64 / 64 pass |
| Browser components | 1280 / 768 px | 224 / 224 pass |
| Browser components | 375 / 320 px | 229 / 229 pass |

## Round 5 — backup email service (2026-11-03)

FormSubmit had a full outage (Cloudflare 522 on every page, from two networks). Added **Web3Forms** as a backup: if FormSubmit fails, the booking is sent to techfusionteamwork@gmail.com through Web3Forms (subject ends "(backup)", reply-to is the client). The free Web3Forms plan has no client auto-reply, so the invoice page tells the client "Tech Fusion has received your booking… keep this invoice". If both fail, the WhatsApp fallback message shows.

| Suite | Width | Result |
|---|---|---|
| Static checks | — | 66 / 66 pass |
| Browser components | 1280 / 768 px | 234 / 234 pass |
| Browser components | 375 / 320 px | 239 / 239 pass |
| Invoice page, backup mode | 320 px | 14 / 14 pass |

New tests (fake services only): backup not used when FormSubmit works; FormSubmit 522 → Web3Forms with access key, "(backup)" subject, client reply-to, all details, no FormSubmit-only fields; both failing or offline → "failed"; no key → backup skipped.

### Live backup test (2026-11-03)

Test booking `TF-261103-11TJ` from https://techfusion-ichalkaranji.netlify.app while FormSubmit was down: FormSubmit timed out after 8 s, Web3Forms accepted it in 1.6 s, invoice page showed the "received your booking" message, and **the "(backup)" email arrived in techfusionteamwork@gmail.com** (confirmed by Tech Fusion).
