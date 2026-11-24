'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  const en = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  return <main className="page-message">
    <h1>Finora</h1>
    <p>{en ? 'Finora could not load. Try again.' : 'Finora gagal dimuat. Silakan coba lagi.'}</p>
    <button className="button button-primary" onClick={reset}>{en ? 'Try again' : 'Coba lagi'}</button>
  </main>;
}
