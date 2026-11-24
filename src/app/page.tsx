import { Finora } from '@/ui/app';
import { localDate } from '@/domain/finance';
import { readData, serializeData } from '@/server/read';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const [data, query] = await Promise.all([readData(), searchParams]);
  return <Finora data={serializeData(data)} today={localDate()} initialView={typeof query.view === 'string' ? query.view : 'dashboard'} />;
}
