# /kantor/ — Kantor Jerco (lantai 3D)

Halaman statis: `index.html` + `style.css` + `src/boot.js` + `img/`.

| Path | Isi |
|---|---|
| `src/boot.js` | Yang dimuat halaman. Menjalankan sumber Preact + htm. |
| `src/parts/` | Sumber yang sama, dipecah supaya tiap file kecil. |
| `src/app.js` | Salinan utuh. Buat lagi dengan `node kantor/src/join.mjs`. |
| `app.js` | Bundle lama. Halaman tidak memakainya lagi. |
| `style.css` | Token JERCO Design System (jerco-dark / jerco-light) + animasi agent. |
| `img/fig/` | Sprite berdiri per agent (dipakai saat berjalan dan duduk menghadap kamera). |
| `img/head/` | Avatar roster. |
| `img/back/` | Sprite duduk tampak belakang (16-bit). |
| `img/top/` | Sprite duduk tampak atas (mode Atas). |

Setelah mengubah program, pecah lagi jadi `src/parts/` lalu naikkan `?v=` di `index.html` untuk `boot.js` dan `style.css`. `node kantor/src/join.mjs` menulis ulang `src/app.js`.

## Data live (`/kantor/feed.json`)

Halaman mengambil `/kantor/feed.json` saat dibuka lalu setiap 60 detik (`loadFeed()` di `src/app.js`).
Format: [`feed.schema.json`](feed.schema.json), contoh: [`feed.example.json`](feed.example.json).
File ini dibuat oleh `tools/kantor-feed/publish.mjs` dan dikirim ke server lewat `deploy/kantor-feed/`.

Feed hanya mengisi elemen yang sudah ada, tidak ada UI baru:

| Feed | Elemen yang sudah ada |
|---|---|
| `agents[].id` | Kode roster yang ada (`defaultAgents()`): GK, PM, UX, UI, FN, AI, SL, DO, ... Kode lain diabaikan. |
| `agents[].status` | `working`, `waiting_decision`, `alert` = duduk di meja (Lantai 7). `idle` atau tidak tercantum = Lantai 8. |
| `agents[].name` | Nama di roster, label meja, dan jejak (sprite tetap per kode). |
| `agents[].task_summary` | Tooltip meja. Ringkasan GK (atau PM) mengisi kartu "Grok · ringkasan keputusan lantai" + jam `updated_at`. |
| `work[]` | Item baru atau berubah masuk ke "Jejak langsung". |
| `agents[].zone`, `role` | Hanya informasi. Zona meja tetap mengikuti denah. |
| `alerts[]`, `decisions[]`, `servers[]` | Disimpan di feed, **belum ditampilkan** (perlu keputusan UI). |

Feed tidak ada, rusak, atau `updated_at` lebih dari 30 menit: roster simulasi bawaan dipakai seperti sebelumnya.
Animasi simulasi (war room, huddle, pantry) tetap berjalan untuk agent yang sedang di lantainya.

Uji lokal: `node tools/kantor-feed/publish.mjs --input tools/kantor-feed/input.example.json --out kantor/feed.json`,
lalu `python3 -m http.server 8080` dan buka `/kantor/`. `kantor/feed.json` ada di `.gitignore`, jangan di-commit.
