import sql from 'mssql';
import * as bcrypt from 'bcryptjs';
import type { Empresa } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * Servicio de sincronización con Profit Plus (MSSQL).
 *
 * Convenciones:
 *  - Idempotente: puede ejecutarse varias veces sin duplicar datos.
 *  - Defensivo: errores por fila se reportan sin abortar toda la sincronización.
 *  - Sin escritura destructiva: nunca elimina datos locales.
 *  - Aislamiento multi-tenant: toda operación Prisma filtra por empresaId
 *    cuando aplica.
 *  - Rango móvil de ventas: últimos 9 meses a partir del "ahora" del servidor
 *    donde corre el backend. Inicio inclusivo, fin exclusivo (mañana 00:00).
 */

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type SyncStats = {
  read: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  samples: { cod?: string; rif?: string; documento?: string; motivo: string }[];
};

export type SyncResult = {
  empresa: string;
  ok: boolean;
  stats?: SyncStats;
  error?: string;
};

export type ProfitDiagnostic = {
  ok: boolean;
  serverInfo?: { version: string | null; serverName: string | null };
  vendedorCount: number;
  clienteCount: number;
  ventaCount: number;
  ventaDateRange?: { min: string | null; max: string | null };
  error?: string;
};

// ---------------------------------------------------------------------------
// Helpers de conexión
// ---------------------------------------------------------------------------

function connectionConfig(empresa: Empresa): sql.config {
  if (!empresa.profitDbHost || !empresa.profitDbName || !empresa.profitDbUser || !empresa.profitDbPassword) {
    throw new Error(`La empresa ${empresa.nombre} no tiene configurada su conexión Profit`);
  }
  return {
    server: empresa.profitDbHost,
    database: empresa.profitDbName,
    user: empresa.profitDbUser,
    password: empresa.profitDbPassword,
    options: { encrypt: false, trustServerCertificate: true },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 15000
  };
}

function emptyStats(): SyncStats {
  return { read: 0, inserted: 0, updated: 0, skipped: 0, errors: 0, samples: [] };
}

function recordSample(stats: SyncStats, sample: SyncStats['samples'][number], maxSamples = 25) {
  if (stats.samples.length >= maxSamples) return;
  stats.samples.push(sample);
}

// Normaliza un valor recibido de MSSQL a string seguro (trim y manejo de nulls).
function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

// Calcula el rango móvil de fechas (últimos 9 meses) usado por la sync de ventas.
function computeSalesWindow(now: Date = new Date()): { fechaInicio: Date; fechaFin: Date } {
  const fechaFin = new Date(now);
  fechaFin.setHours(0, 0, 0, 0);
  fechaFin.setDate(fechaFin.getDate() + 1); // día siguiente, inicio exclusivo (mañana 00:00)

  const fechaInicio = new Date(fechaFin);
  fechaInicio.setMonth(fechaInicio.getMonth() - 9); // retrocede 9 meses

  return { fechaInicio, fechaFin };
}

