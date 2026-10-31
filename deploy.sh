#!/usr/bin/env bash
# Builds the website into dist/ and publishes it to Netlify.
#   bash deploy.sh           -> publish to the live site
#   bash deploy.sh --draft   -> publish a preview link only
set -euo pipefail
cd "$(dirname "$0")"

bash build.sh

if [ "${1:-}" = "--draft" ]; then
  npx -y netlify-cli deploy --dir dist
else
  npx -y netlify-cli deploy --dir dist --prod
fi
