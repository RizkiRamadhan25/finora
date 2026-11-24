import { PrismaClient } from '@prisma/client';
import categories from '../src/domain/categories.json' with { type: 'json' };
import preferences from '../src/domain/preferences.json' with { type: 'json' };

export async function seed() {
  const db = new PrismaClient();
  try {
    await db.$transaction([
      ...categories.map(({ key, id, type, icon, color }) => db.category.upsert({
        where: { systemKey: key }, update: {},
        create: { systemKey: key, name: id, normalizedName: id.normalize('NFKC').toLowerCase(), type, icon, color },
      })),
      ...Object.entries(preferences).map(([key, value]) => db.appSetting.upsert({
        where: { key }, update: {}, create: { key, value },
      })),
    ]);
  } finally {
    await db.$disconnect();
  }
}
