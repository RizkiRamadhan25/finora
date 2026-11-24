'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import type { Account, Category } from '@/domain/data';
import { accountInput, categoryInput } from '@/domain/schema';
import { accountTypes, categoryTypes, categoryName, type Language } from '@/domain/finance';
import { categoryIcons } from './icons';
import { Field, Modal } from './primitives';
import { FormActions, useSave, type Feedback } from './form-utils';
import type { Translate } from './i18n';

type Shared = { t: Translate; onClose: () => void; feedback: Feedback };

const labels = {
  utensils: ['Makanan', 'Food'], car: ['Mobil', 'Car'], bag: ['Tas', 'Bag'], receipt: ['Struk', 'Receipt'],
  heart: ['Hati', 'Heart'], book: ['Buku', 'Book'], ticket: ['Tiket', 'Ticket'], repeat: ['Ulang', 'Repeat'],
  tag: ['Label', 'Tag'], wallet: ['Dompet', 'Wallet'], coins: ['Koin', 'Coins'], briefcase: ['Tas kerja', 'Briefcase'],
  gift: ['Hadiah', 'Gift'], bank: ['Bank', 'Bank'], cash: ['Tunai', 'Cash'], card: ['Kartu', 'Card'],
} as const;

function IconOptions({ language, t }: { language: Language; t: Translate }) {
  return <><option value="">{t('choose')}</option>{Object.keys(categoryIcons).map(key => <option key={key} value={key}>{labels[key as keyof typeof labels][language === 'id' ? 0 : 1]}</option>)}</>;
}

export function AccountForm({ item, locked, today, language, t, onClose, feedback }: Shared & {
  item?: Account; locked: boolean; today: string; language: Language;
}) {
  const { busy, error, save } = useSave(t, onClose, feedback);
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof accountInput>, unknown, z.output<typeof accountInput>>({
    resolver: zodResolver(accountInput),
    defaultValues: { name: item?.name ?? '', type: item?.type as AccountType ?? 'BANK', openingBalance: item?.openingBalance ?? '0',
      openingDate: item?.openingDate ?? today, notes: item?.notes ?? '', provider: item?.provider ?? '',
      icon: item?.icon ?? null, color: item?.color ?? '#4055de' },
  });

  return <Modal title={item ? t('edit') + ' ' + t('account').toLowerCase() : t('addAccount')} onClose={() => { if (!busy) onClose(); }} t={t}>
    <form onSubmit={handleSubmit(values => save('saveAccount', { ...values, id: item?.id }))} noValidate>
      <div className="form-grid">
        <Field label={t('name')} error={errors.name && t('required')}>{(id, help) => <input id={id} aria-describedby={help} data-modal-focus maxLength={100} {...register('name')} />}</Field>
        <Field label={t('type')}>{id => <select id={id} {...register('type')}>{accountTypes.map(type => <option key={type} value={type}>{t(type)}</option>)}</select>}</Field>
        <Field label={t('openingBalance')} error={errors.openingBalance && t('required')} hint={t('amountHint')}>{(id, help) => <input id={id} aria-describedby={help} inputMode="numeric" maxLength={19} readOnly={locked} {...register('openingBalance')} />}</Field>
        <Field label={t('openingDate')} error={errors.openingDate && t('dateInvalid')}>{(id, help) => <input id={id} aria-describedby={help} type="date" max={today} readOnly={locked} {...register('openingDate')} />}</Field>
        {locked && <p className="muted full-width">{t('openingLocked')}</p>}
        <Field label={t('provider')}>{id => <input id={id} maxLength={100} {...register('provider')} />}</Field>
        <Field label={t('icon')}>{id => <select id={id} {...register('icon', { setValueAs: value => value || null })}><IconOptions language={language} t={t} /></select>}</Field>
        <Field label={t('color')}>{id => <input id={id} type="color" {...register('color')} />}</Field>
        <div className="full-width"><Field label={t('notes')}>{id => <textarea id={id} rows={2} maxLength={2000} {...register('notes')} />}</Field></div>
      </div>
      <FormActions busy={busy} error={error} onClose={onClose} t={t} submitLabel={item ? t('update') : t('save')} />
    </form>
  </Modal>;
}
type AccountType = (typeof accountTypes)[number];

export function CategoryForm({ item, initialType, locked, language, t, onClose, feedback }: Shared & {
  item?: Category; initialType: typeof categoryTypes[number]; locked: boolean; language: Language;
}) {
  const { busy, error, save } = useSave(t, onClose, feedback);
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof categoryInput>, unknown, z.output<typeof categoryInput>>({
    resolver: zodResolver(categoryInput),
    defaultValues: { name: item?.name ?? '', type: item?.type as typeof initialType ?? initialType,
      color: item?.color ?? '#4055de', icon: item?.icon ?? null },
  });
  return <Modal title={item ? t('edit') + ' ' + t('category').toLowerCase() : t('addCategory')} onClose={() => { if (!busy) onClose(); }} t={t}>
    <form onSubmit={handleSubmit(values => save('saveCategory', { ...values, id: item?.id }))} noValidate>
      <div className="form-grid">
        {item?.systemKey
          ? <Field label={t('name')}>{id => <input id={id} value={categoryName(item, language)} readOnly />}</Field>
          : <Field label={t('name')} error={errors.name && t('required')}>{(id, help) => <input id={id} aria-describedby={help} data-modal-focus maxLength={100} {...register('name')} />}</Field>}
        <Field label={t('type')}>{id => locked && item
          ? <input id={id} value={t(item.type as typeof initialType)} readOnly />
          : <select id={id} {...register('type')}>{categoryTypes.map(type => <option key={type} value={type}>{t(type)}</option>)}</select>}</Field>
        <Field label={t('icon')}>{id => <select id={id} {...register('icon', { setValueAs: value => value || null })}><IconOptions language={language} t={t} /></select>}</Field>
        <Field label={t('color')}>{id => <input id={id} type="color" {...register('color')} />}</Field>
      </div>
      <FormActions busy={busy} error={error} onClose={onClose} t={t} submitLabel={item ? t('update') : t('save')} />
    </form>
  </Modal>;
}

export function SetupForm({ t, onClose, feedback }: Shared) {
  const [cash, setCash] = useState(true);
  const [amount, setAmount] = useState('0');
  const { busy, error, save } = useSave(t, onClose, feedback);
  return <Modal title={t('firstSetup')} description={t('skipAccount')} onClose={() => { if (!busy) onClose(); }} t={t}>
    <form onSubmit={event => { event.preventDefault(); void save('setup', { cash, name: t('cashLabel'), amount: cash ? amount : '0' }); }}>
      <label className="checkbox-field"><input type="checkbox" checked={cash} onChange={event => setCash(event.target.checked)} /> {t('cashDefault')}</label>
      {cash && <Field label={t('openingBalance')}>{id => <input id={id} inputMode="numeric" maxLength={19} value={amount} onChange={event => setAmount(event.target.value)} />}</Field>}
      <FormActions busy={busy} error={error} onClose={onClose} t={t} submitLabel={t('finishSetup')} />
    </form>
  </Modal>;
}
