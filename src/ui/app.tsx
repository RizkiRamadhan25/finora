'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3, Check, CircleAlert, Globe2, LayoutDashboard, Menu, Moon, PanelLeftClose,
  PanelLeftOpen, Plus, ReceiptText, Settings2, ShieldCheck, Sun, Tags, Wallet, X,
} from 'lucide-react';
import { mutate } from '@/app/actions';
import type { Data, Transaction } from '@/domain/data';
import { accountBalances } from '@/domain/finance';
import { Dashboard } from './dashboard';
import { SetupForm } from './master-forms';
import { AccountsView, CategoriesView } from './master-views';
import { Button } from './primitives';
import { Reports } from './reports';
import { Settings, type ChangePreference } from './settings';
import { TransactionDialog, TransactionsView } from './transactions';
import { translator, type CopyKey } from './i18n';
import type { Feedback } from './form-utils';

const pages = {
  dashboard: LayoutDashboard, transactions: ReceiptText, accounts: Wallet, categories: Tags, reports: BarChart3, settings: Settings2,
};
type Page = keyof typeof pages;
export function isPage(value: unknown): value is Page {
  return typeof value === 'string' && Object.hasOwn(pages, value);
}

const pageUrl = (view: Page) => view === 'dashboard' ? '/' : `/?view=${view}`;

