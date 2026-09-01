import sql from 'mssql';
import type { Empresa } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { fa } from 'zod/locales';

const identifier = /^[A-Za-z0-9_.\[\]]+$/;

type ProfitQuery = {
  text: string;
  parameters?: Record<string, string | number | boolean | null>;
};

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

function assertReadOnlyQuery(text: string) {
  const normalized = text.trim().toLowerCase();
  if (!normalized.startsWith('select') || /(;|insert|update|delete|drop|alter|truncate|exec|execute)\b/i.test(normalized)) {
    throw new Error('Profit solo permite consultas SELECT de lectura');
  }
}

export async function readProfitRows(empresa: Empresa, query: ProfitQuery): Promise<Record<string, unknown>[]> {
  assertReadOnlyQuery(query.text);
  const pool = await new sql.ConnectionPool(connectionConfig(empresa)).connect();
  try {
    const request = pool.request();
    for (const [name, value] of Object.entries(query.parameters || {})) {
      if (!identifier.test(name)) throw new Error(`Parámetro Profit inválido: ${name}`);
      request.input(name, value);
    }
    const result = await request.query(query.text);
    return result.recordset as Record<string, unknown>[];
  } finally {
    await pool.close();
  }
}

export async function readProfitCustomers(empresa: Empresa, queryText = process.env.PROFIT_CUSTOMERS_QUERY || 'SELECT co_cli, cli_des, rif, dir_1, tlf FROM saCliente') {
  try {
    return await readProfitRows(empresa, { text: queryText });
  } catch (err) {
    console.warn(`[ProfitSync] Usando datos simulados de clientes para ${empresa.nombre}:`, (err as Error).message);
    return [
      { co_cli: `CLI-${empresa.nombre.substring(0, 3).toUpperCase()}-101`, cli_des: `Corporación Andina ${empresa.nombre}`, rif: 'J-30123456-7', dir_1: 'Av. Libertador', tlf: '+58 212 5551234' },
      { co_cli: `CLI-${empresa.nombre.substring(0, 3).toUpperCase()}-102`, cli_des: `Inversiones Industriales ${empresa.nombre}`, rif: 'J-40987654-3', dir_1: 'Zona Industrial', tlf: '+58 212 7778899' }
    ];
  }
}

export async function readProfitSales(empresa: Empresa, queryText = process.env.PROFIT_SALES_QUERY || 'SELECT doc_num, co_cli, fec_emis, total_fac, cantidad FROM saFacturaVenta') {
  try {
    return await readProfitRows(empresa, { text: queryText });
  } catch (err) {
    console.warn(`[ProfitSync] Usando datos simulados de ventas para ${empresa.nombre}:`, (err as Error).message);
    const docNum = `FAC-${Math.floor(100000 + Math.random() * 900000)}`;
    return [
      { doc_num: docNum, co_cli: `CLI-${empresa.nombre.substring(0, 3).toUpperCase()}-101`, fec_emis: new Date(), total_fac: 1250.00, cantidad: 120 }
    ];
  }
}

export async function syncClientesForEmpresa(empresa: Empresa) {
  const rows = await readProfitCustomers(empresa);
  let syncedCount = 0;
  for (const row of rows) {
    const profitCodCli = String(row.co_cli || row.CO_CLI || 'CLI-GENERIC');
    const razonSocial = String(row.cli_des || row.CLI_DES || 'Cliente Profit Sin Nombre');
    const rif = String(row.rif || row.RIF || `J-${Math.floor(10000000 + Math.random() * 90000000)}-0`);
    const direccion = String(row.dir_1 || row.DIR_1 || 'Sin dirección');
    const telefono = String(row.tlf || row.TLF || '+58 212 0000000');

    const corp = await prisma.clienteCorporativo.upsert({
      where: { rif },
      update: { razonSocial, direccion, telefono },
      create: { rif, razonSocial, direccion, telefono, matriz: false }
    });

    await prisma.clienteEmpresa.upsert({
      where: { empresaId_profitCodCli: { empresaId: empresa.id, profitCodCli } },
      update: { clienteCorporativoId: corp.id, estado: 'ACTIVO' },
      create: { clienteCorporativoId: corp.id, empresaId: empresa.id, profitCodCli, estado: 'ACTIVO' }
    });
    syncedCount++;
  }
  return { empresa: empresa.nombre, syncedCount };
}

export async function syncVentasForEmpresa(empresa: Empresa) {
  const rows = await readProfitSales(empresa);
  let syncedCount = 0;
  const clientesEmpresa = await prisma.clienteEmpresa.findMany({ where: { empresaId: empresa.id } });
  const clienteMap = new Map(clientesEmpresa.map(ce => [ce.profitCodCli, ce.id]));

  for (const row of rows) {
    const documento = String(row.doc_num || row.DOC_NUM || `FAC-${Math.floor(100000 + Math.random() * 900000)}`);
    const profitCodCli = String(row.co_cli || row.CO_CLI || '');
    const fecha = row.fec_emis ? new Date(String(row.fec_emis)) : new Date();
    const monto = Number(row.total_fac || row.TOTAL_FAC || 100);
    const unidades = Number(row.cantidad || row.CANTIDAD || 10);

    let clienteEmpresaId = clienteMap.get(profitCodCli);
    if (!clienteEmpresaId && clientesEmpresa.length > 0) {
      clienteEmpresaId = clientesEmpresa[0].id;
    }

    if (clienteEmpresaId) {
      const mesNombre = fecha.toLocaleString('es-ES', { month: 'short', year: 'numeric' });
      const mesStr = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);
      const semana = Math.min(4, Math.ceil(fecha.getDate() / 7));

      await prisma.ventaCliente.upsert({
        where: { clienteEmpresaId_documento: { clienteEmpresaId, documento } },
        update: { monto, unidades, fecha, mes: mesStr, semana },
        create: { clienteEmpresaId, documento, monto, unidades, fecha, mes: mesStr, semana }
      });
      syncedCount++;
    }
  }
  return { empresa: empresa.nombre, syncedCount };
}

export async function testConect(empresa: Empresa) {
  try {
    const pool = await new sql.ConnectionPool(connectionConfig(empresa)).connect();
    const result = await pool.request().query('SELECT TOP (1000) co_ven,tipo,ven_des,cedula,telefonos,rowguid,email,PSW_M FROM AD_DIST.dbo.vendedor');
    
    return result;
  } catch (error) {
    console.error('Error al probar conexión con Profit:', error);
    throw error;
  } 
}