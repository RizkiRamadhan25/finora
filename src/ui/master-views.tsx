'use client';

import { useState } from 'react';
import { Archive, ArrowLeft, Pencil, Plus, RotateCcw, Tag, Trash2, Wallet } from 'lucide-react';
import type { Account, Category, Data } from '@/domain/data';
import { categoryName, formatDate, money, type Language } from '@/domain/finance';
import { accountIcons, customIcon } from './icons';
import { Button, Empty } from './primitives';
import { AccountForm, CategoryForm } from './master-forms';
import { Chip, Confirm, type Confirmation, type Feedback } from './form-utils';
import { TransactionTable } from './transaction-table';
import type { Translate } from './i18n';

type Common = { data: Data; t: Translate; language: Language; feedback: Feedback };

export function AccountBadge({ account }: { account: Account }) {
  const Icon = customIcon(account.icon) ?? accountIcons[account.type as keyof typeof accountIcons] ?? Wallet;
  return <span className="record-icon" style={{ color: account.color ?? 'var(--primary)' }}><Icon size={19} /></span>;
}

export function AccountsView({ data, t, language, feedback, balances, today, onTransaction }: Common & {
  balances: Map<string, bigint>; today: string; onTransaction: (id: string) => void;
}) {
  const [form, setForm] = useState<Account | 'new' | null>(null);
  const [detailId, setDetailId] = useState<string>();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const detail = data.accounts.find(account => account.id === detailId);
  const inUse = new Set(data.transactions.flatMap(item => [item.accountId, item.destinationAccountId]));
  const action = (account: Account, type: 'archive' | 'activate' | 'delete') => {
    setConfirmation({ operation: `${type}Account`, id: account.id, title: t(type), danger: type === 'delete',
      detail: type === 'delete' ? t('confirmDeleteAccount') : type === 'archive' ? t('confirmArchive') : account.name });
  };

  return <>
    {detail ? <>
      <Button kind="ghost" className="back-button" onClick={() => setDetailId(undefined)}><ArrowLeft size={16} />{t('back')}</Button>
      <section className="panel account-detail">
        <AccountBadge account={detail} />
        <div><h2>{detail.name}</h2><p className="muted">{t(detail.type as keyof typeof accountIcons)}{detail.provider && ` · ${detail.provider}`}</p></div>
        <div className="detail-balance"><span className="muted">{t('currentBalance')}</span><strong>{money(balances.get(detail.id) ?? 0n, language)}</strong></div>
        <Button onClick={() => setForm(detail)}><Pencil size={16} />{t('edit')}</Button>
        <dl className="detail-meta">
          <div><dt>{t('openingDate')}</dt><dd>{formatDate(detail.openingDate, language)}</dd></div>
          <div><dt>{t('openingBalance')}</dt><dd>{money(detail.openingBalance, language)}</dd></div>
          <div><dt>{t('notes')}</dt><dd>{detail.notes || '—'}</dd></div>
        </dl>
      </section>
      <section className="panel"><div className="panel-header"><h2>{t('transactions')}</h2></div>
        <TransactionTable items={data.transactions.filter(item => item.accountId === detail.id || item.destinationAccountId === detail.id)} data={data}
          language={language} t={t} accountScope={detail.id} onSelect={item => onTransaction(item.id)} />
      </section>
    </> : <>
      <div className="section-actions"><Button kind="primary" onClick={() => setForm('new')}><Plus size={18} />{t('addAccount')}</Button></div>
      {data.accounts.length === 0 && <section className="panel"><Empty icon={Wallet} title={t('noAccounts')} /></section>}
      <div className="master-grid">
        {data.accounts.map(account => {
          const balance = balances.get(account.id) ?? 0n;
          return <article className="panel account-card" key={account.id}>
            <div className="record-heading"><AccountBadge account={account} /><div><h2>{account.name}</h2>
              <span className="muted">{t(account.type as keyof typeof accountIcons)}{account.provider && ` · ${account.provider}`}</span></div>
              {account.isArchived && <Chip>{t('archived')}</Chip>}</div>
            <div className="account-card-balance"><span className="muted">{t('currentBalance')}</span><strong>{money(balance, language)}</strong>
              {balance < 0n && <Chip className="warning-chip">{t('negative')}</Chip>}</div>
            <div className="record-actions">
              <Button onClick={() => setDetailId(account.id)}>{t('details')}</Button>
              <Button aria-label={`${t('edit')} ${account.name}`} className="icon-button" onClick={() => setForm(account)}><Pencil size={16} /></Button>
              <Button aria-label={`${t(account.isArchived ? 'activate' : 'archive')} ${account.name}`} className="icon-button"
                onClick={() => action(account, account.isArchived ? 'activate' : 'archive')}>{account.isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}</Button>
              {!inUse.has(account.id) && <Button aria-label={`${t('delete')} ${account.name}`} className="icon-button" onClick={() => action(account, 'delete')}><Trash2 size={16} /></Button>}
            </div>
          </article>;
        })}
      </div>
    </>}
    {form && <AccountForm item={form === 'new' ? undefined : form} locked={form !== 'new' && inUse.has(form.id)} language={language} today={today} t={t} feedback={feedback} onClose={() => setForm(null)} />}
    {confirmation && <Confirm item={confirmation} t={t} feedback={feedback} onClose={() => setConfirmation(null)} />}
  </>;
}

