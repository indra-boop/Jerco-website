#!/usr/bin/env bash
# kantor-feed-pull — copy feed.json from branch `kantor-feed` of indra-boop/Jerco-website to
# /var/www/html/kantor/feed.json. Runs every 2 minutes (kantor-feed-pull.timer).
# Uses the existing read-only website deploy key; no new secret. Never touches anything else in the web root.
set -euo pipefail
REPO_URL="${REPO_URL:-git@github.com:indra-boop/Jerco-website.git}"
BRANCH="${BRANCH:-kantor-feed}"
SRC="${SRC:-/opt/jerco-website/kantor-feed}"
DEST="${DEST:-/var/www/html/kantor/feed.json}"
KEY_DIR="${KEY_DIR:-/etc/jerco-website}"
export GIT_SSH_COMMAND="ssh -i $KEY_DIR/deploy_key -o IdentitiesOnly=yes -o UserKnownHostsFile=$KEY_DIR/known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes"
log() { echo "[kantor-feed-pull] $*"; }

exec 9>/run/kantor-feed-pull.lock; flock -n 9 || exit 0
if [ ! -d "$SRC/.git" ]; then
  git clone --quiet --depth 1 --single-branch --branch "$BRANCH" "$REPO_URL" "$SRC"
else
  git -C "$SRC" fetch --quiet --depth 1 origin "$BRANCH"
  git -C "$SRC" reset --quiet --hard FETCH_HEAD
fi
f="$SRC/feed.json"
[ -s "$f" ] || { log "feed.json tidak ada di branch $BRANCH"; exit 1; }
[ "$(stat -c %s "$f")" -le 65536 ] || { log "feed.json > 64 KB, ditolak"; exit 1; }
# last line of defence (the publisher has the full sanitizer): JSON shape + obvious leaks
python3 - "$f" <<'PY' || { log "feed.json ditolak oleh validasi"; exit 1; }
import json, re, sys
raw = open(sys.argv[1], encoding="utf-8").read()
d = json.loads(raw)
assert isinstance(d, dict) and isinstance(d.get("agents"), list) and isinstance(d.get("updated_at"), str)
bad = [r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
       r"(?:\+62|\b62|\b0)8\d[\d\s.-]{6,}\d", r"(?i)\b(password|token|secret|api[_ -]?key)\b", r"\b[0-9a-fA-F]{32,}\b"]
for p in bad:
    if re.search(p, raw): sys.exit(1)
PY
if ! cmp -s "$f" "$DEST"; then
  install -m 644 -o www-data -g www-data "$f" "$DEST.tmp"
  mv -f "$DEST.tmp" "$DEST"
  log "feed diperbarui ($(git -C "$SRC" rev-parse --short HEAD))"
fi
