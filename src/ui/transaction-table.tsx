'use client';

import { ReceiptText, Wallet } from 'lucide-react';
import type { Data, Transaction } from '@/domain/data';
import { categoryName, formatDate, money, signedAmount, type Language } from '@/domain/finance';
import { transactionIcons, customIcon } from './icons';
import { Empty } from './primitives';
import type { Translate } from './i18n';

export function TransactionTable({ items, data, language, t, onSelect, accountScope, filtered = false, compact = false }: {
  items: Transaction[]; data: Data; language: Language; t: Translate; onSelect: (item: Transaction) => void;
  accountScope?: string; filtered?: boolean; compact?: boolean;
}) {
  if (!items.length) return <Empty icon={ReceiptText} title={t(filtered ? 'noResults' : 'noTransactions')}
    description={filtered ? undefined : t('noTransactionsHint')} />;
  const accounts = new Map(data.accounts.map(item => [item.id, item.name]));
  const categories = new Map(data.categories.map(item => [item.id, item]));
  return <div className="table-scroll"><table className={compact ? 'transaction-table compact-table' : 'transaction-table'}>
    <thead><tr>
      <th scope="col">{t('description')}</th>
      {!compact && <th scope="col">{t('account')}</th>}
      <th scope="col">{t('date')}</th>
      <th scope="col" className="align-end">{t('amount')}</th>
    </tr></thead>
    <tbody>{items.map(item => {
      const category = categories.get(item.categoryId ?? '');
      const type = item.type as keyof typeof transactionIcons;
      const Icon = customIcon(category?.icon) ?? transactionIcons[type] ?? Wallet;
      const signed = signedAmount(item, accountScope);
      const transfer = type === 'TRANSFER' && !accountScope;
      return <tr key={item.id}>
        <td><div className="transaction-label"><span className={`record-icon ${type.toLowerCase()}`}><Icon size={17} /></span>
          <span><button className="text-button row-title" onClick={() => onSelect(item)}>{item.description}</button>
          <small>{category ? categoryName(category, language) : t(type)}</small></span></div></td>
        {!compact && <td>{accounts.get(item.accountId)}{item.destinationAccountId && <> → {accounts.get(item.destinationAccountId)}</>}</td>}
        <td className="nowrap">{formatDate(item.transactionDate, language, compact ? { day: 'numeric', month: 'short' } : undefined)}</td>
        <td className={`align-end nowrap amount ${!transfer && signed > 0n ? 'positive' : ''}`}>
          {transfer ? money(item.amount, language) : `${signed > 0n ? '+' : ''}${money(signed, language)}`}</td>
      </tr>;
    })}</tbody>
  </table></div>;
}
