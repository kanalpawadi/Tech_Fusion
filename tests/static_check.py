"""Static checks for the Tech Fusion site: assets, anchors, links, accessibility basics.

Run from the project root:  python tests/static_check.py
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
CSS = (ROOT / "styles.css").read_text(encoding="utf-8")
JS = (ROOT / "script.js").read_text(encoding="utf-8")

results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


class Collector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.stack = []
        self.errors = []
        self.void = {"meta", "link", "img", "input", "br", "hr", "source", "path", "rect", "circle"}

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))
        if tag not in self.void:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def handle_endtag(self, tag):
        if tag in self.void:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.errors.append(f"unexpected </{tag}> (open: {self.stack[-3:]})")


p = Collector()
p.feed(HTML)
tags = p.tags

# 1. Well-formed HTML
check("HTML tags balanced", not p.errors and not p.stack, "; ".join(p.errors[:5]) or str(p.stack))

# 2. Head basics
check("<title> present", "<title>" in HTML)
check("meta viewport present", any(t == "meta" and a.get("name") == "viewport" for t, a in tags))
check("meta description present", any(t == "meta" and a.get("name") == "description" for t, a in tags))
check("html lang set", re.search(r"<html[^>]+lang=", HTML) is not None)

# 3. Unique ids
ids = [a["id"] for _, a in tags if "id" in a]
dupes = {i for i in ids if ids.count(i) > 1}
check("ids are unique", not dupes, str(dupes))

# 4. In-page anchors resolve
anchors = {a["href"][1:] for t, a in tags if t == "a" and a.get("href", "").startswith("#")}
missing = [x for x in anchors if x and x not in ids]
check("all #anchor links resolve", not missing, str(missing))

# 5. Local files exist (img src, css, js, inline background urls)
local = [a.get("src") or a.get("href") for t, a in tags if t in ("img", "script", "link")]
local += re.findall(r"url\('([^']+)'\)", HTML)
local = [x.split("?")[0] for x in local if x and not x.startswith(("http", "data:", "//"))]
missing_files = [x for x in local if not (ROOT / x).exists()]
check(f"local assets exist ({len(local)} refs)", not missing_files, str(missing_files))

# 6. Images have alt text (lightbox img is filled by JS)
imgs = [a for t, a in tags if t == "img"]
no_alt = [a.get("src") for a in imgs if "alt" not in a]
empty_alt = [a.get("src") for a in imgs if a.get("alt") == "" and a.get("src")]
check(f"images have alt ({len(imgs)} imgs)", not no_alt and not empty_alt, str(no_alt + empty_alt))

# 7. External links opened in new tab carry rel=noopener
blank = [a for t, a in tags if t == "a" and a.get("target") == "_blank"]
bad_rel = [a["href"] for a in blank if "noopener" not in a.get("rel", "")]
check(f"target=_blank links use noopener ({len(blank)})", not bad_rel, str(bad_rel))

# 8. Phone / WhatsApp numbers consistent
tels = {a["href"] for t, a in tags if t == "a" and a.get("href", "").startswith("tel:")}
check("tel links are valid +91 numbers", all(re.fullmatch(r"tel:\+91\d{10}", x) for x in tels), str(tels))
was = re.findall(r"wa\.me/(\d+)", HTML + JS)
check("all WhatsApp links use 917507190468", was and set(was) == {"917507190468"}, str(set(was)))

# 9. Buttons / icon-only links have accessible names
icon_links = [a for t, a in tags if t in ("a", "button") and "aria-label" in a]
check("icon-only controls have aria-label", len(icon_links) >= 3, f"{len(icon_links)} found")

# 10. Form fields are labelled and required name present
forms = {m.group(1): HTML[m.start():HTML.find('</form>', m.start())] for m in re.finditer(r'<form[^>]*id="([^"]+)"', HTML)}
check("2 forms (enquiry, register-form)", set(forms) == {"enquiry", "register-form"}, str(list(forms)))
for fid, form in forms.items():
    fields = re.findall(r"<(input|select|textarea)\b", form)
    labels = form.count("<label")
    check(f"#{fid}: every field has a label", len(fields) == labels, f"{len(fields)} fields, {labels} labels")
check("enquiry: name field is required", re.search(r'name="name"\s+required', forms.get("enquiry", "")) is not None)
reg = forms.get("register-form", "")
for field in ["fullName", "organisation", "email", "phone", "projectName", "category", "projectType", "deadline", "description", "agree"]:
    check(f"register: {field} is required", re.search(rf'name="{field}"[^>]*\brequired', reg) is not None)

# Browsers compile pattern="" with the /v flag, where an unescaped "-" next to a class like [\s-] is a syntax error.
bad_patterns = [p for p in re.findall(r'pattern="([^"]*)"', HTML) if re.search(r"\[[^\]]*(\\[sdw]-|-\\[sdw])", p)]
check("input patterns are valid in modern browsers", not bad_patterns, str(bad_patterns))

# 10b. Invoice page and shared script
INV = (ROOT / "invoice.html").read_text(encoding="utf-8")
INVJS = (ROOT / "invoice.js").read_text(encoding="utf-8")
check("invoice.html loads invoice.js", 'src="invoice.js' in INV)
check("index.html loads invoice.js before script.js", HTML.find('src="invoice.js') < HTML.find('src="script.js') and 'src="invoice.js' in HTML)
check("invoice output escapes user input", INVJS.count("esc(b.") >= 20, f"{INVJS.count('esc(b.')} escaped fields")
check("invoice page is not indexed by search engines", 'name="robots" content="noindex"' in INV)

check("contact shows business email", 'href="mailto:techfusionteamwork@gmail.com"' in HTML)
check("bookings emailed to business address", "formsubmit.co/ajax/${BUSINESS.email}" in INVJS and "email: 'techfusionteamwork@gmail.com'" in INVJS)

# 10c. Projects section
cards = re.findall(r'<article class="project" data-cat="([^"]+)"', HTML)
check("16 project cards", len(cards) == 16, len(cards))
for removed in ["RV Fitness", "Rising Sun", "Sunbeam"]:
    check(f"removed project not shown: {removed}", removed not in HTML)
filters = set(re.findall(r'data-filter="([^"]+)"', HTML)) - {"all"}
used = {c for cat in cards for c in cat.split()}
check("every project category has a filter button", used <= filters, str(used - filters))
check("every filter button has projects", filters <= used, str(filters - used))

# 11. JS references elements that exist
for sel in re.findall(r"getElementById\('([^']+)'\)", JS):
    check(f"JS #{sel} exists in HTML", sel in ids)
for sel in re.findall(r"querySelector(?:All)?\('([^']+)'\)", JS):
    first = sel.split(",")[0].strip().split()[0]
    if first.startswith("."):
        check(f"JS selector {first} exists", f'class="{first[1:]}' in HTML or f' {first[1:]}"' in HTML or f' {first[1:]} ' in HTML)

# 12. CSS classes used in HTML are defined (catch typos)
html_classes = set()
for _, a in tags:
    html_classes.update(a.get("class", "").split())
undefined = sorted(c for c in html_classes if not re.search(r"\." + re.escape(c) + r"\b", CSS))
check("all HTML classes styled in CSS", not undefined, str(undefined))

# 13. Image weight
used_imgs = {x for x in local if x.endswith(".jpg")}
heavy = [(x, (ROOT / x).stat().st_size // 1024) for x in used_imgs if (ROOT / x).stat().st_size > 300_000]
check(f"no page image over 300 KB ({len(used_imgs)} checked)", not heavy, str(heavy))
total_kb = sum((ROOT / x).stat().st_size for x in used_imgs) // 1024
check(f"total image weight under 2 MB ({total_kb} KB)", total_kb < 2048)

passed = sum(ok for _, ok, _ in results)
for name, ok, detail in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + ("" if ok else f"  -> {detail}"))
print(f"\n{passed}/{len(results)} passed")
sys.exit(0 if passed == len(results) else 1)
