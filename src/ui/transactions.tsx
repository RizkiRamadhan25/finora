'use client';

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react';
import type { z } from 'zod';
import type { Data, Transaction } from '@/domain/data';
import { transactionInput } from '@/domain/schema';
import { categoryName, directions, filterRange, formatDate, money, transactionTypes, type Language } from '@/domain/finance';
import { Button, Empty, Field, Modal } from './primitives';
import { Confirm, FormActions, useSave, type Feedback } from './form-utils';
import { TransactionTable } from './transaction-table';
import { transactionIcons } from './icons';
import type { Translate } from './i18n';

type Common = { data: Data; language: Language; t: Translate };
type TxInput = z.input<typeof transactionInput>;
type TxOutput = z.output<typeof transactionInput>;

export function TransactionsView({ data, language, t, onSelect, onNew }: Common & {
  onSelect: (item: Transaction) => void; onNew: () => void;
}) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [account, setAccount] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const invalidRange = Boolean(from && to && from > to);
  const filtered = Boolean(search || type || account || from || to);
  const items = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(language);
    const categories = new Map(data.categories.map(item => [item.id, categoryName(item, language)]));
    const accounts = new Map(data.accounts.map(item => [item.id, item.name]));
    return filterRange(data.transactions, { from, to }, account).filter(item => (!type || item.type === type) &&
      (!query || [item.description, item.notes, categories.get(item.categoryId ?? ''), accounts.get(item.accountId), accounts.get(item.destinationAccountId ?? '')]
        .some(text => text?.toLocaleLowerCase(language).includes(query))));
  }, [data, account, from, to, language, search, type]);

  return <section className="panel transaction-panel">
    <div className="filter-bar">
      <label className="search-field"><Search size={17} /><input type="search" aria-label={t('search')} placeholder={t('search')} value={search} onChange={event => setSearch(event.target.value)} /></label>
      <select aria-label={t('type')} value={type} onChange={event => setType(event.target.value)}>
        <option value="">{t('type')} · {t('all')}</option>{transactionTypes.map(value => <option key={value} value={value}>{t(value)}</option>)}
      </select>
      <select aria-label={t('account')} value={account} onChange={event => setAccount(event.target.value)}>
        <option value="">{t('account')} · {t('all')}</option>{data.accounts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <Field label={t('from')}>{id => <input id={id} type="date" value={from} onChange={event => setFrom(event.target.value)} />}</Field>
      <Field label={t('to')}>{id => <input id={id} type="date" min={from || undefined} value={to} onChange={event => setTo(event.target.value)} />}</Field>
      {filtered && <Button kind="ghost" onClick={() => { setSearch(''); setType(''); setAccount(''); setFrom(''); setTo(''); }}>{t('reset')}</Button>}
    </div>
    {invalidRange
      ? <p className="validation filter-error" role="alert">{t('rangeInvalid')}</p>
      : <TransactionTable items={items} data={data} t={t} language={language} onSelect={onSelect} filtered={filtered} />}
    {!filtered && !data.transactions.length && <div className="panel-empty-action"><Button onClick={onNew}><Plus size={16} />{t('addTransaction')}</Button></div>}
  </section>;
}

export function TransactionDialog({ item, data, language, today, t, onClose, onAccount, feedback }: Common & {
  item?: Transaction; today: string; onClose: () => void; feedback: Feedback; onAccount: () => void;
}) {
  const [mode, setMode] = useState(item ? 'detail' : 'form');
  const category = data.categories.find(value => value.id === item?.categoryId);
  const account = data.accounts.find(value => value.id === item?.accountId);
  const destination = data.accounts.find(value => value.id === item?.destinationAccountId);
  const isArchived = Boolean(account?.isArchived || destination?.isArchived);

  if (mode === 'delete' && item) return <Confirm item={{ operation: 'deleteTransaction', id: item.id,
    title: t('delete'), detail: t('confirmDeleteTx'), danger: true }} onClose={onClose} t={t} feedback={feedback} />;
  if (mode === 'detail' && item) return <Modal title={item.description} onClose={onClose} t={t}>
    <dl className="transaction-detail">
      <div><dt>{t('amount')}</dt><dd className="detail-amount">{money(item.amount, language)}</dd></div>
      <div><dt>{t('type')}</dt><dd>{t(item.type as keyof typeof transactionIcons)}</dd></div>
      <div><dt>{t('date')}</dt><dd>{formatDate(item.transactionDate, language)}</dd></div>
      <div><dt>{t('account')}</dt><dd>{account?.name}</dd></div>
      {destination && <div><dt>{t('destination')}</dt><dd>{destination.name}</dd></div>}
      {category && <div><dt>{t('category')}</dt><dd>{categoryName(category, language)}</dd></div>}
      {item.adjustmentDirection && <div><dt>{t('direction')}</dt><dd>{t(item.adjustmentDirection as (typeof directions)[number])}</dd></div>}
      {item.notes && <div className="full-width"><dt>{t('notes')}</dt><dd>{item.notes}</dd></div>}
    </dl>
    {isArchived && <p className="validation">{t('accountArchived')}</p>}
    <div className="modal-actions">
      <Button kind="ghost" disabled={isArchived} onClick={() => setMode('delete')}><Trash2 size={16} />{t('delete')}</Button>
      <Button kind="primary" disabled={isArchived} onClick={() => setMode('form')}><Pencil size={16} />{t('edit')}</Button>
    </div>
  </Modal>;
  if (!data.accounts.some(value => !value.isArchived)) return <Modal title={t('addTransaction')} onClose={onClose} t={t}>
    <Empty icon={Wallet} title={t('noAccounts')} description={t('noAccountForTransaction')}>
      <Button kind="primary" onClick={onAccount}>{t('addAccount')}</Button>
    </Empty>
  </Modal>;
  return <TransactionForm item={item} data={data} language={language} today={today} t={t} onClose={onClose} feedback={feedback} />;
}

