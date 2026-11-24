'use client';

import { useState, type ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChartNoAxesCombined, CircleAlert, Plus, Wallet } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Data, Transaction } from '@/domain/data';
import { cashFlow, categoryName, filterRange, formatDate, money, monthRange, sixMonthTrend, type DateRange, type Language } from '@/domain/finance';
import { AccountBadge } from './master-views';
import { Button, Field } from './primitives';
import { TransactionTable } from './transaction-table';
import type { Translate } from './i18n';

type Common = { data: Data; language: Language; today: string; t: Translate };
type Flow = ReturnType<typeof cashFlow>;

export function usePeriod(today: string) {
  const [preset, setPreset] = useState('current');
  const [custom, setCustom] = useState(monthRange(today));
  const range = preset === 'custom' ? custom : monthRange(today, preset === 'previous' ? -1 : 0);
  return { preset, setPreset, custom, setCustom, range, invalid: !range.from || !range.to || range.from > range.to };
}

export function PeriodControl({ period, t }: { period: ReturnType<typeof usePeriod>; t: Translate }) {
  return <div className="period-control">
    <label className="period-select"><CalendarDays size={17} /><select aria-label={t('period')} value={period.preset} onChange={event => period.setPreset(event.target.value)}>
      <option value="current">{t('thisMonth')}</option><option value="previous">{t('lastMonth')}</option><option value="custom">{t('custom')}</option>
    </select></label>
    {period.preset === 'custom' && <>
      <Field label={t('from')}>{id => <input id={id} type="date" value={period.custom.from} onChange={event => period.setCustom({ ...period.custom, from: event.target.value })} />}</Field>
      <Field label={t('to')}>{id => <input id={id} type="date" value={period.custom.to} min={period.custom.from} onChange={event => period.setCustom({ ...period.custom, to: event.target.value })} />}</Field>
    </>}
  </div>;
}

function Kpi({ label, value, icon, tone, detail }: { label: string; value: string; icon: ReactNode; tone: string; detail?: ReactNode }) {
  return <article className={`panel kpi kpi-${tone}`}>
    <div className="kpi-top"><span className="kpi-icon">{icon}</span><span>{label}</span></div>
    <strong className="kpi-value">{value}</strong>
    {detail && <div className="kpi-detail">{detail}</div>}
  </article>;
}

export function CashFlowCards({ flow, language, t, total }: { flow: Flow; language: Language; t: Translate; total?: { balance: bigint; accounts: number } }) {
  return <div className={`kpi-grid ${total ? 'includes-balance' : ''}`}>
    {total && <Kpi label={t('totalBalance')} value={money(total.balance, language)} icon={<Wallet size={17} />} tone="balance" detail={`${total.accounts} ${t('activeAccounts')}`} />}
    <Kpi label={t('income')} value={money(flow.income, language)} icon={<ArrowDownLeft size={18} />} tone="income" />
    <Kpi label={t('expense')} value={money(flow.expense, language)} icon={<ArrowUpRight size={18} />} tone="expense" />
    <Kpi label={t('net')} value={money(flow.net, language)} icon={<ChartNoAxesCombined size={18} />} tone="net" />
  </div>;
}

export function Breakdown({ data, flow, language, t }: { data: Data; flow: Flow; language: Language; t: Translate }) {
  const categories = new Map(data.categories.map(item => [item.id, item]));
  const palette = ['#485de1', '#148f86', '#a158c4', '#d07a40', '#5b88bd', '#c64b79'];
  const segments = [...flow.categories].sort((left, right) => left[1] === right[1] ? 0 : left[1] > right[1] ? -1 : 1)
    .map(([id, total], index) => {
      const item = categories.get(id);
      return { id, name: item ? categoryName(item, language) : t('category'), total, fill: item?.color || palette[index % palette.length], value: Number(total) / 1_000_000 };
    });
  return <section className="panel breakdown-panel">
    <div className="panel-header"><div><h2>{t('breakdown')}</h2><p>{t('byCategory')}</p></div></div>
    <div className="donut" aria-hidden="true">
      {segments.length > 0 && <ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={segments} dataKey="value" innerRadius="73%" outerRadius="96%" stroke="none" paddingAngle={segments.length > 1 ? 3 : 0} isAnimationActive={false} /></PieChart>
      </ResponsiveContainer>}
      <div className="donut-center"><strong>{money(flow.expense, language)}</strong><span>{t('expense')}</span></div>
    </div>
    {segments.length
      ? <ul className="breakdown-list">{segments.map(item => <li key={item.id}><i style={{ background: item.fill }} /><span>{item.name}</span><strong>{money(item.total, language)}</strong></li>)}</ul>
      : <p className="breakdown-empty muted">{t('noExpense')}</p>}
  </section>;
}

