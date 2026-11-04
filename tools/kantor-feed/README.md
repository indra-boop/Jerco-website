# tools/kantor-feed — publisher feed /kantor/

Membuat `feed.json` untuk https://www.jerconetwork.com/kantor/ dari:

- input lokal (ringkasan kerja agent, alert, keputusan), contoh: [`input.example.json`](input.example.json);
- status VPS dari branch `status/<host>` di repo status private (dibaca dengan `gh api`, read-only). Nama repo dan host
  tidak disimpan di repo publik ini: isi lewat `KANTOR_STATUS_REPO=owner/repo` dan `KANTOR_HOSTS=host1,host2,host3`
  (atau `--status-repo` / `--hosts`). Nama tampilan server diatur di `server_names` pada input.

Hanya angka yang diambil dari status VPS: online (umur status ≤ 30 menit), `mem_pct`, `disk_pct`, jumlah runner
total/busy/paused, dan Ollama aktif/tidak. Nama runner, repo, service, IP dan peer **tidak** pernah masuk feed.

```bash
node tools/kantor-feed/publish.mjs --input input.json                    # cetak feed (stdout)
node tools/kantor-feed/publish.mjs --input input.json --out feed.json    # tulis file
node tools/kantor-feed/publish.mjs --input input.json --push             # commit feed.json ke branch kantor-feed (PUBLIK)
npm run test:kantor-feed                                                 # tes sanitizer
```

Opsi: `--hosts a,b,c`, `--no-servers`, `--owner`, `--status-repo`, `--site-repo`, `--branch`.

## Sanitizer (fail closed)

Setiap string di feed final dicek. Kalau satu saja cocok, publisher berhenti dengan exit 2, tidak menulis dan
tidak push, dan hanya mencetak path + nama aturan (nilainya tidak ditampilkan):

email, `@handle`, nomor telepon (+62 / 62 / 08 dan deret ≥ 9 digit), IPv4, IPv6, alamat jaringan lokal,
URL dengan kredensial/query, kata password/sandi/token/secret/api key/bearer/kredensial/otp/pin/cookie,
pola `key=`/`token:`, prefix token (ghp_, github_pat_, sk-, xox*, AKIA, AIza, `-----BEGIN`),
hex ≥ 24 karakter, base64 ≥ 32 karakter, nominal uang (Rp, IDR, $, juta, rb, ...), dan **semua nama repo private**
milik owner (diambil live dari `gh repo list --visibility private`; kalau gagal dibaca, publisher berhenti).

Field juga di-whitelist dan dipotong: nama ≤ 40, `task_summary`/judul ≤ 120, teks alert ≤ 160; maks 40 agent,
20 work, 10 alert, 10 keputusan. `id` agent harus kode roster yang ada di `kantor/src/app.js`.

Nama perusahaan/klien boleh. Sanitizer bisa salah tolak kata biasa yang kebetulan sama dengan nama repo private;
ubah kalimatnya, jangan longgarkan aturannya.

## Pemetaan bot ke kode roster (usulan)

| Bot | Kode |
|---|---|
| Grok (admin) | GK |
| Jerco Manager | PM |
| Jerco UX Designer / UI Designer | UX / UI |
| Finance | FN |
| Jerco AI Engineer | AI |
| Jerco Sales & Commercial | SL |
| Server / runner (status VPS) | DO |