export function CategoriesView({ data, t, language, feedback }: Common) {
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [state, setState] = useState('active');
  const [form, setForm] = useState<Category | 'new' | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const inUse = new Set(data.transactions.map(item => item.categoryId));
  const items = data.categories.filter(item => item.type === type && (state === 'all' || item.isArchived === (state === 'archived')))
    .sort((left, right) => categoryName(left, language).localeCompare(categoryName(right, language), language));
  const action = (item: Category, purpose: 'archive' | 'activate' | 'delete') => {
    setConfirmation({ operation: `${purpose}Category`, id: item.id, title: t(purpose), danger: purpose === 'delete',
      detail: purpose === 'delete' ? t('confirmDeleteCategory') : purpose === 'archive' ? t('confirmArchive') : categoryName(item, language) });
  };

  return <>
    <div className="section-actions spread">
      <div className="segmented" aria-label={t('type')}>{(['EXPENSE', 'INCOME'] as const).map(value =>
        <button key={value} aria-pressed={type === value} onClick={() => setType(value)}>{t(value)}</button>)}</div>
      <select aria-label={t('filter')} value={state} onChange={event => setState(event.target.value)}>
        <option value="active">{t('active')}</option><option value="archived">{t('archived')}</option><option value="all">{t('all')}</option>
      </select>
      <Button className="push" kind="primary" onClick={() => setForm('new')}><Plus size={18} />{t('addCategory')}</Button>
    </div>
    <section className="panel category-list" aria-label={t('categories')}>
      {items.length === 0 && <Empty icon={Tag} title={t('noCategories')} />}
      {items.map(item => {
        const Icon = customIcon(item.icon) ?? Tag;
        const name = categoryName(item, language);
        return <div className="category-row" key={item.id}>
          <span className="record-icon" style={{ color: item.color ?? 'var(--primary)' }}><Icon size={18} /></span>
          <strong>{name}</strong>
          {item.systemKey && <Chip>{t('system')}</Chip>}
          {item.isArchived && <Chip>{t('archived')}</Chip>}
          <div className="record-actions push">
            <Button aria-label={`${t('edit')} ${name}`} className="icon-button" kind="ghost" onClick={() => setForm(item)}><Pencil size={16} /></Button>
            <Button aria-label={`${t(item.isArchived ? 'activate' : 'archive')} ${name}`} className="icon-button" kind="ghost"
              onClick={() => action(item, item.isArchived ? 'activate' : 'archive')}>{item.isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}</Button>
            {!item.systemKey && !inUse.has(item.id) && <Button aria-label={`${t('delete')} ${name}`} className="icon-button" kind="ghost" onClick={() => action(item, 'delete')}><Trash2 size={16} /></Button>}
          </div>
        </div>;
      })}
    </section>
    {form && <CategoryForm item={form === 'new' ? undefined : form} initialType={type} locked={form !== 'new' && Boolean(form.systemKey || inUse.has(form.id))}
      language={language} t={t} feedback={feedback} onClose={() => setForm(null)} />}
    {confirmation && <Confirm item={confirmation} t={t} feedback={feedback} onClose={() => setConfirmation(null)} />}
  </>;
}
