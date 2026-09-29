# deploy/ — auto-deploy www.jerconetwork.com

Web root production (`/var/www/html` di server `jkt-jerconetwork`, nginx) di-sync dari
branch `main` repo ini **setiap 6 jam** oleh `jerco-website-sync.timer`.
Folder `deploy/`, `CLAUDE.md`, `README.md`, `.git*` **tidak** dipublikasikan.

| Item | Nilai |
|---|---|
| Jadwal | 00:00, 06:00, 12:00, 18:00 UTC (08:00, 14:00, 20:00, 02:00 WITA), jitter ≤5 menit |
| Akses GitHub | Deploy key read-only `/etc/jerco-website/deploy_key` |
| Clone | `/opt/jerco-website/repo` (di luar web root) |
| Backup | `/var/backups/jerco-website/html-<UTC>-<sha>.tar.gz`, 10 terakhir, dibuat sebelum setiap perubahan |
| Dilindungi (tidak dihapus) | `.htaccess`, `index.nginx-debian.html`, `.well-known/` |
| Aturan | Repo = sumber kebenaran. Edit manual di server akan tertimpa pada run berikutnya. |

## Install (sekali)
```bash
sudo bash install.sh setup      # cetak public key -> tambahkan di GitHub Deploy keys (read-only)
sudo bash install.sh connect    # tes akses + clone + dry-run
sudo jerco-website-sync sync    # deploy pertama
sudo bash install.sh enable     # aktifkan timer 6 jam
```

## Operasional
```bash
sudo jerco-website-sync status        # commit terdeploy, pause, backup terbaru
sudo jerco-website-sync --dry-run     # lihat perubahan tanpa mengubah apa pun
sudo jerco-website-sync sync          # deploy sekarang (tanpa menunggu timer)
journalctl -u jerco-website-sync -n 50 --no-pager
systemctl list-timers jerco-website-sync.timer
```

## Rollback
```bash
sudo jerco-website-sync rollback                       # backup terbaru; auto-sync otomatis di-PAUSE
sudo jerco-website-sync rollback /var/backups/jerco-website/html-....tar.gz
sudo jerco-website-sync resume                         # setelah repo diperbaiki
sudo bash install.sh uninstall                         # hapus timer/service/script (backup tetap)
```

Commit yang rusak (JSON invalid / file inti hilang) ditolak: web root tidak diubah dan
service berstatus failed (notifikasi email ikut `OnFailure` service `jerco-*` lain bila ada).

## Nginx 404 (WWW-02 / optional WWW-03)

Branded `404.html` lives at the web root. Direct `GET /404.html` should return **200**.

Unknown paths still get nginx’s default 404 (and version leak) until this is wired.
Code & PRs may apply it on this deploy **or** defer nginx wiring to WWW-03; the
HTML file must exist either way.

```nginx
# Serve branded 404 body. Optional `=404` keeps the HTTP status 404
# (without it, some nginx setups would 200 the error document).
error_page 404 /404.html;
# error_page 404 =404 /404.html;
```
