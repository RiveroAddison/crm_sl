import sql from 'mssql';
import type { Empresa } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type EmpresasSyncResult = {
  ok: boolean;
  created: number;
  updated: number;
  unchanged: number;
  errors: string[];
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

// ---------------------------------------------------------------------------
// Sincronización de empresas desde ad_grup
// ---------------------------------------------------------------------------

/**
 * Conecta a la BD central del grupo y crea/actualiza las empresas
 * en la base de datos local del CRM.
 *
 * @param grupoEmpresaId - ID de la empresa "GRUPO" que tiene las credenciales de conexión
 * @returns Estadísticas de la sincronización
 */
export async function syncEmpresasFromGrupo(grupoEmpresaId: string): Promise<EmpresasSyncResult> {
  const result: EmpresasSyncResult = { ok: false, created: 0, updated: 0, unchanged: 0, errors: [] };

  // 1. Obtener la empresa GRUPO con las credenciales
  const grupo = await prisma.empresa.findUnique({ where: { id: grupoEmpresaId } });
  if (!grupo) {
    result.errors.push('Empresa GRUPO no encontrada');
    return result;
  }
  if (!grupo.profitDbHost || !grupo.profitDbName || !grupo.profitDbUser || !grupo.profitDbPassword) {
    result.errors.push('La empresa GRUPO no tiene configurada su conexión Profit');
    return result;
  }

  // 2. Conectar a ad_grup y leer Tempresas
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(connectionConfig(grupo));
    const request = pool.request();
    const rs = await request.query('SELECT id_emp, nombre, riff FROM Tempresas');

    if (!rs.recordset || rs.recordset.length === 0) {
      result.ok = true;
      return result;
    }

    // 3. Para cada empresa del grupo, hacer upsert
    for (const row of rs.recordset) {
      try {
        const idEmp = String(row.id_emp).trim();
        const nombre = String(row.nombre || '').trim();
        const riff = row.riff ? String(row.riff).trim() : null;

        if (!idEmp || !nombre) {
          result.errors.push(`Fila incompleta: id_emp=${row.id_emp}, nombre=${row.nombre}`);
          continue;
        }

        // Buscar si ya existe una empresa con ese RIF
        const existing = riff
          ? await prisma.empresa.findFirst({ where: { rif: riff } })
          : null;

        if (existing) {
          // Actualizar si hay cambios
          const needsUpdate =
            existing.nombre !== nombre ||
            existing.profitDbName !== idEmp ||
            existing.profitDbHost !== grupo.profitDbHost ||
            existing.profitDbUser !== grupo.profitDbUser ||
            existing.profitDbPassword !== grupo.profitDbPassword;

          if (needsUpdate) {
            await prisma.empresa.update({
              where: { id: existing.id },
              data: {
                nombre,
                profitDbName: idEmp,
                profitDbHost: grupo.profitDbHost,
                profitDbUser: grupo.profitDbUser,
                profitDbPassword: grupo.profitDbPassword,
              },
            });
            result.updated++;
          } else {
            result.unchanged++;
          }
        } else {
          // Crear nueva empresa
          await prisma.empresa.create({
            data: {
              nombre,
              rif: riff,
              profitDbHost: grupo.profitDbHost,
              profitDbName: idEmp,
              profitDbUser: grupo.profitDbUser,
              profitDbPassword: grupo.profitDbPassword,
              activo: true,
            },
          });
          result.created++;
        }
      } catch (rowError) {
        const msg = rowError instanceof Error ? rowError.message : String(rowError);
        result.errors.push(`Error en fila id_emp=${row.id_emp}: ${msg}`);
      }
    }

    result.ok = result.errors.length === 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Error de conexión: ${msg}`);
  } finally {
    if (pool) {
      await pool.close();
    }
  }

  return result;
}
