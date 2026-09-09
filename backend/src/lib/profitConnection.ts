import sql from 'mssql';
import type { Empresa } from '@prisma/client';
import { decrypt } from './encryption.js';
import { logger } from './logger.js';

export function buildProfitConfig(empresa: Empresa): sql.config {
  if (!empresa.profitDbHost || !empresa.profitDbName || !empresa.profitDbUser || !empresa.profitDbPassword) {
    throw new Error(`La empresa ${empresa.nombre} no tiene configurada su conexión Profit`);
  }
  return {
    server: empresa.profitDbHost,
    database: empresa.profitDbName,
    user: empresa.profitDbUser,
    password: decrypt(empresa.profitDbPassword),
    options: {
      encrypt: process.env.PROFIT_ENCRYPT === 'true',
      trustServerCertificate: process.env.PROFIT_TRUST_CERT !== 'false',
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 15000,
  };
}

export async function connectWithRetry(
  config: sql.config,
  options?: { maxRetries?: number; delayMs?: number },
): Promise<sql.ConnectionPool> {
  const maxRetries = options?.maxRetries ?? 2;
  const delayMs = options?.delayMs ?? 2000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const pool = await new sql.ConnectionPool(config).connect();
      return pool;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        logger.warn(`[profitSync] Intento ${attempt + 1}/${maxRetries + 1} falló, reintentando en ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}
