# Finora MVP

Aplikasi keuangan pribadi untuk satu pengguna. Seluruh data berada di SQLite lokal. Dokumen ini merangkum fitur dan aturan yang digunakan dalam Finora v1.0.0.

## Data dan aturan

- `Account`, `Category`, `Transaction`, dan `AppSetting` mengikuti ERD Prisma. Rekening dapat berupa bank, dompet digital, tunai, dan lainnya. Setup menawarkan rekening tunai Rp0 dengan pilihan untuk melewati.
- Saldo aktual dihitung dari saldo awal manual dan transaksi dengan BigInt. Transfer adalah satu record dengan dua rekening. Penyesuaian dan transfer memengaruhi saldo, sedangkan arus kas hanya menghitung pemasukan dan pengeluaran.
- Tanggal transaksi berupa tanggal kalender lokal, mulai dari tanggal pembukaan kedua rekening terkait sampai hari ini. Saldo boleh negatif dengan peringatan. Riwayat rekening arsip hanya dapat diubah setelah rekening diaktifkan kembali.
- Saldo awal dan tanggal pembukaan terkunci setelah rekening memiliki transaksi. Rekening hanya bisa diarsipkan ketika saldonya nol. Penghapusan rekening dan kategori mengikuti riwayat dan relasinya. Nama dan identitas kategori bawaan terkunci.
- Backup JSON berversi mencakup keempat tabel. Nominal dikirim sebagai string desimal. Restore memvalidasi data dan relasi, meminta konfirmasi, lalu mengganti data dalam satu transaksi SQLite.

## Pengalaman pengguna

- Finora memakai bahasa Indonesia dan English, tema Light dan Dark, sidebar yang dapat diciutkan, drawer di ponsel, serta modal untuk transaksi.
- Dashboard memakai bulan berjalan sebagai filter awal. Saldo dan daftar rekening aktif selalu aktual. Grafik memakai enam bulan kalender terakhir. Lima transaksi terbaru mengikuti seluruh riwayat.
- Transaksi dapat dicari, difilter, diedit, dan dihapus setelah konfirmasi. Laporan membandingkan periode, merinci kategori dan rekening, serta mengekspor CSV.
- Tampilan menggunakan Geist, warna hijau untuk pemasukan dan biru untuk pengeluaran, latar netral, serta hierarki yang menempatkan saldo aktual dan grafik arus kas di depan.

## Runtime

Next.js dengan App Router dan TypeScript strict, Prisma 6 dan SQLite, Tailwind CSS, komponen UI berbasis shadcn, Recharts, Lucide, Zod, React Hook Form, Vitest, dan Playwright. Server bind ke `127.0.0.1`. Database berada di direktori data pengguna. Next.js membaca dari Server Components, memutasi lewat Server Actions, dan memakai Route Handlers untuk file.