// "mes" en formato YYYY-MM (string), estable para indexar y ordenar.
function formatMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Semana del mes (1-4) calculada desde la fecha:
//   días 1-7  -> semana 1
//   días 8-14 -> semana 2
//   días 15-21 -> semana 3
//   días 22-31 -> semana 4
// Documentado en PLAN-SINCRONIZACION-PROFIT.md (decisión #6).
function weekOfMonth(d: Date): number {
  const day = d.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

// Genera un correo estable para el vendedor a partir de su nombre.
function emailForSeller(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  const safe = base || 'vendedor';
  return `${safe}@sanluis.com.ve`;
}

// ---------------------------------------------------------------------------
// Diagnóstico (Fase 0) sin escritura
// ---------------------------------------------------------------------------

export async function testConect(empresa: Empresa): Promise<ProfitDiagnostic> {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await new sql.ConnectionPool(connectionConfig(empresa)).connect();

    const versionRes = await pool.request().query<{ version: string; serverName: string }>(`
      SELECT @@VERSION AS version, @@SERVERNAME AS serverName;
    `);
    const versionRow = versionRes.recordset?.[0];

    const vendorRes = await pool.request().query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM AD_DIST.DBO.CRM_VENDEDOR;
    `);
    const clienteRes = await pool.request().query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM AD_DIST.DBO.CRM_CLIENTE;
    `);
    const ventaRes = await pool.request().query<{ total: number; min: Date | null; max: Date | null }>(`
      SELECT COUNT(*) AS total,
             MIN(fecha) AS min,
             MAX(fecha) AS max
        FROM AD_DIST.DBO.CRM_VENTAS;
    `);

    const v = ventaRes.recordset?.[0];
    return {
      ok: true,
      serverInfo: {
        version: versionRow?.version ?? null,
        serverName: versionRow?.serverName ?? null
      },
      vendedorCount: vendorRes.recordset?.[0]?.total ?? 0,
      clienteCount: clienteRes.recordset?.[0]?.total ?? 0,
      ventaCount: v?.total ?? 0,
      ventaDateRange: {
        min: v?.min ? new Date(v.min).toISOString() : null,
        max: v?.max ? new Date(v.max).toISOString() : null
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[profitSync] Diagnostico fallido para ${empresa.nombre}:`, message);
    return { ok: false, vendedorCount: 0, clienteCount: 0, ventaCount: 0, error: message };
  } finally {
    try {
      await pool?.close();
    } catch {
      /* noop */
    }
  }
}

// ---------------------------------------------------------------------------
// Sincronización de vendedores (CRM_VENDEDOR)
// ---------------------------------------------------------------------------

type ProfitVendedorRow = {
  cod: string;
  nombre: string | null;
  correo: string | null;
};

export async function syncSellersForEmpresa(empresa: Empresa): Promise<SyncResult> {
  const stats = emptyStats();
  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await new sql.ConnectionPool(connectionConfig(empresa)).connect();
    const res = await pool
      .request()
      .query<ProfitVendedorRow>('SELECT cod, nombre, correo FROM AD_DIST.DBO.CRM_VENDEDOR;');
    const rows = res.recordset ?? [];
    stats.read = rows.length;

    for (const row of rows) {
      try {
        const codProfit = asString(row.cod);
        const nombre = asString(row.nombre);
        const correoRemoto = asString(row.correo);
        const correo = correoRemoto || emailForSeller(nombre || codProfit);

        if (!codProfit) {
          stats.skipped += 1;
          recordSample(stats, { cod: codProfit, motivo: 'cod Profit vacio' });
          continue;
        }
        if (!nombre) {
          stats.skipped += 1;
          recordSample(stats, { cod: codProfit, motivo: 'nombre vacio' });
          continue;
        }

        await prisma.$transaction(async (tx) => {
          // 1. Buscar UsuarioEmpresa existente por (empresaId, codProfit)
          const existing = await tx.usuarioEmpresa.findFirst({
            where: { empresaId: empresa.id, codProfit },
            include: { usuario: true }
          });

          if (existing) {
            await tx.usuario.update({
              where: { id: existing.usuarioId },
              data: { nombre, email: correo.toLowerCase(), activo: true }
            });
            stats.updated += 1;
            return;
          }

          // 2. No existe la asignacion: buscar Usuario por correo.
          let usuario = await tx.usuario.findUnique({ where: { email: correo.toLowerCase() } });

          if (!usuario) {
            // 3. Crear Usuario nuevo con contrasena bcrypt "1234".
            const passwordHash = await bcrypt.hash('1234', 10);
            usuario = await tx.usuario.create({
              data: { nombre, email: correo.toLowerCase(), password: passwordHash, activo: true }
            });
          } else {
            usuario = await tx.usuario.update({
              where: { id: usuario.id },
              data: { nombre, activo: true }
            });
          }

          // 4. Crear/actualizar UsuarioEmpresa con codProfit.
          await tx.usuarioEmpresa.upsert({
            where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId: empresa.id } },
            update: { codProfit, rol: 'VENDEDOR', activo: true },
            create: {
              usuarioId: usuario.id,
              empresaId: empresa.id,
              codProfit,
              rol: 'VENDEDOR',
              activo: true
            }
          });
          stats.inserted += 1;
        });
      } catch (rowErr) {
        stats.errors += 1;
        const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
        recordSample(stats, { cod: asString(row?.cod), motivo: msg });
        console.error(`[profitSync:${empresa.nombre}] vendedor ${row?.cod} fallo:`, msg);
      }
    }

    return { empresa: empresa.nombre, ok: true, stats };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[profitSync] syncSellers error para ${empresa.nombre}:`, message);
    return { empresa: empresa.nombre, ok: false, stats, error: message };
  } finally {
    try {
      await pool?.close();
    } catch {
      /* noop */
    }
  }
}

