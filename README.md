# Tech Fusion — website

Website for **Tech Fusion**, Ichalkaranji: mini & mega engineering projects, industry projects, training and internships across IoT, full-stack software, ML, deep learning and Generative AI.

**Live site:** https://techfusion-ichalkaranji.netlify.app

Plain HTML, CSS and JavaScript, so there's no build step or framework.

## Pages

| File | What it is |
|---|---|
| `index.html` | Main page: services, tech stack, projects (with filters), process, training, gallery, project registration form, review, contact |
| `invoice.html` | Booking invoice shown after someone registers a project |
| `invoice.js` | Builds the invoice and sends the booking emails (shared by both pages) |
| `fireworks.js` | Diwali fireworks shared by both pages |
| `script.js` | Menu, gallery, project filters, enquiry and registration forms |
| `styles.css` | Black & yellow theme |

## Festival banner

A "Happy Diwali" banner with fireworks shows under the menu until the date set in `DIWALI_LAST_DAY` (top of the Diwali section in `script.js`, currently `2026-11-15`). After that date it hides itself — no need to remove it. Change the date (and the text in `index.html`) to reuse it next year.

## Project bookings

The registration form:
1. creates a booking ID (`TF-YYMMDD-XXXX`) and downloads an HTML invoice,
2. emails the booking to **techfusionteamwork@gmail.com** through [FormSubmit](https://formsubmit.co) and auto-replies to the client with a link to their invoice,
3. opens `invoice.html`, where the client can download, print or send the booking on WhatsApp.

If the email can't be sent, the client is asked to send the booking on WhatsApp instead. FormSubmit needs a one-time "Activate Form" click for each new web address the site runs on.

## Run locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

## Tests

```bash
python tests/static_check.py
```

Browser tests and the full report: [tests/TESTING.md](tests/TESTING.md).

## Publish

```bash
bash deploy.sh
```

Copies the site into `dist/` and publishes it to Netlify. Use `--draft` for a preview link. When you change `styles.css`, `script.js` or `invoice.js`, raise the `?v=` number where that file is linked in `index.html` / `invoice.html` so visitors get the new version.
