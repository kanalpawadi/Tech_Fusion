// Booking invoice: builds the confirmation invoice shown after a project is registered.
// Shared by index.html (to create the booking + download) and invoice.html (to display it).
(function () {
  const BUSINESS = {
    name: 'Tech Fusion',
    phone: '+91 75071 90468',
    phone2: '+91 96896 33915',
    whatsapp: '917507190468',
    address: 'Sangli Road, near Badbade Hospital, Rajwada, Ichalkaranji, Maharashtra 416115',
    instagram: '@tech_fusion_pvt',
    email: 'techfusionteamwork@gmail.com',
  };

  // FormSubmit forwards each booking to Tech Fusion's inbox and auto-replies to the client.
  // The very first submission sends an activation email to BUSINESS.email that must be clicked once.
  const MAIL_ENDPOINT = `https://formsubmit.co/ajax/${BUSINESS.email}`;

  // Backup when FormSubmit is down: Web3Forms delivers the booking to Tech Fusion only (no client auto-reply on the free plan).
  // The access key is public by design; leave it empty to switch the backup off.
  const BACKUP = {
    endpoint: 'https://api.web3forms.com/submit',
    accessKey: '52d1851d-042a-42e7-a43d-a26cedfd09fe',
  };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Unicode-safe base64url, so bookings survive in the URL hash.
  function encode(data) {
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decode(str) {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  }

  function newBookingId(date = new Date()) {
    const ymd = date.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
    return `TF-${ymd}-${rand}`;
  }

  const fmtDate = (iso) => new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  function fileName(b) {
    return `TechFusion-Invoice-${b.id}.html`;
  }

  function whatsappText(b) {
    return [
      `Hi Tech Fusion, I registered a project.`,
      `Booking ID: ${b.id}`,
      `Name: ${b.fullName} (${b.clientType})`,
      `${b.clientType === 'Industry' ? 'Company' : 'College'}: ${b.organisation}`,
      `Project: ${b.projectName}`,
      `Type: ${b.projectType}`,
      'Please confirm my booking.',
    ].join('\n');
  }

  function clientEmailText(b, invoiceUrl) {
    return [
      `Hi ${b.fullName},`,
      '',
      'Thank you for registering your project with Tech Fusion!',
      '',
      `Booking ID: ${b.id}`,
      `Project: ${b.projectName}`,
      `Type: ${b.projectType}`,
      '',
      'View or download your booking invoice here:',
      invoiceUrl,
      '',
      `Our team will review your requirements and contact you on ${b.phone} within 24 hours with the final quote.`,
      `Please quote booking ID ${b.id} in every message.`,
      '',
      'Tech Fusion, Ichalkaranji',
      `WhatsApp: ${BUSINESS.phone}`,
    ].join('\n');
  }

  // POSTs JSON and resolves true only when the service reports success. Never throws.
  async function postJSON(url, payload, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      return res.ok && String(data.success) === 'true';
    } catch (err) {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  // Emails the booking to Tech Fusion and a confirmation to the client.
  // Resolves 'sent' (FormSubmit), 'backup' (Web3Forms, Tech Fusion only) or 'failed'. Never throws.
  async function sendEmails(b, invoiceUrl, timeoutMs = 8000) {
    const details = {
      'Booking ID': b.id,
      'Client type': b.clientType,
      [b.clientType === 'Industry' ? 'Company' : 'College']: b.organisation,
      'Branch / Designation': b.department || '-',
      Phone: b.phone,
      City: b.city || '-',
      Project: b.projectName,
      'Project type': b.projectType,
      Description: b.description,
      'Invoice link': invoiceUrl,
    };
    const subject = `New project booking ${b.id} — ${b.projectName}`;

    const sent = await postJSON(MAIL_ENDPOINT, {
      _subject: subject,
      _template: 'table',
      _captcha: 'false',
      _autoresponse: clientEmailText(b, invoiceUrl),
      email: b.email,
      name: b.fullName,
      ...details,
    }, timeoutMs);
    if (sent) return 'sent';

    if (!BACKUP.accessKey) return 'failed';
    const backedUp = await postJSON(BACKUP.endpoint, {
      access_key: BACKUP.accessKey,
      subject: `${subject} (backup)`,
      from_name: 'Tech Fusion website',
      replyto: b.email,
      name: b.fullName,
      email: b.email,
      ...details,
    }, timeoutMs);
    return backedUp ? 'backup' : 'failed';
  }

  const navigate = (url) => { window.location.href = url; };

  const CSS = `
  .tfi{--y:#ffd21f;--k:#0b0b0b;--g:#6b6b6b;--l:#ececec;font-family:Inter,"Segoe UI",system-ui,sans-serif;color:var(--k);max-width:860px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25);line-height:1.5}
  .tfi *{box-sizing:border-box;margin:0;padding:0}
  .tfi h1,.tfi h2,.tfi h3{font-family:"Space Grotesk","Segoe UI",system-ui,sans-serif;line-height:1.2}
  .tfi-head{background:var(--k);color:#fff;padding:34px 40px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;position:relative}
  .tfi-head::after{content:"";position:absolute;left:0;right:0;bottom:0;height:6px;background:repeating-linear-gradient(45deg,var(--y) 0 18px,var(--k) 18px 36px)}
  .tfi-logo small{display:block;color:var(--y);font-weight:600;font-size:13px;letter-spacing:.05em}
  .tfi-logo b{font-family:"Space Grotesk",sans-serif;font-size:28px;letter-spacing:.04em}
  .tfi-logo b i{font-style:normal;display:inline-block;background:var(--y);color:var(--k);border-radius:50%;width:1.05em;height:1.05em;line-height:1.05em;text-align:center;font-size:.9em}
  .tfi-logo p{color:#bdbdbd;font-size:12.5px;margin-top:10px;max-width:300px}
  .tfi-title{text-align:right}
  .tfi-title h1{font-size:30px;color:var(--y);letter-spacing:.02em}
  .tfi-title p{color:#d0d0d0;font-size:14px;margin-top:4px}
  .tfi-status{display:inline-block;margin-top:12px;background:var(--y);color:var(--k);font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.08em;padding:6px 12px;border-radius:999px}
  .tfi-body{padding:34px 40px}
  .tfi-hello{font-size:17px;margin-bottom:26px}
  .tfi-hello b{background:linear-gradient(transparent 60%,var(--y) 60%)}
  .tfi-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:2px solid var(--k);border-radius:12px;overflow:hidden;margin-bottom:28px}
  .tfi-meta div{padding:14px 16px;border-right:1px solid var(--l)}
  .tfi-meta div:last-child{border-right:0;background:var(--y)}
  .tfi-meta span{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--g);font-weight:600}
  .tfi-meta div:last-child span{color:var(--k)}
  .tfi-meta strong{font-family:"Space Grotesk",sans-serif;font-size:17px;word-break:break-word}
  .tfi-cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
  .tfi-box{background:#f6f6f3;border-radius:12px;padding:20px 22px}
  .tfi-box h3{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:var(--g);margin-bottom:10px}
  .tfi-box p{font-size:14.5px;word-break:break-word}
  .tfi-box .big{font-family:"Space Grotesk",sans-serif;font-size:19px;font-weight:700;margin-bottom:4px}
  .tfi-desc{border-left:4px solid var(--y);background:#fffbea;padding:18px 22px;border-radius:0 12px 12px 0;margin-bottom:28px}
  .tfi-desc h3{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:var(--g);margin-bottom:8px}
  .tfi-desc p{white-space:pre-wrap;word-break:break-word;font-size:14.5px}
  .tfi table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:14.5px}
  .tfi th{background:var(--k);color:var(--y);text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.08em;padding:12px 14px}
  .tfi th:last-child,.tfi td:last-child{text-align:right}
  .tfi td{padding:13px 14px;border-bottom:1px solid var(--l);vertical-align:top}
  .tfi td small{display:block;color:var(--g);font-size:12.5px}
  .tfi tfoot td{border:0;font-weight:700;font-family:"Space Grotesk",sans-serif;font-size:17px;padding-top:16px}
  .tfi tfoot .tot{background:var(--y);border-radius:8px}
  .tfi-note{font-size:12.5px;color:var(--g);margin-bottom:30px}
  .tfi-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:30px;counter-reset:s}
  .tfi-steps div{border:2px solid var(--k);border-radius:12px;padding:16px;position:relative}
  .tfi-steps div::before{counter-increment:s;content:counter(s);position:absolute;top:-14px;left:14px;background:var(--y);border:2px solid var(--k);width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:13px}
  .tfi-steps b{display:block;margin:6px 0 4px;font-family:"Space Grotesk",sans-serif}
  .tfi-steps p{font-size:13px;color:#444}
  .tfi-terms{font-size:12px;color:var(--g)}
  .tfi-terms li{margin:0 0 4px 18px}
  .tfi-foot{background:var(--k);color:#cfcfcf;padding:22px 40px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:13px}
  .tfi-foot b{color:var(--y)}
  @media (max-width:640px){
    .tfi-head,.tfi-body{padding:24px 20px}.tfi-foot{padding:20px}
    .tfi-title{text-align:left}
    .tfi-meta{grid-template-columns:1fr 1fr}.tfi-meta div{padding:12px}.tfi-meta strong{font-size:15px;white-space:nowrap}.tfi-meta div:nth-child(2){border-right:0}.tfi-meta div:nth-child(-n+2){border-bottom:1px solid var(--l)}
    .tfi-cols,.tfi-steps{grid-template-columns:1fr}.tfi-steps{gap:22px}
    .tfi th,.tfi td{padding:10px 8px}
  }
  @media (max-width:380px){
    .tfi-meta{grid-template-columns:1fr}.tfi-meta div{border-right:0!important;border-bottom:1px solid var(--l)}.tfi-meta div:last-child{border-bottom:0}
    .tfi-head,.tfi-body{padding:20px 16px}.tfi-foot{padding:18px 16px}.tfi-title h1{font-size:24px}
  }
  @media print{.tfi{box-shadow:none;border-radius:0;max-width:none}.tfi-head,.tfi-meta div:last-child,.tfi th,.tfi tfoot .tot,.tfi-status,.tfi-foot{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  `;

  function renderBody(b) {
    const isIndustry = b.clientType === 'Industry';
    const rows = `<tr><td>1</td><td><b>${esc(b.projectName)}</b><small>${esc(b.projectType)}</small></td><td>As per quote</td></tr>`;

    return `
    <div class="tfi">
      <header class="tfi-head">
        <div class="tfi-logo">
          <small>Tech</small><b>FUSI<i>O</i>N</b>
          <p>${esc(BUSINESS.address)}<br>${esc(BUSINESS.phone)} · ${esc(BUSINESS.phone2)}</p>
        </div>
        <div class="tfi-title">
          <h1>BOOKING INVOICE</h1>
          <p>Project registration confirmation</p>
          <span class="tfi-status">Awaiting confirmation</span>
        </div>
      </header>

      <div class="tfi-body">
        <p class="tfi-hello">Hi <b>${esc(b.fullName)}</b>, thank you for choosing Tech Fusion! Your project has been registered. Keep this invoice — your booking ID is your reference for every update.</p>

        <div class="tfi-meta">
          <div><span>Booking ID</span><strong>${esc(b.id)}</strong></div>
          <div><span>Issued on</span><strong>${esc(fmtDate(b.createdAt.slice(0, 10)))}</strong></div>
          <div><span>Project type</span><strong>${esc(b.projectType)}</strong></div>
          <div><span>Status</span><strong>Pending</strong></div>
        </div>

        <div class="tfi-cols">
          <div class="tfi-box">
            <h3>Billed to</h3>
            <p class="big">${esc(b.fullName)}</p>
            <p>${esc(b.clientType)}${b.department ? ' · ' + esc(b.department) : ''}</p>
            <p>${isIndustry ? 'Company' : 'College'}: ${esc(b.organisation)}</p>
            ${b.city ? `<p>${esc(b.city)}</p>` : ''}
            <p>${esc(b.email)}</p>
            <p>${esc(b.phone)}</p>
          </div>
          <div class="tfi-box">
            <h3>Project</h3>
            <p class="big">${esc(b.projectName)}</p>
            <p>Type: ${esc(b.projectType)}</p>
          </div>
        </div>

        <div class="tfi-desc">
          <h3>Project description</h3>
          <p>${esc(b.description)}</p>
        </div>

        <table>
          <thead><tr><th>#</th><th>Item</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td></td><td style="text-align:right">Total</td><td class="tot">To be confirmed</td></tr></tfoot>
        </table>
        <p class="tfi-note">This is a booking invoice. The final amount will be shared by Tech Fusion after reviewing your requirements.</p>

        <div class="tfi-steps">
          <div><b>We review</b><p>Our team studies your requirements within 24 hours.</p></div>
          <div><b>You get a quote</b><p>We call / WhatsApp you on ${esc(b.phone)} with the final quote and timeline.</p></div>
          <div><b>We start building</b><p>After confirmation, work begins and you get regular progress updates.</p></div>
        </div>

        <ul class="tfi-terms">
          <li>Booking is confirmed once Tech Fusion approves the quote with you.</li>
          <li>Please quote booking ID <b>${esc(b.id)}</b> in every message.</li>
          <li>Office hours: Monday – Sunday, 9:00 am – 9:00 pm.</li>
        </ul>
      </div>

      <footer class="tfi-foot">
        <span><b>Tech Fusion</b> · Ichalkaranji</span>
        <span>WhatsApp ${esc(BUSINESS.phone)} · ${esc(BUSINESS.email)} · Instagram ${esc(BUSINESS.instagram)}</span>
      </footer>
    </div>`;
  }

  // Standalone, self-contained HTML file the client can keep or forward.
  function renderDocument(b) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tech Fusion Booking Invoice ${esc(b.id)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<style>body{margin:0;padding:32px 14px;background:#151515}${CSS}@media print{body{background:#fff;padding:0}}</style>
</head>
<body>${renderBody(b)}</body>
</html>`;
  }

  function download(b) {
    const blob = new Blob([renderDocument(b)], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName(b);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  window.TFInvoice = { BUSINESS, MAIL_ENDPOINT, BACKUP, CSS, esc, encode, decode, newBookingId, fmtDate, fileName, whatsappText, clientEmailText, sendEmails, navigate, renderBody, renderDocument, download };
})();
