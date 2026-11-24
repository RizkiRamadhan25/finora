import { parseBackup, replaceData } from '@/server/backup';
import { getDb } from '@/server/db';
import { isLocalHost } from '@/server/local-request';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const host = request.headers.get('host') ?? '';
  if (!isLocalHost(host) || request.headers.get('origin') !== `http://${host}`) return new Response(null, { status: 403 });
  let backup;
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    backup = parseBackup(decoder.decode(await request.arrayBuffer()));
  } catch {
    return Response.json({ error: 'invalidBackup' }, { status: 422 });
  }

  if (request.headers.get('x-finora-restore') === 'replace') {
    try {
      await replaceData(getDb(), backup);
      revalidatePath('/', 'layout');
    } catch {
      return Response.json({ error: 'failed' }, { status: 500 });
    }
  }
  const { accounts, transactions, categories } = backup.data;
  return Response.json({ accounts: accounts.length, transactions: transactions.length, categories: categories.length });
}
