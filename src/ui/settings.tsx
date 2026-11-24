'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, HardDrive, Moon, Sun, Upload } from 'lucide-react';
import type { Language } from '@/domain/finance';
import { Button, Modal } from './primitives';
import { FormActions, type Feedback } from './form-utils';
import type { Translate } from './i18n';

export type ChangePreference = (key: 'theme' | 'language' | 'sidebarCollapsed', value: string) => Promise<void>;
type Preview = { file: File; accounts: number; categories: number; transactions: number };

export function Settings({ language, theme, collapsed, pending, change, t, feedback }: {
  language: Language; theme: string; collapsed: boolean; pending: boolean; change: ChangePreference; t: Translate; feedback: Feedback;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function readFile(file: File, replace: boolean) {
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/restore', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Finora-Restore': replace ? 'replace' : 'preview' }, body: file,
      });
      if (!response.ok) {
        setError(t(response.status === 422 ? 'invalidBackup' : 'failed'));
        return;
      }
      if (replace) {
        setPreview(null);
        router.refresh();
        feedback('restored');
      } else {
        const counts: Omit<Preview, 'file'> = await response.json();
        setPreview({ ...counts, file });
      }
    } catch {
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
  }

  return <div className="settings-stack">
    <section className="panel">
      <div className="panel-header"><h2>{t('appearance')}</h2></div>
      <div className="setting-row"><strong>{t('theme')}</strong>
        <div className="segmented">{(['light', 'dark'] as const).map(value => <button key={value} disabled={pending} aria-pressed={theme === value} onClick={() => void change('theme', value)}>
          {value === 'light' ? <Sun size={16} /> : <Moon size={16} />}{t(value)}</button>)}</div>
      </div>
      <div className="setting-row"><strong>{t('language')}</strong>
        <div className="segmented"><button disabled={pending} aria-pressed={language === 'id'} onClick={() => void change('language', 'id')}>Indonesia</button>
          <button disabled={pending} aria-pressed={language === 'en'} onClick={() => void change('language', 'en')}>English</button></div>
      </div>
      <div className="setting-row"><strong>{t('sidebar')}</strong>
        <Button disabled={pending} onClick={() => void change('sidebarCollapsed', String(!collapsed))}>{t(collapsed ? 'expand' : 'collapse')}</Button>
      </div>
    </section>
    <section className="panel">
      <div className="panel-header"><div><h2>{t('userData')}</h2><p>{t('local')}</p></div><HardDrive size={19} className="muted" /></div>
      <div className="setting-row"><p>{t('backupHint')}</p><a href="/api/backup" className="button button-secondary"><Download size={17} />{t('backup')}</a></div>
      <div className="setting-row"><p>{t('restoreHint')}</p><Button disabled={busy} onClick={() => input.current?.click()}><Upload size={17} />{busy && !preview ? t('loading') : t('restore')}</Button>
        <input ref={input} hidden type="file" accept="application/json,.json" onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void readFile(file, false);
        }} />
      </div>
      {error && !preview && <p role="alert" className="validation filter-error">{error}</p>}
    </section>
    <section className="panel setting-row"><strong>{t('version')}</strong><span className="muted">Finora 1.0.0</span></section>
    {preview && <Modal title={t('restore')} description={t('restoreConfirm')} t={t} onClose={() => { if (!busy) { setPreview(null); setError(''); } }}>
      <form onSubmit={event => { event.preventDefault(); void readFile(preview.file, true); }}>
        <dl className="transaction-detail">
          <div><dt>{t('accounts')}</dt><dd>{preview.accounts}</dd></div>
          <div><dt>{t('categories')}</dt><dd>{preview.categories}</dd></div>
          <div><dt>{t('transactions')}</dt><dd>{preview.transactions}</dd></div>
        </dl>
        <FormActions busy={busy} error={error} onClose={() => { setPreview(null); setError(''); }} submitLabel={t('restore')} danger t={t} />
      </form>
    </Modal>}
  </div>;
}
