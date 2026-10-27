# /kantor/ — Kantor Jerco (lantai 3D)

Halaman statis: `index.html` + `style.css` + `app.js` (bundle) + `img/`.

| Path | Isi |
|---|---|
| `src/app.js` | Sumber halaman (Preact + htm). Edit di sini. |
| `app.js` | Hasil bundle, yang dipakai halaman. Jangan edit manual. |
| `style.css` | Token JERCO Design System (jerco-dark / jerco-light) + animasi agent. |
| `img/fig/` | Sprite berdiri per agent (dipakai saat berjalan dan duduk menghadap kamera). |
| `img/head/` | Avatar roster. |
| `img/back/` | Sprite duduk tampak belakang (16-bit). |
| `img/top/` | Sprite duduk tampak atas (mode Atas). |

Build ulang setelah mengubah `src/app.js`:

```bash
npm install
npm run build:kantor
```

Naikkan `?v=` di `index.html` setiap kali `app.js` atau `style.css` berubah supaya cache browser ikut ter-update.

Data agent masih simulasi di sisi browser (`agents()` di `src/app.js`), belum tersambung ke backend.
