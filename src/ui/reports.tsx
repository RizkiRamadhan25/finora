'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import type { Data } from '@/domain/data';
import { cashFlow, filterRange, formatDate, money, monthRange, previousRange, signedAmount, type Language } from '@/domain/finance';
import { Breakdown, CashFlowCards, PeriodControl, usePeriod } from './dashboard';
import type { Translate } from './i18n';

export function Reports({ data, today, language, t }: { data: Data; today: string; language: Language; t: Translate }) {
  const [accountId, setAccountId] = useState('');
  const period = usePeriod(today);
  const comparison = period.invalid ? null : period.preset === 'custom' ? previousRange(period.range) : monthRange(today, period.preset === 'previous' ? -2 : -1);
  const transactions = period.invalid ? [] : filterRange(data.transactions, period.range, accountId);
  const flow = cashFlow(transactions);
  const previous = cashFlow(comparison ? filterRange(data.transactions, comparison, accountId) : []);
  const accounts = data.accounts.filter(account => !accountId || account.id === accountId);
  const changes = new Map(accounts.map(account => [account.id, { delta: 0n, entries: 0, inbound: 0n, outbound: 0n }]));
  for (const transaction of transactions) {
    for (const id of [transaction.accountId, transaction.destinationAccountId]) {
      const item = id ? changes.get(id) : undefined;
      if (item && id) {
        const amount = signedAmount(transaction, id);
        item.delta += amount;
        item.entries += 1;
        if (transaction.type === 'TRANSFER') {
          if (amount > 0n) item.inbound += amount;
          else item.outbound -= amount;
        }
      }
    }
  }
  const url = '/api/export?' + new URLSearchParams({ ...period.range, accountId, language });
  return <>
    <div className="section-actions spread">
      <PeriodControl period={period} t={t} />
      <select aria-label={t('account')} value={accountId} onChange={event => setAccountId(event.target.value)}>
        <option value="">{t('account')} · {t('all')}</option>{data.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select>
      {!period.invalid && <a className="button button-secondary push" href={url}><Download size={17} />{t('export')}</a>}
    </div>
    {period.invalid ? <p role="alert" className="validation">{t('rangeInvalid')}</p> : <>
      <CashFlowCards flow={flow} language={language} t={t} />
      <div className="overview-grid">
        <section className="panel comparison-panel">
          <div className="panel-header"><div><h2>{t('previousPeriod')}</h2>
            {comparison && <p>{formatDate(comparison.from, language)} – {formatDate(comparison.to, language)}</p>}</div></div>
          <dl className="comparison-list">{(['income', 'expense', 'net'] as const).map(key => <div key={key}>
            <dt>{t(key)}</dt><dd>{money(previous[key], language)}</dd><dd className="muted" title={t('compare')}>{flow[key] >= previous[key] ? '+' : ''}{money(flow[key] - previous[key], language)}</dd>
          </div>)}</dl>
        </section>
        <Breakdown data={data} flow={flow} language={language} t={t} />
      </div>
      <section className="panel"><div className="panel-header"><h2>{t('reportAccounts')}</h2></div>
        <div className="table-scroll"><table className="transaction-table">
          <thead><tr><th scope="col">{t('account')}</th><th scope="col">{t('entries')}</th><th scope="col" className="align-end">{t('transferIn')}</th>
            <th scope="col" className="align-end">{t('transferOut')}</th><th scope="col" className="align-end">{t('reportBalanceChange')}</th></tr></thead>
          <tbody>{accounts.map(account => {
            const activity = changes.get(account.id);
            return <tr key={account.id}><td>{account.name}</td><td>{activity?.entries}</td>
              <td className="align-end amount">{money(activity?.inbound ?? 0n, language)}</td>
              <td className="align-end amount">{money(activity?.outbound ?? 0n, language)}</td>
              <td className="align-end amount">{money(activity?.delta ?? 0n, language)}</td></tr>;
          })}</tbody>
        </table></div>
        {!accounts.length && <p className="accounts-empty muted">{t('noAccounts')}</p>}
      </section>
    </>}
  </>;
}
