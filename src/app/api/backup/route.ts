import { localDate } from '@/domain/finance';
import { readData, serializeData } from '@/server/read';
import { backupFormat } from '@/server/backup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = serializeData(await readData());
  return new Response(JSON.stringify({ ...backupFormat, createdAt: new Date().toISOString(), data }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="finora-${localDate()}.json"`, 'Cache-Control': 'no-store' },
  });
}