// ---------------------------------------------------------------------------
// Sincronización de clientes (CRM_CLIENTE)
// ---------------------------------------------------------------------------

type ProfitClienteRow = {
  cod: string;
  rif: string | null;
  razon_social: string | null;
  direccion: string | null;
  telefonos: string | null;
  vendedor: string | null;
  correo: string | null;
};

export async function syncClientesForEmpresa(empresa: Empresa): Promise<SyncResult> {
  const stats = emptyStats();
  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await new sql.ConnectionPool(connectionConfig(empresa)).connect();
    const res = await pool
      .request()
      .query<ProfitClienteRow>(
        'SELECT cod, rif, razon_social, direccion, telefonos, vendedor, correo FROM AD_DIST.DBO.CRM_CLIENTE;'
      );
    const rows = res.recordset ?? [];
    stats.read = rows.length;

    // Cache vendedor (Profit.cod -> UsuarioEmpresa.usuarioId) para evitar N+1.
    const vendedorMap = new Map<string, string>();
    const vendedores = await prisma.usuarioEmpresa.findMany({
      where: { empresaId: empresa.id, codProfit: { not: null } },
      select: { codProfit: true, usuarioId: true }
    });
    for (const v of vendedores) {
      if (v.codProfit) vendedorMap.set(v.codProfit, v.usuarioId);
    }

    for (const row of rows) {
      try {
        const cod = asString(row.cod);
        const rif = asString(row.rif);
        const razonSocial = asString(row.razon_social);
        const direccion = asString(row.direccion) || null;
        const telefono = asString(row.telefonos) || null;
        const vendedorCod = asString(row.vendedor);
        const vendedorId = vendedorCod ? vendedorMap.get(vendedorCod) ?? null : null;

        if (!cod) {
          stats.skipped += 1;
          recordSample(stats, { cod, motivo: 'cod cliente vacio' });
          continue;
        }
        if (!rif) {
          stats.skipped += 1;
          recordSample(stats, { cod, motivo: 'rif vacio' });
          continue;
        }
        if (!razonSocial) {
          stats.skipped += 1;
          recordSample(stats, { cod, motivo: 'razon_social vacia' });
          continue;
        }

        await prisma.$transaction(async (tx) => {
          // 1. Upsert ClienteCorporativo por rif.
          const corporativo = await tx.clienteCorporativo.upsert({
            where: { rif },
            update: {
              razonSocial,
              ...(direccion !== null ? { direccion } : {}),
              ...(telefono !== null ? { telefono } : {})
            },
            create: { rif, razonSocial, direccion, telefono }
          });

          // 2. Upsert ClienteEmpresa por (empresaId, profitCodCli).
          const vendedorNombre = vendedorCod || null;
          const exists = await tx.clienteEmpresa.findUnique({
            where: { empresaId_profitCodCli: { empresaId: empresa.id, profitCodCli: cod } }
          });

          if (exists) {
            await tx.clienteEmpresa.update({
              where: { id: exists.id },
              data: {
                clienteCorporativoId: corporativo.id,
                vendedor: vendedorNombre,
                vendedorId,
                estado: 'ACTIVO'
              }
            });
            stats.updated += 1;
          } else {
            await tx.clienteEmpresa.create({
              data: {
                clienteCorporativoId: corporativo.id,
                empresaId: empresa.id,
                profitCodCli: cod,
                vendedor: vendedorNombre,
                vendedorId,
                estado: 'ACTIVO'
              }
            });
            stats.inserted += 1;
          }
        });
      } catch (rowErr) {
        stats.errors += 1;
        const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
        recordSample(stats, { cod: asString(row?.cod), rif: asString(row?.rif), motivo: msg });
        console.error(`[profitSync:${empresa.nombre}] cliente ${row?.cod} fallo:`, msg);
      }
    }

    return { empresa: empresa.nombre, ok: true, stats };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[profitSync] syncClientes error para ${empresa.nombre}:`, message);
    return { empresa: empresa.nombre, ok: false, stats, error: message };
  } finally {
    try {
      await pool?.close();
    } catch {
      /* noop */
    }
  }
}

// ---------------------------------------------------------------------------
// Sincronización de ventas (CRM_VENTAS, últimos 9 meses móviles)
// ---------------------------------------------------------------------------

type ProfitVentaRow = {
  SemanaDelMes: number | null;
  fecha: Date | string;
  num_nde: string | null;
  unidades_vendidas: number | null;
  precio_unidad: number | null;
  monto_neto: number | string | null;
  cod_Cliente: string | null;
  cod_vendedor: string | null;
};

export async function syncVentasForEmpresa(empresa: Empresa): Promise<SyncResult> {
  const stats = emptyStats();
  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await new sql.ConnectionPool(connectionConfig(empresa)).connect();
    const { fechaInicio, fechaFin } = computeSalesWindow();

    const req = pool.request();
    req.input('fechaInicio', sql.DateTime, fechaInicio);
    req.input('fechaFin', sql.DateTime, fechaFin);

    const res = await req.query<ProfitVentaRow>(`
      SELECT SemanaDelMes,
             fecha,
             num_nde,
             unidades_vendidas,
             precio_unidad,
             monto_neto,
             cod_Cliente,
             cod_vendedor
        FROM AD_DIST.DBO.CRM_VENTAS
       WHERE fecha >= @fechaInicio
         AND fecha <  @fechaFin;
    `);
    const rows = res.recordset ?? [];
    stats.read = rows.length;

    // Pre-cargar mapa (empresaId, profitCodCli) -> clienteEmpresaId para evitar N+1.
    const profitCodSet = new Set<string>();
    for (const r of rows) {
      const c = asString(r.cod_Cliente);
      if (c) profitCodSet.add(c);
    }
    const profitCodList = Array.from(profitCodSet);

    const clientesLocales = profitCodList.length
      ? await prisma.clienteEmpresa.findMany({
          where: { empresaId: empresa.id, profitCodCli: { in: profitCodList } },
          select: { id: true, profitCodCli: true, vendedorId: true }
        })
      : [];
    const clientePorCod = new Map<string, { id: string; vendedorId: string | null }>();
    for (const c of clientesLocales) {
      clientePorCod.set(c.profitCodCli, { id: c.id, vendedorId: c.vendedorId });
    }

    // Agrupar por (clienteEmpresaId, documento) si hay múltiples líneas por factura.
    type Aggregated = {
      clienteEmpresaId: string;
      documento: string;
      fecha: Date;
      unidades: number;
      monto: number;
    };
    const agregados = new Map<string, Aggregated>();

    for (const row of rows) {
      try {
        const codCliente = asString(row.cod_Cliente);
        const numNde = asString(row.num_nde);
        const fechaRaw = row.fecha;
        const fecha = fechaRaw instanceof Date ? fechaRaw : new Date(fechaRaw);

        if (!codCliente || !numNde) {
          stats.skipped += 1;
          recordSample(stats, { documento: numNde, motivo: 'cliente o documento vacio' });
          continue;
        }
        if (!fecha || Number.isNaN(fecha.getTime())) {
          stats.skipped += 1;
          recordSample(stats, { documento: numNde, motivo: 'fecha invalida' });
          continue;
        }

        const unidades = Number(row.unidades_vendidas ?? 0);
        const monto = Number(row.monto_neto ?? 0);
        if (!Number.isFinite(unidades) || unidades <= 0) {
          stats.skipped += 1;
          recordSample(stats, { documento: numNde, motivo: 'unidades invalidas' });
          continue;
        }
        if (!Number.isFinite(monto)) {
          stats.skipped += 1;
          recordSample(stats, { documento: numNde, motivo: 'monto invalido' });
          continue;
        }

        const clienteLocal = clientePorCod.get(codCliente);
        if (!clienteLocal) {
          stats.skipped += 1;
          recordSample(stats, { documento: numNde, motivo: `cliente Profit ${codCliente} no resuelto localmente` });
          continue;
        }

        // Regla #5 del plan: cada fila puede ser una línea. Como el modelo local
        // tiene @@unique([clienteEmpresaId, documento]), agrupamos múltiples
        // líneas en una sola factura sumando unidades y monto.
        const key = `${clienteLocal.id}::${numNde}`;
        const prev = agregados.get(key);
        if (prev) {
          prev.unidades += unidades;
          prev.monto += monto;
          if (fecha < prev.fecha) prev.fecha = fecha;
        } else {
          agregados.set(key, {
            clienteEmpresaId: clienteLocal.id,
            documento: numNde,
            fecha,
            unidades,
            monto
          });
        }
      } catch (rowErr) {
        stats.errors += 1;
        const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
        recordSample(stats, { documento: asString(row?.num_nde), motivo: msg });
        console.error(`[profitSync:${empresa.nombre}] venta ${row?.num_nde} fallo:`, msg);
      }
    }

    // Insertar/actualizar VentaCliente. Upsert por (clienteEmpresaId, documento).
    for (const a of agregados.values()) {
      try {
        const mes = formatMonth(a.fecha);
        const semana = weekOfMonth(a.fecha);

        const exists = await prisma.ventaCliente.findUnique({
          where: { clienteEmpresaId_documento: { clienteEmpresaId: a.clienteEmpresaId, documento: a.documento } }
        });

        if (exists) {
          await prisma.ventaCliente.update({
            where: { id: exists.id },
            data: { fecha: a.fecha, unidades: a.unidades, monto: a.monto, mes, semana }
          });
          stats.updated += 1;
        } else {
          await prisma.ventaCliente.create({
            data: {
              clienteEmpresaId: a.clienteEmpresaId,
              documento: a.documento,
              fecha: a.fecha,
              unidades: a.unidades,
              monto: a.monto,
              mes,
              semana
            }
          });
          stats.inserted += 1;
        }
      } catch (rowErr) {
        stats.errors += 1;
        const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
        recordSample(stats, { documento: a.documento, motivo: msg });
        console.error(`[profitSync:${empresa.nombre}] upsert venta ${a.documento} fallo:`, msg);
      }
    }

    return { empresa: empresa.nombre, ok: true, stats };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[profitSync] syncVentas error para ${empresa.nombre}:`, message);
    return { empresa: empresa.nombre, ok: false, stats, error: message };
  } finally {
    try {
      await pool?.close();
    } catch {
      /* noop */
    }
  }
}

// ---------------------------------------------------------------------------
// Sincronización completa de una empresa (orden: vendedores → clientes → ventas)
// ---------------------------------------------------------------------------

export async function syncAllForEmpresa(empresa: Empresa): Promise<{
  empresa: string;
  ok: boolean;
  sellers: SyncResult;
  clientes: SyncResult;
  ventas: SyncResult;
  error?: string;
}> {
  try {
    const sellers = await syncSellersForEmpresa(empresa);
    const clientes = await syncClientesForEmpresa(empresa);
    const ventas = await syncVentasForEmpresa(empresa);
    const ok = sellers.ok && clientes.ok && ventas.ok;
    return { empresa: empresa.nombre, ok, sellers, clientes, ventas };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      empresa: empresa.nombre,
      ok: false,
      sellers: { empresa: empresa.nombre, ok: false },
      clientes: { empresa: empresa.nombre, ok: false },
      ventas: { empresa: empresa.nombre, ok: false },
      error: message
    };
  }
}
