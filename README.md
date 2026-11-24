# Finora

Finora adalah aplikasi web lokal untuk mencatat keuangan pribadi dalam rupiah. Aplikasi menghitung saldo setiap rekening dari saldo awal yang Anda masukkan dan transaksi yang tercatat. Transfer antarrekening dan penyesuaian mengubah saldo rekening, sementara grafik arus kas menghitung pemasukan dan pengeluaran.

## Menjalankan Finora

Gunakan Node.js 22 LTS (minimal 22.12) atau Node.js 24 LTS.

```powershell
npm ci
npm run dev
```

Buka [Finora di localhost](http://127.0.0.1:3000). Pilih **Mulai** untuk membuat rekening tunai dengan saldo awal pilihan Anda atau lewati jika ingin menambah rekening sendiri. Untuk menjalankan build produksi, gunakan `npm run build` lalu `npm start`. Untuk memakai port lain, jalankan `node scripts/finora.mjs start --port 3001`.

## Penyimpanan dan backup

Finora membuat dan memigrasikan database saat mulai. Lokasi bawaan `finora.db` bergantung pada sistem operasi.

- Windows memakai `%LOCALAPPDATA%\Finora\data\finora.db`.
- macOS memakai `~/Library/Application Support/Finora/finora.db`.
- Linux memakai `~/.local/share/finora/finora.db` atau `$XDG_DATA_HOME/finora/finora.db`.

Setel `FINORA_DATA_DIR` ke path absolut untuk memilih direktori lain. Server hanya mendengarkan di `127.0.0.1`. Ekspor laporan CSV tersedia di **Laporan**. Unduh backup JSON atau pulihkan seluruh isi database melalui **Pengaturan**. Layar konfirmasi menampilkan jumlah rekening, kategori, dan transaksi sebelum penggantian data.

## Verifikasi

```powershell
npm run db:validate
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Playwright memakai database sementara yang terpisah dari data Finora Anda. Lihat [spesifikasi](docs/SPEC.md) dan [tahapan implementasi](docs/TASKS.md) untuk aturan data dan cakupan setiap fase.
