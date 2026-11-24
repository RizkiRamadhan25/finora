'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { execute, LedgerError, type Operation } from '@/server/ledger';
import { getDb } from '@/server/db';
import type { CopyKey } from '@/ui/i18n';

export async function mutate(operation: Operation, payload: unknown): Promise<{ warning?: boolean; error?: CopyKey }> {
  try {
    const warning = await execute(getDb(), operation, payload);
    revalidatePath('/', 'layout');
    return { warning };
  } catch (error) {
    if (error instanceof LedgerError) return { error: error.message as CopyKey };
    if (error instanceof ZodError) return { error: 'invalid' };
    if (operation === 'saveCategory' && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { error: 'duplicateCategory' };
    console.error('Finora mutation failed:', error instanceof Error ? error.name : typeof error);
    return { error: 'failed' };
  }
}
