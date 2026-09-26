#!/usr/bin/env bash
# Installer for jerco-website-sync (auto-deploy www.jerconetwork.com every 6 hours).
#
#   sudo bash install.sh setup     tools check, deploy key, known_hosts, install script + units
#   (add the printed public key on GitHub: repo Settings > Deploy keys, read-only)
#   sudo bash install.sh connect   test GitHub access, clone repo, dry-run (changes nothing)
#   sudo jerco-website-sync sync   first real deploy (backup is taken first)
#   sudo bash install.sh enable    start the 6-hourly timer
#   sudo bash install.sh uninstall stop + remove timer/service/script (keeps backups, key, clone)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
KEY_DIR=/etc/jerco-website
SRC=/opt/jerco-website/repo
REPO_URL=git@github.com:indra-boop/Jerco-website.git
BIN=/usr/local/sbin/jerco-website-sync
UNIT_DIR=/etc/systemd/system

[ "$(id -u)" = 0 ] || { echo "Jalankan dengan sudo."; exit 1; }
say() { echo "== $*"; }

case "${1:-}" in
  setup)
    missing=""
    for t in git rsync python3 curl flock ssh ssh-keygen tar; do command -v "$t" >/dev/null || missing="$missing $t"; done
    [ -z "$missing" ] || { echo "Tool belum ada:$missing  ->  sudo apt-get install -y git rsync openssh-client"; exit 1; }
    id www-data >/dev/null 2>&1 || { echo "User www-data tidak ada"; exit 1; }

    install -d -m 700 "$KEY_DIR"
    install -d -m 755 /opt/jerco-website /var/lib/jerco-website /var/backups/jerco-website
    if [ ! -f "$KEY_DIR/deploy_key" ]; then
      ssh-keygen -q -t ed25519 -N "" -C "jerco-website-sync@$(hostname)" -f "$KEY_DIR/deploy_key"
      say "deploy key dibuat"
    else
      say "deploy key sudah ada, dipakai ulang"
    fi
    chmod 600 "$KEY_DIR/deploy_key"

    # GitHub host keys from the TLS-verified API (no trust-on-first-use).
    curl -fsSL https://api.github.com/meta | python3 -c '
import json, sys
for k in json.load(sys.stdin)["ssh_keys"]:
    print("github.com", k)' > "$KEY_DIR/known_hosts.new"
    [ -s "$KEY_DIR/known_hosts.new" ] || { echo "Gagal mengambil host key GitHub"; exit 1; }
    mv "$KEY_DIR/known_hosts.new" "$KEY_DIR/known_hosts"; chmod 644 "$KEY_DIR/known_hosts"

    install -m 755 "$HERE/jerco-website-sync.sh" "$BIN"
    install -m 644 "$HERE/systemd/jerco-website-sync.service" "$UNIT_DIR/"
    install -m 644 "$HERE/systemd/jerco-website-sync.timer" "$UNIT_DIR/"

    # Reuse the email-on-failure hook already used by other jerco-* services, if any.
    onf="$(systemctl cat jerco-healthcheck.service jerco-ausport-collector.service jerco-schedule-backup.service 2>/dev/null | grep -m1 '^OnFailure=' || true)"
    if [ -n "$onf" ]; then
      install -d "$UNIT_DIR/jerco-website-sync.service.d"
      printf '[Unit]\n%s\n' "$onf" > "$UNIT_DIR/jerco-website-sync.service.d/onfailure.conf"
      say "notifikasi gagal dipasang: $onf"
    else
      say "tidak ditemukan OnFailure di service jerco-* lain; notifikasi email belum dipasang"
    fi
    systemctl daemon-reload

    echo
    say "LANGKAH BERIKUTNYA: tambahkan public key ini di GitHub"
    echo "   https://github.com/indra-boop/Jerco-website/settings/keys  ->  Add deploy key"
    echo "   Title: jerco-website-sync@$(hostname)   |   Allow write access: JANGAN dicentang"
    echo
    cat "$KEY_DIR/deploy_key.pub"
    echo
    say "setelah itu: sudo bash $0 connect"
    ;;

  connect)
    export GIT_SSH_COMMAND="ssh -i $KEY_DIR/deploy_key -o IdentitiesOnly=yes -o UserKnownHostsFile=$KEY_DIR/known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes"
    git ls-remote --heads "$REPO_URL" main >/dev/null || { echo "Akses GitHub gagal. Cek deploy key sudah ditambahkan di repo."; exit 1; }
    say "akses GitHub OK"
    if [ ! -d "$SRC/.git" ]; then git clone --quiet --branch main "$REPO_URL" "$SRC"; say "clone -> $SRC"; fi
    "$BIN" --dry-run
    echo
    say "cek daftar di atas (baris *deleting = file di server yang TIDAK ada di repo, akan dihapus)."
    say "kalau OK, deploy pertama: sudo jerco-website-sync sync"
    ;;

  enable)
    systemctl enable --now jerco-website-sync.timer
    systemctl list-timers jerco-website-sync.timer --no-pager
    ;;

  uninstall)
    systemctl disable --now jerco-website-sync.timer 2>/dev/null || true
    rm -f "$UNIT_DIR/jerco-website-sync.timer" "$UNIT_DIR/jerco-website-sync.service" "$BIN"
    rm -rf "$UNIT_DIR/jerco-website-sync.service.d"
    systemctl daemon-reload
    say "timer, service, dan script dihapus. Backup (/var/backups/jerco-website), key, dan clone tetap ada."
    ;;

  *) sed -n '2,11p' "$0"; exit 1 ;;
esac
