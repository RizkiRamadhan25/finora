import type { serializeData } from '../server/read';

export type Data = ReturnType<typeof serializeData>;
export type Account = Data['accounts'][number];
export type Category = Data['categories'][number];
export type Transaction = Data['transactions'][number];