export function Finora({ data, today, initialView }: { data: Data; today: string; initialView: string }) {
  const [view, setView] = useState<Page>(isPage(initialView) ? initialView : 'dashboard');
  const [drawer, setDrawer] = useState(false);
  const [preference, setPreference] = useState<{ key: string; value: string }>();
  const [transaction, setTransaction] = useState<string | 'new'>();
  const [setup, setSetup] = useState(false);
  const [notice, setNotice] = useState<{ key: CopyKey; kind: 'success' | 'warning' | 'error' }>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const settings = Object.fromEntries(data.settings.map(setting => [setting.key, setting.value]));
  if (preference) settings[preference.key] = preference.value;
  const language = settings.language === 'en' ? 'en' : 'id';
  const theme = settings.theme === 'dark' ? 'dark' : 'light';
  const collapsed = settings.sidebarCollapsed === 'true';
  const t = translator(language);
  const totals = useMemo(() => accountBalances(data.accounts, data.transactions), [data.accounts, data.transactions]);
  const selected = data.transactions.find(item => item.id === transaction);
  const onTransaction = (item: Transaction) => setTransaction(item.id);

  function closeDrawer() {
    setDrawer(false);
    requestAnimationFrame(() => menuButton.current?.focus());
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
  }, [theme, language]);

  useEffect(() => {
    const update = () => {
      const value = new URL(window.location.href).searchParams.get('view');
      setView(isPage(value) ? value : 'dashboard');
      setDrawer(false);
    };
    window.addEventListener('popstate', update);
    return () => { window.removeEventListener('popstate', update); clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    if (!drawer) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') closeDrawer(); };
    closeButton.current?.focus();
    const desktop = window.matchMedia('(min-width: 731px)');
    const resetDrawer = () => { if (desktop.matches) setDrawer(false); };
    desktop.addEventListener('change', resetDrawer);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('keydown', close);
      desktop.removeEventListener('change', resetDrawer);
    };
  }, [drawer]);

  function navigate(next: Page) {
    setDrawer(false);
    if (drawer) requestAnimationFrame(() => document.querySelector<HTMLElement>('main h1')?.focus());
    if (next === view) return;
    setView(next);
    window.history.pushState(null, '', pageUrl(next));
    window.scrollTo(0, 0);
  }

  const feedback: Feedback = (key, kind = 'success') => {
    clearTimeout(timer.current);
    setNotice({ key, kind });
    timer.current = setTimeout(() => setNotice(undefined), kind === 'warning' ? 8000 : 4200);
  };

  const change: ChangePreference = async (key, value) => {
    if (preference || settings[key] === value) return;
    setPreference({ key, value });
    try {
      const result = await mutate('preference', { key, value });
      if (result.error) feedback(result.error, 'error');
    } catch {
      feedback('failed', 'error');
    } finally {
      setPreference(undefined);
    }
  };

  return <div className={`workspace ${collapsed ? 'rail' : ''}`}>
    {drawer && <div className="drawer-scrim" onClick={closeDrawer} aria-hidden="true" />}
    <aside id="main-sidebar" className={`sidebar ${drawer ? 'drawer-open' : ''}`}>
      <a className="brand" href="/" onClick={event => { if (!event.metaKey && !event.ctrlKey) { event.preventDefault(); navigate('dashboard'); } }} aria-label="Finora">
        <span className="brand-symbol" aria-hidden="true"><b>F</b><i /></span><span className="brand-word">Finora</span>
      </a>
      <Button ref={closeButton} className="drawer-close icon-button" kind="ghost" aria-label={t('close')} onClick={closeDrawer}><X size={20} /></Button>
      <nav className="nav" aria-label={t('navigation')}>
        {(Object.entries(pages) as [Page, typeof Wallet][]).map(([key, Icon]) => <a key={key} href={pageUrl(key)}
          aria-current={view === key ? 'page' : undefined} aria-label={t(key)} title={t(key)}
          onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(key); } }}>
          <Icon size={19} strokeWidth={1.8} /><span>{t(key)}</span>
        </a>)}
      </nav>
      <div className="sidebar-footer">
        <div className="local-status" title={t('local')}><ShieldCheck size={18} /><span>{t('local')}</span></div>
        <Button className="collapse-control" kind="ghost" aria-label={t(collapsed ? 'expand' : 'collapse')} title={t(collapsed ? 'expand' : 'collapse')}
          disabled={Boolean(preference)} onClick={() => void change('sidebarCollapsed', String(!collapsed))}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}<span>{t(collapsed ? 'expand' : 'collapse')}</span>
        </Button>
      </div>
    </aside>

    <div className="work-area" inert={drawer}>
      <header className="topbar">
        <div className="topbar-title"><Button ref={menuButton} kind="ghost" className="icon-button mobile-menu" aria-label={t('openMenu')} aria-expanded={drawer} aria-controls="main-sidebar" onClick={() => setDrawer(true)}><Menu size={22} /></Button>
          <span>{t('personal')}</span>
        </div>
        <div className="topbar-actions">
          <Button kind="ghost" className="language-button" aria-label={t('language') + ' · ' + (language === 'id' ? 'English' : 'Indonesia')} title={t('language')}
            disabled={Boolean(preference)} onClick={() => void change('language', language === 'id' ? 'en' : 'id')}><Globe2 size={17} /><span>{language.toUpperCase()}</span></Button>
          <Button kind="ghost" className="icon-button" aria-label={t(theme === 'light' ? 'dark' : 'light')} title={t(theme === 'light' ? 'dark' : 'light')}
            disabled={Boolean(preference)} onClick={() => void change('theme', theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}</Button>
        </div>
      </header>
      <main className="main-content">
        <div className="page-heading">
          <div><h1 tabIndex={-1}>{t(view)}</h1><p>{t(`${view}Description`)}</p></div>
          {(view === 'dashboard' || view === 'transactions') && <Button kind="primary" onClick={() => setTransaction('new')}><Plus size={19} />{t('addTransaction')}</Button>}
        </div>
        <div className="page-sections" key={view}>
          {view === 'dashboard' && <Dashboard data={data} today={today} t={t} language={language} balances={totals} setupPending={settings.setupComplete !== 'true' && !data.accounts.length}
            onSetup={() => setSetup(true)} onAccounts={() => navigate('accounts')} onTransactions={() => navigate('transactions')} onSelect={onTransaction} />}
          {view === 'transactions' && <TransactionsView data={data} t={t} language={language} onNew={() => setTransaction('new')} onSelect={onTransaction} />}
          {view === 'accounts' && <AccountsView data={data} t={t} language={language} feedback={feedback} balances={totals} today={today} onTransaction={setTransaction} />}
          {view === 'categories' && <CategoriesView data={data} t={t} language={language} feedback={feedback} />}
          {view === 'reports' && <Reports data={data} t={t} language={language} today={today} />}
          {view === 'settings' && <Settings t={t} language={language} theme={theme} collapsed={collapsed} pending={Boolean(preference)} change={change} feedback={feedback} />}
        </div>
      </main>
    </div>
    {setup && <SetupForm t={t} feedback={feedback} onClose={() => setSetup(false)} />}
    {(transaction === 'new' || selected) && <TransactionDialog key={transaction} item={selected} data={data} t={t} language={language} today={today}
      feedback={feedback} onClose={() => setTransaction(undefined)} onAccount={() => { setTransaction(undefined); navigate('accounts'); }} />}
    {notice && <div className={`toast ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
      {notice.kind === 'success' ? <Check size={18} /> : <CircleAlert size={18} />}<span>{t(notice.key)}</span>
      <Button kind="ghost" className="icon-button" onClick={() => setNotice(undefined)} aria-label={t('close')}><X size={17} /></Button>
    </div>}
  </div>;
}