function TransactionForm({ item, data, language, today, t, onClose, feedback }: Common & {
  item?: Transaction; today: string; onClose: () => void; feedback: Feedback;
}) {
  const { busy, error, save } = useSave(t, onClose, feedback);
  const accounts = data.accounts.filter(account => !account.isArchived);
  const { register, control, setValue, handleSubmit, formState: { errors } } = useForm<TxInput, unknown, TxOutput>({
    resolver: zodResolver(transactionInput),
    defaultValues: { type: (item?.type ?? 'EXPENSE') as TxInput['type'], amount: item?.amount ?? '', accountId: item?.accountId ?? accounts[0]?.id,
      categoryId: item?.categoryId ?? null, destinationAccountId: item?.destinationAccountId ?? null,
      adjustmentDirection: item?.adjustmentDirection as TxInput['adjustmentDirection'] ?? 'INCREASE',
      description: item?.description ?? '', notes: item?.notes ?? '', transactionDate: item?.transactionDate ?? today },
  });
  const type = useWatch({ control, name: 'type' });
  const accountId = useWatch({ control, name: 'accountId' });
  const categories = data.categories.filter(category => category.type === type && (!category.isArchived || category.id === item?.categoryId));
  const submit = (input: TxOutput) => save('saveTransaction', { ...input, id: item?.id,
    destinationAccountId: type === 'TRANSFER' ? input.destinationAccountId : null,
    adjustmentDirection: type === 'ADJUSTMENT' ? input.adjustmentDirection : null,
    categoryId: type === 'EXPENSE' || type === 'INCOME' ? input.categoryId : null });
  return <Modal title={item ? t('edit') + ' ' + t('transactions').toLowerCase() : t('addTransaction')} onClose={() => { if (!busy) onClose(); }} t={t}>
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="segmented tx-types" aria-label={t('type')}>{transactionTypes.map(value => <button type="button" key={value}
        aria-pressed={type === value} onClick={() => { if (type !== value) { setValue('type', value); setValue('categoryId', null); setValue('destinationAccountId', null); } }}>{t(value)}</button>)}</div>
      <div className="form-grid">
        <Field label={t('amount')} error={errors.amount && t('required')} hint={t('amountHint')}>{(id, help) => <input id={id} aria-describedby={help} data-modal-focus inputMode="numeric" maxLength={19} {...register('amount')} />}</Field>
        <Field label={t('date')} error={errors.transactionDate && t('dateInvalid')}>{(id, help) => <input id={id} aria-describedby={help} type="date" max={today} {...register('transactionDate')} />}</Field>
        <Field label={t('account')} error={errors.accountId && t('required')}>{(id, help) => <select id={id} aria-describedby={help} {...register('accountId')}>
          {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select>}</Field>
        {(type === 'EXPENSE' || type === 'INCOME') && <Field label={t('category')} error={errors.categoryId && t('required')}>{(id, help) => <select id={id} aria-describedby={help} {...register('categoryId', { setValueAs: value => value || null })}>
          <option value="">{t('choose')}</option>{categories.map(category => <option key={category.id} value={category.id}>{categoryName(category, language)}</option>)}</select>}</Field>}
        {type === 'TRANSFER' && <Field label={t('destination')} error={errors.destinationAccountId && t('required')}>{(id, help) => <select id={id} aria-describedby={help} {...register('destinationAccountId', { setValueAs: value => value || null })}>
          <option value="">{t('choose')}</option>{accounts.filter(account => account.id !== accountId).map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select>}</Field>}
        {type === 'ADJUSTMENT' && <Field label={t('direction')}>{id => <select id={id} {...register('adjustmentDirection')}>
          {directions.map(value => <option key={value} value={value}>{t(value)}</option>)}</select>}</Field>}
        <div className="full-width"><Field label={t('description')} error={errors.description && t('required')}>{(id, help) => <input id={id} aria-describedby={help} maxLength={160} {...register('description')} />}</Field></div>
        <div className="full-width"><Field label={t('notes')}>{id => <textarea id={id} rows={2} maxLength={2000} {...register('notes')} />}</Field></div>
      </div>
      <FormActions busy={busy} error={error} onClose={onClose} t={t} submitLabel={item ? t('update') : t('save')} />
    </form>
  </Modal>;
}
