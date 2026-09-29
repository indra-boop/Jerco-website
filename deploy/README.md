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

## Nginx (WWW-02 branded 404 + WWW-03 hardening)

Live site conf: `/etc/nginx/sites-available/jerconetwork.com` on `jkt-jerconetwork`.
Canonical SoT snippet (copy when rebuilding the VPS): [`nginx-www-snippet.conf`](./nginx-www-snippet.conf).

| Item | Behaviour |
|---|---|
| Branded 404 | `error_page 404 /404.html` + `try_files … @www404` → status **404**, body `404.html`. Direct `/404.html` stays **200**. |
| Hide version | `server_tokens off;` → `Server: nginx` |
| Security headers (HTTPS www) | `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (geo/mic/cam off), `HSTS` `max-age=31536000; includeSubDomains`. **No blocking CSP** until WWW-08 (CDN Tailwind/Fonts). |
| Apex → www | `https://jerconetwork.com/*` and `http://(www.)jerconetwork.com/*` → **301** `https://www.jerconetwork.com$request_uri` |

```bash
sudo cp /etc/nginx/sites-available/jerconetwork.com /var/backups/jerco-website/nginx-$(date -u +%Y%m%d%H%M%S).bak
sudo cp deploy/nginx-www-snippet.conf /etc/nginx/sites-available/jerconetwork.com   # from a checkout, or paste
sudo nginx -t && sudo systemctl reload nginx
```

Smoke:

```bash
curl -sI https://www.jerconetwork.com/          # 200, Server: nginx, headers + HSTS
curl -sI https://jerconetwork.com/              # 301 → https://www.jerconetwork.com/
curl -sI https://www.jerconetwork.com/no-such   # 404 branded
```

## Soft size gate (WWW-04 WebP)

Hero + portfolio images ship as WebP (PNG kept on disk as `<picture>` fallback). Soft max bytes when regenerating:

| Asset | Soft max |
|---|---|
| `assets/images/hero-network-background.webp` | 500 KB |
| `assets/images/projects/project-isp.webp` | 500 KB |
| `assets/images/projects/project-cloud.webp` | 500 KB |
| `assets/images/projects/project-dashboard.webp` | 800 KB |

Encode with `cwebp -q 75..85` (prefer quality tweak before resize). Logo/favicons stay PNG.
