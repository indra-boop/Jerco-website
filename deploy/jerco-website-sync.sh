#!/usr/bin/env bash
# jerco-website-sync — deploy www.jerconetwork.com from GitHub (branch main).
#
# Installed to /usr/local/sbin/jerco-website-sync and run every 6 hours by
# jerco-website-sync.timer. Repo = source of truth: any drift on the server is
# overwritten on the next run (a backup is taken first).
#
#   jerco-website-sync            same as "sync"
#   jerco-website-sync sync       fetch main; if web root differs -> validate, backup, deploy
#   jerco-website-sync --dry-run  show what would change, change nothing
#   jerco-website-sync status     deployed commit, latest commit, pause state, backups
#   jerco-website-sync rollback [backup.tar.gz]
#                                 restore a backup (latest by default) and PAUSE auto-sync
#   jerco-website-sync resume     re-enable auto-sync after a rollback
set -euo pipefail

REPO_URL="${REPO_URL:-git@github.com:indra-boop/Jerco-website.git}"
BRANCH="${BRANCH:-main}"
SRC="${SRC:-/opt/jerco-website/repo}"
WEB="${WEB:-/var/www/html}"
STATE="${STATE:-/var/lib/jerco-website}"
BK_DIR="${BK_DIR:-/var/backups/jerco-website}"
KEY_DIR="${KEY_DIR:-/etc/jerco-website}"
KEEP="${KEEP:-10}"
WEB_OWNER="${WEB_OWNER:-www-data:www-data}"

export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -i $KEY_DIR/deploy_key -o IdentitiesOnly=yes -o UserKnownHostsFile=$KEY_DIR/known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes}"

# Files that live in the repo but must never be published.
# Files that exist only on the server and must survive --delete (P = protect).
RSYNC_OPTS=(-rlpt --checksum --delete --delete-excluded
  "--chown=$WEB_OWNER" "--chmod=D755,F644"
  --exclude=.git/ --exclude=.github/ --exclude=deploy/
  --exclude=CLAUDE.md --exclude=README.md --exclude=.gitattributes --exclude=.gitignore
  --exclude=node_modules/ --exclude=package.json --exclude=package-lock.json
  --exclude=tailwind.config.js --exclude=css/tailwind.input.css
  --exclude=tools/
  "--filter=P .htaccess" "--filter=P index.nginx-debian.html" "--filter=P .well-known/"
  "--filter=P kantor/feed.json")

log() { echo "[jerco-website-sync] $*"; }
die() { log "ERROR: $*"; exit 1; }

mkdir -p "$STATE" "$BK_DIR"
exec 9>"$STATE/.lock"
flock -n 9 || { log "sync lain sedang berjalan, lewati."; exit 0; }

deployed_sha() { cat "$STATE/deployed_sha" 2>/dev/null || echo "none"; }

fetch_latest() {
  [ -d "$SRC/.git" ] || die "clone belum ada di $SRC (jalankan: install.sh connect)"
  git -C "$SRC" remote set-url origin "$REPO_URL"
  git -C "$SRC" fetch --quiet --prune origin "$BRANCH"
  git -C "$SRC" reset --quiet --hard "origin/$BRANCH"
  git -C "$SRC" clean -qfdx
  git -C "$SRC" rev-parse HEAD
}

validate() {
  local f
  for f in index.html js/config.js js/navigation.js css/style.css; do
    [ -s "$SRC/$f" ] || die "validasi gagal: $f tidak ada / kosong di commit ini"
  done
  python3 - "$SRC" <<'PY' || die "validasi gagal: JSON rusak"
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
bad = 0
for p in sorted((root / "data").glob("*.json")):
    try:
        json.loads(p.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"[jerco-website-sync] JSON rusak: {p.relative_to(root)}: {exc}")
        bad = 1
sys.exit(bad)
PY
}

changes() { rsync -n -i "${RSYNC_OPTS[@]}" "$SRC/" "$WEB/" | grep -v '^\.' || true; }

backup() {
  local ts file
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  file="$BK_DIR/html-$ts-$(deployed_sha | cut -c1-7).tar.gz"
  tar czf "$file" -C "$(dirname "$WEB")" "$(basename "$WEB")"
  ls -1t "$BK_DIR"/html-*.tar.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
  echo "$file"
}

cmd="${1:-sync}"
case "$cmd" in
  status)
    echo "web root     : $WEB"
    echo "deployed     : $(deployed_sha)"
    if [ -d "$SRC/.git" ]; then echo "clone HEAD   : $(git -C "$SRC" rev-parse HEAD) ($(git -C "$SRC" log -1 --format='%cd %s' --date=iso))"; fi
    if [ -f "$STATE/paused" ]; then echo "auto-sync    : PAUSED ($(cat "$STATE/paused"))"; else echo "auto-sync    : aktif"; fi
    echo "backups      :"; ls -1t "$BK_DIR"/html-*.tar.gz 2>/dev/null | head -5 | sed 's/^/  /' || true
    ;;

  --dry-run|dry-run)
    sha="$(fetch_latest)"; validate
    log "commit terbaru: $sha | terdeploy: $(deployed_sha)"
    out="$(changes)"
    if [ -z "$out" ]; then log "tidak ada perubahan"; else
      echo "$out"
      log "ringkasan: $(echo "$out" | grep -c '^[<>c]f' || true) file ditulis, $(echo "$out" | grep -c '^\*deleting' || true) dihapus (dry-run, belum ada yang berubah)"
    fi
    ;;

  sync)
    if [ -f "$STATE/paused" ]; then log "auto-sync PAUSED ($(cat "$STATE/paused")). Jalankan 'resume' untuk mengaktifkan."; exit 0; fi
    sha="$(fetch_latest)"; validate
    out="$(changes)"
    if [ -z "$out" ]; then
      echo "$sha" > "$STATE/deployed_sha"
      log "sudah terbaru ($sha)"; exit 0
    fi
    bk="$(backup)"; log "backup: $bk"
    rsync "${RSYNC_OPTS[@]}" "$SRC/" "$WEB/"
    [ -z "$(changes)" ] || die "verifikasi gagal: web root masih beda dari repo setelah sync"
    echo "$sha" > "$STATE/deployed_sha"
    log "deploy OK: $(deployed_sha) ($(echo "$out" | grep -c '^[<>c]f' || true) file ditulis, $(echo "$out" | grep -c '^\*deleting' || true) dihapus)"
    ;;

  rollback)
    file="${2:-$(ls -1t "$BK_DIR"/html-*.tar.gz 2>/dev/null | head -1)}"
    [ -f "$file" ] || die "backup tidak ditemukan: ${file:-<kosong>}"
    tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
    tar xzf "$file" -C "$tmp"
    [ -d "$tmp/$(basename "$WEB")" ] || die "isi backup tidak sesuai ($(basename "$WEB")/ tidak ada)"
    rsync -rlpt --checksum --delete "--chown=$WEB_OWNER" "--chmod=D755,F644" "$tmp/$(basename "$WEB")/" "$WEB/"
    echo "rollback ke $(basename "$file") pada $(date -u +%FT%TZ)" > "$STATE/paused"
    echo "rollback:$(basename "$file")" > "$STATE/deployed_sha"
    log "rollback OK dari $file"
    log "auto-sync di-PAUSE agar tidak menimpa rollback. Setelah repo diperbaiki: jerco-website-sync resume"
    ;;

  resume)
    rm -f "$STATE/paused"; log "auto-sync aktif kembali (berlaku mulai run berikutnya)"
    ;;

  *) die "perintah tidak dikenal: $cmd (sync | --dry-run | status | rollback [file] | resume)" ;;
esac
