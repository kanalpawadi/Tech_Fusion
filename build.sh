#!/usr/bin/env bash
# Copies only the files the website needs into dist/ (used by deploy.sh and by Netlify).
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist/assets
cp index.html invoice.html styles.css script.js invoice.js favicon.ico apple-touch-icon.png dist/
cp -r assets/photos assets/instagram dist/assets/
echo "Built dist/ ($(find dist -type f | wc -l) files)"
