import { dateText, filterRange, localDate } from '@/domain/finance';
import { transactionCsv } from '@/server/csv';
import { readData, serializeData } from '@/server/read';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const account = params.get('accountId') ?? '';
  const language = params.get('language') === 'en' ? 'en' : 'id';
  if ((from && !dateText.safeParse(from).success) || (to && !dateText.safeParse(to).success) || (from && to && from > to)) {
    return new Response(null, { status: 400 });
  }
  const data = serializeData(await readData());
  return new Response(transactionCsv(data, filterRange(data.transactions, { from, to }, account), language), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="finora-transactions-${localDate()}.csv"`, 'Cache-Control': 'no-store' },
  });
}
