# Finora Implementation Plan

**Tujuan** Mengirim MVP Finora yang dapat dijalankan dan diuji secara lokal.

**Spesifikasi** [Finora MVP](SPEC.md)

- [x] Fase 0 — Siapkan runtime, dependensi dan lockfile, schema, migrasi dengan CHECK dan foreign key, seed idempoten, direktori data, serta runner Vitest dan Playwright.
- [x] Fase 1 — Buat shell Next.js, token warna, tipografi, navigasi responsif, modal, tema, serta kamus Indonesia dan English.
- [x] Fase 2 — Buat onboarding, pengelolaan rekening, dan kategori sistem maupun kustom. Verifikasi penguncian saldo awal, syarat arsip, dan perlindungan kategori.
- [x] Fase 3 — Buat empat jenis transaksi, perhitungan BigInt, validasi relasi, pencarian dan filter, edit, hapus, serta peringatan saldo negatif. Uji transfer sebagai satu record dengan dampak pada kedua rekening.
- [x] Fase 4 — Tampilkan saldo aktual, statistik periode, tren enam bulan, pengeluaran per kategori, dan lima transaksi terbaru.
- [x] Fase 5 — Buat laporan berdasarkan rentang dan rekening, pembanding periode, serta ekspor CSV UTF-8. Uji presisi angka dan keamanan sel teks.
- [x] Fase 6 — Buat pengaturan, unduhan backup berversi, dan restore dengan tinjauan isi serta konfirmasi. Uji pemulihan atomik dan integritas relasi.
- [x] Fase 7 — Jalankan pemeriksaan tipe, 10 tes Vitest, 2 tes Playwright, dan build produksi. Periksa tampilan desktop dan ponsel, metadata dependensi npm, alamat loopback, dan dokumentasi menjalankan aplikasi.

Pemeriksaan dijalankan di Windows dengan Node.js 22.14. Konvensi lokasi data Linux dan macOS diperiksa melalui fungsi pembentuk path. Runtime kedua sistem itu belum diuji.
