import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('records transactions, exports reports, restores data and persists preferences', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ringkasan' })).toBeVisible();
  await expect(page.getByText('0 rekening aktif')).toBeVisible();
  await page.getByRole('button', { name: 'Mulai', exact: true }).click();
  const setup = page.getByRole('dialog');
  await expect(setup.getByRole('checkbox')).toBeChecked();
  await setup.getByLabel('Saldo awal').fill('100000');
  await setup.getByRole('button', { name: 'Selesaikan setup' }).click();
  await expect(page.getByText('1 rekening aktif')).toBeVisible();

  await page.getByRole('link', { name: 'Rekening', exact: true }).click();
  await page.getByRole('button', { name: 'Tambah rekening' }).click();
  const account = page.getByRole('dialog');
  await account.getByLabel('Nama', { exact: true }).fill('Bank Mandiri');
  await account.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bank Mandiri' })).toBeVisible();

  await page.getByRole('link', { name: 'Kategori', exact: true }).click();
  await page.getByRole('button', { name: 'Tambah kategori' }).click();
  await page.getByRole('dialog').getByLabel('Nama', { exact: true }).fill('Makan Kantor');
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByText('Makan Kantor', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Transaksi', exact: true }).click();
  await page.getByRole('button', { name: 'Tambah transaksi' }).first().click();
  const form = page.getByRole('dialog');
  await form.getByRole('button', { name: 'Transfer', exact: true }).click();
  await form.getByLabel('Nominal', { exact: true }).fill('15000');
  await form.getByLabel('Rekening', { exact: true }).selectOption({ label: 'Tunai' });
  await form.getByLabel('Rekening tujuan').selectOption({ label: 'Bank Mandiri' });
  await form.getByLabel('Deskripsi', { exact: true }).fill('Pindah dana');
  await form.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pindah dana' })).toBeVisible();

  await page.getByRole('button', { name: 'Tambah transaksi' }).click();
  await form.getByLabel('Nominal', { exact: true }).fill('8500');
  await form.getByLabel('Rekening', { exact: true }).selectOption({ label: 'Tunai' });
  await form.getByLabel('Kategori', { exact: true }).selectOption({ label: 'Makanan & Minuman' });
  await form.getByLabel('Deskripsi', { exact: true }).fill('Makan siang');
  await form.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Makan siang' })).toBeVisible();
  await page.getByRole('searchbox').fill('makan');
  await expect(page.getByRole('button', { name: 'Pindah dana' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Ringkasan' }).click();
  await expect(page.getByText(/91\.500/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Periode' }).selectOption('previous');
  await expect(page.getByText(/91\.500/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Makan siang' })).toBeVisible();

  await page.getByRole('link', { name: 'Laporan' }).click();
  const csvPending = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Unduh CSV' }).click();
  const csv = await csvPending;
  expect(await readFile(await csv.path(), 'utf8')).toContain('Makan siang');

  await page.getByRole('link', { name: 'Pengaturan' }).click();
  const backupPending = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Unduh backup' }).click();
  const backup = await backupPending;
  const json = await readFile(await backup.path(), 'utf8');
  expect(JSON.parse(json).data.transactions).toHaveLength(2);
  const largeBackup = JSON.parse(json);
  largeBackup.data.transactions = Array.from({ length: 5_500 }, (_, index) => ({
    ...largeBackup.data.transactions[0], id: `large-${index}`, notes: 'a'.repeat(2_000),
  }));
  const largeBody = JSON.stringify(largeBackup);
  expect(Buffer.byteLength(largeBody)).toBeGreaterThan(10 * 1024 * 1024);
  const origin = new URL(page.url()).origin;
  const preview = await page.request.post('/api/restore', {
    headers: { Origin: origin, 'Content-Type': 'application/json' }, data: largeBody,
  });
  expect(preview.status()).toBe(200);
  expect((await preview.json()).transactions).toBe(5_500);
  const blocked = await page.request.post('/api/restore', { headers: { Origin: 'http://external.invalid' }, data: json });
  expect(blocked.status()).toBe(403);
  const invalidVersion = JSON.parse(json);
  invalidVersion.version = 99;
  const picker = page.locator('input[type=file]');
  await picker.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalidVersion)) });
  await expect(page.getByRole('alert').filter({ hasText: 'File backup tidak valid' })).toBeVisible();
  await picker.setInputFiles({ name: 'finora.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  const restore = page.getByRole('dialog');
  await expect(restore.getByText('2', { exact: true })).toHaveCount(2);
  await restore.getByRole('button', { name: 'Pulihkan backup' }).click();
  await expect(page.getByText('Backup berhasil dipulihkan.')).toBeVisible();

  await page.getByRole('link', { name: 'Transaksi', exact: true }).click();
  await page.getByRole('button', { name: 'Makan siang' }).click();
  await form.getByRole('button', { name: 'Edit', exact: true }).click();
  await form.getByLabel('Nominal', { exact: true }).fill('6000');
  await form.getByRole('button', { name: 'Simpan perubahan' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Makan siang' })).toContainText('6.000');
  await page.getByRole('button', { name: 'Pindah dana' }).click();
  await form.getByRole('button', { name: 'Hapus', exact: true }).click();
  await form.getByRole('button', { name: 'Konfirmasi' }).click();
  await expect(page.getByRole('button', { name: 'Pindah dana' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Pengaturan' }).click();

  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Dark', exact: true }).last().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Collapse sidebar' }).first().click();
  await expect(page.locator('.workspace')).toHaveClass(/rail/);
  await page.getByRole('link', { name: 'Categories' }).click();
  await expect(page.getByText('Food & Beverage', { exact: true })).toBeVisible();
  await expect(page.getByText('Makan Kantor', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.workspace')).toHaveClass(/rail/);
});

test('mobile menu opens and no page-wide horizontal overflow occurs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('main h1')).toBeVisible();
  await expect.poll(() => page.locator('html').evaluate(node => node.scrollWidth - node.clientWidth)).toBe(0);
  await page.getByRole('button', { name: /Buka menu|Open menu/ }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.getByRole('link', { name: /Kategori|Categories/ }).click();
  await expect(page.locator('main h1')).toHaveText(/Kategori|Categories/);
  await expect(page.getByRole('navigation')).not.toBeVisible();
});