function Trend({ transactions, today, language, t }: { transactions: Transaction[]; today: string; language: Language; t: Translate }) {
  const trend = sixMonthTrend(transactions, today).map(item => ({
    month: formatDate(item.month, language, { month: 'short' }),
    income: Number(item.income) / 1_000_000,
    expense: Number(item.expense) / 1_000_000,
    exactIncome: item.income, exactExpense: item.expense,
  }));
  const dataPresent = trend.some(item => item.income > 0 || item.expense > 0);
  const tickFormat = new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-GB', { notation: 'compact', maximumFractionDigits: 1 });
  return <section className="panel trend-panel">
    <div className="panel-header"><div><h2>{t('chart')}</h2><p>{t('lastSix')}</p></div>
      <div className="chart-key"><span><i className="income-dot" />{t('income')}</span><span><i className="expense-dot" />{t('expense')}</span></div>
    </div>
    <div className="chart-wrap" role="img" aria-label={t('chart') + ' · ' + t('lastSix')}>
      <ResponsiveContainer height="100%" width="100%" initialDimension={{ width: 480, height: 225 }}>
        <AreaChart data={trend} margin={{ top: 8, right: 15, bottom: 2, left: 5 }} accessibilityLayer>
          <defs>
            <linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-income)" stopOpacity={0.22} /><stop offset="100%" stopColor="var(--chart-income)" stopOpacity={0.01} /></linearGradient>
            <linearGradient id="expense-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-expense)" stopOpacity={0.18} /><stop offset="100%" stopColor="var(--chart-expense)" stopOpacity={0.01} /></linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={12} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <YAxis width={54} domain={dataPresent ? [0, 'auto'] : [0, 4]} allowDecimals tickCount={5} axisLine={false} tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={value => `Rp${tickFormat.format(value * 1_000_000)}`} />
          <Tooltip content={({ active, payload, label }) => {
            const point = payload?.[0]?.payload as typeof trend[number] | undefined;
            return active && point ? <div className="chart-tooltip"><strong>{label}</strong><span>{t('income')} · {money(point.exactIncome, language)}</span><span>{t('expense')} · {money(point.exactExpense, language)}</span></div> : null;
          }} />
          <Area type="monotone" dataKey="income" name={t('income')} fill="url(#income-fill)" stroke="var(--chart-income)" strokeWidth={2.5} isAnimationActive={false} />
          <Area type="monotone" dataKey="expense" name={t('expense')} fill="url(#expense-fill)" stroke="var(--chart-expense)" strokeWidth={2.5} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      {!dataPresent && <span className="trend-empty">{t('noTransactions')}</span>}
    </div>
  </section>;
}

export function Dashboard({ data, today, t, language, balances, setupPending, onSetup, onAccounts, onTransactions, onSelect }: Common & {
  balances: Map<string, bigint>; setupPending: boolean; onSetup: () => void; onAccounts: () => void;
  onTransactions: () => void; onSelect: (item: Transaction) => void;
}) {
  const period = usePeriod(today);
  const current = data.accounts.filter(item => !item.isArchived);
  const flow = cashFlow(period.invalid ? [] : filterRange(data.transactions, period.range));
  const balance = current.reduce((total, item) => total + (balances.get(item.id) ?? 0n), 0n);
  const rangeLabel = (range: DateRange) => `${formatDate(range.from, language, { day: 'numeric', month: 'short' })} – ${formatDate(range.to, language)}`;
  return <>
    <div className="overview-toolbar">
      <div className="period-date">{!period.invalid && rangeLabel(period.range)}</div>
      <PeriodControl period={period} t={t} />
    </div>
    {period.invalid && <p className="validation" role="alert">{t('rangeInvalid')}</p>}
    <CashFlowCards flow={flow} language={language} t={t} total={{ balance, accounts: current.length }} />
    {setupPending && <section className="setup-banner">
      <div className="setup-icon"><Wallet size={22} strokeWidth={1.8} /></div>
      <div><h2>{t('firstSetup')}</h2><p>{t('firstSetupHint')}</p></div>
      <Button className="push" onClick={onSetup}>{t('start')}<Plus size={16} /></Button>
    </section>}
    <div className="overview-grid">
      <Trend transactions={data.transactions} today={today} language={language} t={t} />
      <Breakdown data={data} flow={flow} language={language} t={t} />
      <section className="panel">
        <div className="panel-header"><h2>{t('recent')}</h2><Button kind="ghost" onClick={onTransactions}>{t('viewAll')}</Button></div>
        <TransactionTable items={data.transactions.slice(0, 5)} data={data} language={language} t={t} onSelect={onSelect} compact />
      </section>
      <section className="panel">
        <div className="panel-header"><h2>{t('myAccounts')}</h2><Button kind="ghost" onClick={onAccounts}>{t('manage')}</Button></div>
        {current.length === 0 ? <div className="accounts-empty muted">{t('noAccounts')}</div>
          : <ul className="dashboard-accounts">{current.map(account => <li key={account.id}>
            <AccountBadge account={account} /><span>{account.name}</span>
            {(balances.get(account.id) ?? 0n) < 0n && <span className="negative-icon" aria-label={t('negative')}><CircleAlert size={16} /></span>}
            <strong>{money(balances.get(account.id) ?? 0n, language)}</strong>
          </li>)}</ul>}
      </section>
    </div>
  </>;
}
