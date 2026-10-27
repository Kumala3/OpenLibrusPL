#!/usr/bin/env bash
# Copies the release signing key into the GitHub repository's Actions secrets,
# so .github/workflows/release.yml can sign APKs. Run once, from this folder,
# after the repository exists and `gh auth login` is done:
#
#   bash scripts/set-release-secrets.sh
#
# Reads OPENLIBRUS_* from ~/.gradle/gradle.properties (see
# plugins/withReleaseSigning.js). Nothing is printed: the values go straight
# from the file to `gh secret set` on stdin.
set -euo pipefail

props="$HOME/.gradle/gradle.properties"
get() { grep -E "^$1=" "$props" | head -1 | cut -d= -f2-; }

store_file=$(get OPENLIBRUS_STORE_FILE)
[ -f "$store_file" ] || { echo "Keystore not found: $store_file"; exit 1; }

base64 -w0 "$store_file" | gh secret set OPENLIBRUS_KEYSTORE_B64
get OPENLIBRUS_STORE_PASSWORD | tr -d '\r\n' | gh secret set OPENLIBRUS_STORE_PASSWORD
get OPENLIBRUS_KEY_ALIAS | tr -d '\r\n' | gh secret set OPENLIBRUS_KEY_ALIAS
get OPENLIBRUS_KEY_PASSWORD | tr -d '\r\n' | gh secret set OPENLIBRUS_KEY_PASSWORD
echo "Done. The secrets are set for $(gh repo view --json nameWithOwner -q .nameWithOwner)."
