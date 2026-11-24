import type { Data } from '../domain/data';
import { categoryName, type Language } from '../domain/finance';

function textCell(value: string) {
  const text = /^[\u0000-\u0020]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]/u.test(value) || /^[\t\r\n]/u.test(value) ? "'" + value : value;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function transactionCsv(data: Data, transactions: Data['transactions'], language: Language) {
  const headings = language === 'en'
    ? ['Date', 'Type', 'Account', 'Destination account', 'Category', 'Direction', 'Description', 'Notes', 'Amount (IDR)']
    : ['Tanggal', 'Jenis', 'Rekening', 'Rekening tujuan', 'Kategori', 'Arah', 'Deskripsi', 'Catatan', 'Nominal (IDR)'];
  const types: Record<string, [string, string]> = {
    INCOME: ['Pemasukan', 'Income'], EXPENSE: ['Pengeluaran', 'Expense'], TRANSFER: ['Transfer', 'Transfer'],
    ADJUSTMENT: ['Penyesuaian', 'Adjustment'], INCREASE: ['Tambah saldo', 'Increase'], DECREASE: ['Kurangi saldo', 'Decrease'],
  };
  const localized = (value: string) => types[value]?.[language === 'en' ? 1 : 0] ?? value;
  const accounts = new Map(data.accounts.map(item => [item.id, item.name]));
  const categories = new Map(data.categories.map(item => [item.id, item]));
  const rows = transactions.map(item => {
    const category = categories.get(item.categoryId ?? '');
    return [
      item.transactionDate, localized(item.type), accounts.get(item.accountId) ?? '',
      accounts.get(item.destinationAccountId ?? '') ?? '', category ? categoryName(category, language) : '',
      localized(item.adjustmentDirection ?? ''), item.description, item.notes ?? '',
    ].map(textCell).concat(item.amount).join(',');
  });
  return '\uFEFF' + [headings.map(textCell).join(','), ...rows].join('\r\n') + '\r\n';
}
