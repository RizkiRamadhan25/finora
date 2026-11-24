import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { getDb } from '@/server/db';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Finora — Keuangan Pribadi',
  description: 'Kelola rekening, transaksi, dan laporan keuangan pribadi di perangkat Anda.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getDb().appSetting.findMany();
  const language = settings.find(item => item.key === 'language')?.value ?? 'id';
  const theme = settings.find(item => item.key === 'theme')?.value ?? 'light';
  return <html lang={language} data-theme={theme} className={GeistSans.variable}>
    <body>{children}</body>
  </html>;
}
