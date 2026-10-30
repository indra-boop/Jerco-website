# deploy/kantor-feed — feed live /kantor/ (belum terpasang)

`/kantor/` membaca `/kantor/feed.json` setiap 60 detik. Kalau file tidak ada, rusak, atau `updated_at`
lebih dari 30 menit, halaman memakai roster simulasi bawaan seperti sekarang.

Alur:

1. **Publisher** (`tools/kantor-feed/publish.mjs`, dijalankan dari box Grok Bot dengan `gh`) membuat feed dari
   input lokal + branch `status/<host>` repo status private, menjalankan sanitizer ketat, lalu
   commit **hanya** `feed.json` ke branch `kantor-feed` repo ini. Repo ini **publik**: isi branch itu publik.
2. **Server www `jkt-jerconetwork`** menarik branch itu setiap 2 menit (`kantor-feed-pull.timer`) memakai
   deploy key read-only yang sudah ada (`/etc/jerco-website/deploy_key`), memvalidasi, lalu menulis
   `/var/www/html/kantor/feed.json` secara atomik.
3. **Sync 6 jam** (`jerco-website-sync`) tidak menghapus file itu karena ada `--filter=P kantor/feed.json`.
4. **nginx** menyajikan feed dengan `Cache-Control: public, max-age=60`.

## Install (sekali, butuh sudo di jkt-jerconetwork)

```bash
cd /opt/jerco-website/repo                     # clone main yang sudah ada (setelah PR ini di-merge)
sudo install -m 755 deploy/jerco-website-sync.sh /usr/local/sbin/jerco-website-sync   # versi dengan protect filter + exclude tools/
sudo install -m 755 deploy/kantor-feed/kantor-feed-pull.sh /usr/local/sbin/kantor-feed-pull
sudo install -m 644 deploy/kantor-feed/kantor-feed-pull.service deploy/kantor-feed/kantor-feed-pull.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo kantor-feed-pull                          # tes sekali (branch kantor-feed harus sudah ada)
sudo cp /etc/nginx/sites-available/jerconetwork.com /var/backups/jerco-website/nginx-$(date -u +%Y%m%d%H%M%S).bak
# tempel deploy/kantor-feed/nginx-kantor-feed.conf ke blok server www, lalu:
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable --now kantor-feed-pull.timer
curl -sI https://www.jerconetwork.com/kantor/feed.json | grep -i cache-control
```

## Matikan / rollback

```bash
sudo systemctl disable --now kantor-feed-pull.timer
sudo rm -f /var/www/html/kantor/feed.json      # halaman kembali ke data simulasi
```

## Catatan

- Deploy key website hanya read-only ke repo ini; tidak ada token baru di server.
- Branch `kantor-feed` hanya boleh berisi `feed.json` (publisher berhenti kalau ada file lain).
- Riwayat commit branch itu publik. Sanitizer menolak sebelum push; kalau ada yang lolos, hapus file di
  branch dan rotasi data terkait. Jangan pernah menaruh data mentah di input publisher.
