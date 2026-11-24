'use client';

import { useState, type ReactNode } from 'react';
import { mutate } from '@/app/actions';
import type { Operation } from '@/server/ledger';
import { Button, Modal } from './primitives';
import type { CopyKey, Translate } from './i18n';

export type Feedback = (key: CopyKey, kind?: 'success' | 'warning' | 'error') => void;

export function useSave(t: Translate, onDone: () => void, feedback: Feedback) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(operation: Operation, payload: unknown) {
    setError('');
    setBusy(true);
    try {
      const result = await mutate(operation, payload);
      if (result.error) {
        setError(t(result.error));
        return;
      }
      onDone();
      const warning = operation === 'deleteTransaction' ? 'deletedNegative' : 'savedNegative';
      feedback(result.warning ? warning : 'saveSuccess', result.warning ? 'warning' : 'success');
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  }
  return { error, busy, save };
}

export function FormActions({ busy, error, onClose, t, submitLabel, danger }: {
  busy: boolean; error?: string; onClose: () => void; t: Translate; submitLabel?: string; danger?: boolean;
}) {
  return <>
    {error && <p className="validation" role="alert">{error}</p>}
    <div className="modal-actions">
      <Button onClick={onClose} disabled={busy}>{t('cancel')}</Button>
      <Button kind={danger ? 'danger' : 'primary'} type="submit" disabled={busy}>{busy ? t('loading') : submitLabel ?? t('save')}</Button>
    </div>
  </>;
}

export type Confirmation = { operation: Operation; id: string; title: string; detail: string; danger?: boolean };

export function Confirm({ item, t, onClose, feedback }: { item: Confirmation; t: Translate; onClose: () => void; feedback: Feedback }) {
  const { busy, error, save } = useSave(t, onClose, feedback);
  return <Modal title={item.title} description={item.detail} onClose={() => { if (!busy) onClose(); }} t={t}>
    <form onSubmit={event => { event.preventDefault(); void save(item.operation, item.id); }}>
      <FormActions busy={busy} error={error} onClose={onClose} t={t} submitLabel={t('confirm')} danger={item.danger} />
    </form>
  </Modal>;
}

export function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`chip ${className}`}>{children}</span>;
}
