// filepath: src/services/cache.ts
// Cache read-only en IndexedDB (Dexie). Solo se usa para:
//   - hidratar la UI al arrancar (sin esperar al backend)
//   - servir como fallback si el backend no responde
// La escritura SIEMPRE va online via axios; el cache se actualiza tras cada GET exitoso.

import Dexie, { type Table } from 'dexie';

export interface CachedProspecto {
  id: string;
  data: unknown;
  updatedAt: number;
}
export interface CachedLead {
  id: string;
  data: unknown;
  updatedAt: number;
}
export interface CachedPedido {
  id: string;
  data: unknown;
  updatedAt: number;
}
export interface CachedVisita {
  id: string;
  data: unknown;
  updatedAt: number;
}
export interface CachedDashboard {
  id: 'current';
  data: unknown;
  updatedAt: number;
}

class CrmCache extends Dexie {
  prospectos!: Table<CachedProspecto, string>;
  leads!: Table<CachedLead, string>;
  pedidos!: Table<CachedPedido, string>;
  visitas!: Table<CachedVisita, string>;
  dashboard!: Table<CachedDashboard, string>;

  constructor() {
    super('CrmSanLuisCache');
    this.version(1).stores({
      prospectos: 'id, updatedAt',
      leads: 'id, updatedAt',
      pedidos: 'id, updatedAt',
      visitas: 'id, updatedAt',
      dashboard: 'id',
    });
  }
}

const db = new CrmCache();

async function replaceAll<T extends { id: string }>(table: Table<T, string>, items: T[]): Promise<void> {
  await table.clear();
  if (items.length > 0) await table.bulkPut(items);
}

export const cache = {
  prospectos: {
    async getAll(): Promise<unknown[]> {
      return (await db.prospectos.toArray()).map((r) => r.data);
    },
    async setAll(data: unknown[]): Promise<void> {
      const now = Date.now();
      const rows: CachedProspecto[] = (data as Array<{ id: string }>).map((p) => ({
        id: p.id,
        data: p,
        updatedAt: now,
      }));
      await replaceAll<CachedProspecto>(db.prospectos, rows);
    },
    async clear(): Promise<void> {
      await db.prospectos.clear();
    },
  },
  leads: {
    async getAll(): Promise<unknown[]> {
      return (await db.leads.toArray()).map((r) => r.data);
    },
    async setAll(data: unknown[]): Promise<void> {
      const now = Date.now();
      const rows: CachedLead[] = (data as Array<{ id: string }>).map((l) => ({
        id: l.id,
        data: l,
        updatedAt: now,
      }));
      await replaceAll<CachedLead>(db.leads, rows);
    },
    async clear(): Promise<void> {
      await db.leads.clear();
    },
  },
  pedidos: {
    async getAll(): Promise<unknown[]> {
      return (await db.pedidos.toArray()).map((r) => r.data);
    },
    async setAll(data: unknown[]): Promise<void> {
      const now = Date.now();
      const rows: CachedPedido[] = (data as Array<{ id: string }>).map((p) => ({
        id: p.id,
        data: p,
        updatedAt: now,
      }));
      await replaceAll<CachedPedido>(db.pedidos, rows);
    },
    async clear(): Promise<void> {
      await db.pedidos.clear();
    },
  },
  visitas: {
    async getAll(): Promise<unknown[]> {
      return (await db.visitas.toArray()).map((r) => r.data);
    },
    async setAll(data: unknown[]): Promise<void> {
      const now = Date.now();
      const rows: CachedVisita[] = (data as Array<{ id: string }>).map((v) => ({
        id: v.id,
        data: v,
        updatedAt: now,
      }));
      await replaceAll<CachedVisita>(db.visitas, rows);
    },
    async clear(): Promise<void> {
      await db.visitas.clear();
    },
  },
  dashboard: {
    async get(): Promise<unknown | undefined> {
      const row = await db.dashboard.get('current');
      return row?.data;
    },
    async set(data: unknown): Promise<void> {
      await db.dashboard.put({ id: 'current', data, updatedAt: Date.now() });
    },
    async clear(): Promise<void> {
      await db.dashboard.clear();
    },
  },
  async clearAll(): Promise<void> {
    await Promise.all([
      db.prospectos.clear(),
      db.leads.clear(),
      db.pedidos.clear(),
      db.visitas.clear(),
      db.dashboard.clear(),
    ]);
  },
};
