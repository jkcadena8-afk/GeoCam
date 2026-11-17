import { randomUUID } from 'expo-crypto';
import { and, desc, eq, gt, isNotNull, isNull, like, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { photos, type NewPhoto } from '@/db/schema';

export type PhotoInput = Omit<
  NewPhoto,
  'id' | 'createdAt' | 'clientId' | 'updatedAt' | 'remotePath' | 'syncedAt'
>;
export type PhotoPatch = Partial<Pick<NewPhoto, 'note' | 'favorite' | 'albumId'>>;
export type RemotePhotoInput = Omit<NewPhoto, 'id' | 'albumId'>;
export type RemotePhotoPatch = Pick<NewPhoto, 'note' | 'favorite' | 'updatedAt' | 'syncedAt'>;

export interface PhotoFilters {
  search: string;
  /** `null` = todos los albumes */
  albumId: number | null;
  onlyFavorites: boolean;
}

const isPending = or(isNull(photos.syncedAt), gt(photos.updatedAt, photos.syncedAt));

/** Unica capa que conoce Drizzle: las funciones ...Query() devuelven la consulta sin ejecutarla. */
export const photosRepo = {
  listQuery(filters?: PhotoFilters) {
    const conditions = [];
    if (filters) {
      const term = filters.search.trim();
      if (term) conditions.push(like(photos.note, `%${term}%`));
      if (filters.albumId !== null) conditions.push(eq(photos.albumId, filters.albumId));
      if (filters.onlyFavorites) conditions.push(eq(photos.favorite, true));
    }
    return db
      .select()
      .from(photos)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(photos.createdAt));
  },

  withLocationQuery() {
    return db
      .select()
      .from(photos)
      .where(and(isNotNull(photos.latitude), isNotNull(photos.longitude)))
      .orderBy(desc(photos.createdAt));
  },

  byIdQuery(id: number) {
    return db.select().from(photos).where(eq(photos.id, id));
  },

  pendingQuery() {
    return db.select().from(photos).where(isPending);
  },

  listPending() {
    return db.select().from(photos).where(isPending).all();
  },

  findById(id: number) {
    return db.select().from(photos).where(eq(photos.id, id)).get();
  },

  findByClientId(clientId: string) {
    return db.select().from(photos).where(eq(photos.clientId, clientId)).get();
  },

  listAll() {
    return db.select().from(photos).all();
  },

  create(data: PhotoInput) {
    return db.insert(photos).values({ ...data, clientId: randomUUID(), updatedAt: new Date() });
  },

  /** La usa la UI: toda edicion marca la foto como pendiente. */
  update(id: number, data: PhotoPatch) {
    return db
      .update(photos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(photos.id, id));
  },

  remove(id: number) {
    return db.delete(photos).where(eq(photos.id, id));
  },

  clearAll() {
    return db.delete(photos);
  },

  /** Rellena las fotos creadas antes de la migracion de sincronizacion. */
  async ensureSyncFields() {
    const rows = await db
      .select()
      .from(photos)
      .where(or(isNull(photos.clientId), isNull(photos.updatedAt)))
      .all();
    for (const row of rows) {
      await db
        .update(photos)
        .set({ clientId: row.clientId ?? randomUUID(), updatedAt: row.updatedAt ?? row.createdAt })
        .where(eq(photos.id, row.id));
    }
  },

  insertFromRemote(data: RemotePhotoInput) {
    return db.insert(photos).values(data);
  },

  // applyRemote y markSynced nunca usan la hora actual: guardan la version que vino o se subio
  applyRemote(id: number, data: RemotePhotoPatch) {
    return db.update(photos).set(data).where(eq(photos.id, id));
  },

  markSynced(id: number, remotePath: string, syncedAt: Date) {
    return db.update(photos).set({ remotePath, syncedAt }).where(eq(photos.id, id));
  },
};
