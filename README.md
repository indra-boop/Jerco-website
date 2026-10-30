# Jerco-website

Source code **www.jerconetwork.com**, website CV Jerco Digital Solusi: IT & telecommunication infrastructure partner (network, fiber optic/OSP, CCTV, cloud, technical documentation, BOQ/RAB, permit support).

Situs statis (HTML, CSS, JS). Tidak ada build di server. Branch `main` = yang tayang.

## Halaman

| URL | File | Isi |
|---|---|---|
| `/` | `index.html` | Beranda: layanan, portofolio, kontak, bilingual ID/EN |
| `/services/permits-licensing/` | `services/permits-licensing/index.html` | Layanan perizinan |
| `/layanan/peran-si-var-aggregator-msp/` | `layanan/peran-si-var-aggregator-msp/index.html` | Panduan beda SI, VAR, Aggregator, MSP |
| `/kantor/` | `kantor/` | Kantor Jerco: lantai virtual 3D tempat agent AI bekerja (lihat `kantor/README.md`) |
| `/404.html` | `404.html` | Halaman 404 bermerek |

## Struktur

```
index.html, 404.html     halaman utama dan 404
css/                     style.css, components.css, responsive.css, tailwind.built.css (sudah di-build, ikut di-commit)
js/                      main, navigation, language (ID/EN), theme, ai-assistant, config
data/                    content-id.json, content-en.json (teks bilingual)
assets/                  logo, ikon, gambar hero dan portofolio
services/, layanan/      halaman layanan
kantor/                  Kantor Jerco (halaman statis + bundle Preact)
deploy/                  skrip auto-deploy ke VPS (tidak dipublikasikan)
tools/kantor-feed/       publisher feed /kantor/ (dijalankan dari box, tidak dipublikasikan)
sitemap.xml, robots.txt  SEO
```

## Kerja lokal

```bash
python3 -m http.server 8080      # buka http://localhost:8080
npm install
npm run build:css                # setelah mengubah class Tailwind
npm run build:kantor             # setelah mengubah kantor/src/app.js
```

## Deploy

- Server `jkt-jerconetwork` (nginx) menarik branch `main` **setiap 6 jam** (08:00, 14:00, 20:00, 02:00 WITA) lewat `jerco-website-sync`.
- Deploy manual: `sudo jerco-website-sync sync`. Rollback: `sudo jerco-website-sync rollback`.
- Tidak ikut dipublikasikan: `deploy/`, `README.md`, `CLAUDE.md`, `.git*`, `package*.json`, `node_modules/`, `tailwind.config.js`, `css/tailwind.input.css`.
- Detail: [`deploy/README.md`](deploy/README.md).

## Aturan kontribusi

- Kerja di branch, lalu PR ke `main`. Merge = tayang di deploy berikutnya.
- Jangan commit secret, `.env`, atau data client mentah.
- Ubah halaman? Cek `canonical`, `og:*`, dan `sitemap.xml` ikut sesuai.
