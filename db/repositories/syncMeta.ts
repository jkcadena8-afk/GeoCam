import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { syncMeta } from '@/db/schema';

export const syncMetaRepo = {
  async get(key: string): Promise<string | null> {
    const row = await db.select().from(syncMeta).where(eq(syncMeta.key, key)).get();
    return row?.value ?? null;
  },

  set(key: string, value: string) {
    return db
      .insert(syncMeta)
      .values({ key, value })
      .onConflictDoUpdate({ target: syncMeta.key, set: { value } });
  },
};
