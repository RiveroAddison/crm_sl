/**
 * Smoke test end-to-end del flujo de sincronización Profit Plus.
 *
 * Como no siempre hay MSSQL real disponible en CI/local, este test mockea
 * el módulo `mssql` con filas sintéticas con la forma de
 * AD_DIST.DBO.CRM_VENDEDOR / CRM_CLIENTE / CRM_VENTAS.
 *
 * Valida:
 *   1. Conexión mockeada y diagnóstico sin escritura.
 *   2. Sincronización idempotente (segunda corrida = 0 inserts).
 *   3. Reglas de validación (RIF vacío, cod vacío, unidades inválidas).
 *   4. Asociación vendedor -> cliente -> venta end-to-end.
 *   5. Rango móvil de 9 meses (fechas dentro/fuera del rango).
 *
 * Ejecutar:  node scripts/test-profit-sync.mjs
 */

import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function daysAgo(d) {
  const dt = new Date();
  dt.setHours(12, 0, 0, 0);
  dt.setDate(dt.getDate() - d);
  return dt;
}
function nowSameDay() {
  const dt = new Date();
  dt.setHours(8, 30, 0, 0);
  return dt;
}

const profitData = {
  CRM_VENDEDOR: [
    { cod: 'V001', nombre: 'Juan Rodriguez', correo: '' },
    { cod: 'V002', nombre: 'Ana Martinez', correo: 'ana.martinez@sanluis.com.ve' },
    { cod: 'V003', nombre: 'Luis Perez', correo: '' },
    { cod: 'V099', nombre: 'Vendedor Norte', correo: '' },
  ],
  CRM_CLIENTE: [
    { cod: 'C001', rif: 'J-12345678-9', razon_social: 'Distribuidora Norte C.A.', direccion: 'Av. 5, Maracaibo', telefonos: '+58 261-1112233', vendedor: 'V001', correo: 'contacto@distnorte.com' },
    { cod: 'C002', rif: 'J-87654321-0', razon_social: 'Transportes del Sur S.A.', direccion: 'Calle 10, Caracas', telefonos: '+58 212-4445566', vendedor: 'V002', correo: '' },
    { cod: 'C003', rif: 'G-20000000-1', razon_social: 'Gobierno Regional Zulia', direccion: 'Palacio de Gobierno', telefonos: '+58 261-7778899', vendedor: 'V003', correo: '' },
    { cod: 'C004', rif: '', razon_social: 'Cliente sin RIF', direccion: 'X', telefonos: 'X', vendedor: 'V001', correo: '' }, // omitido por RIF vacío
    { cod: '', rif: 'J-99999999-9', razon_social: 'Sin Codigo', direccion: 'X', telefonos: 'X', vendedor: 'V001', correo: '' }, // omitido por cod vacío
    { cod: 'C005', rif: 'V-11111111-1', razon_social: 'Persona Natural Cliente', direccion: 'Av. Bella Vista', telefonos: '+58 261-2223344', vendedor: 'V001', correo: '' },
  ],
  CRM_VENTAS: [
    { SemanaDelMes: 1, fecha: daysAgo(2), num_nde: 'F-00001', unidades_vendidas: 100, precio_unidad: 1.5, monto_neto: 150, cod_Cliente: 'C001', cod_vendedor: 'V001' },
    { SemanaDelMes: 2, fecha: daysAgo(30), num_nde: 'F-00002', unidades_vendidas: 50, precio_unidad: 2.0, monto_neto: 100, cod_Cliente: 'C002', cod_vendedor: 'V002' },
    { SemanaDelMes: 1, fecha: daysAgo(2), num_nde: 'F-00001', unidades_vendidas: 20, precio_unidad: 1.5, monto_neto: 30, cod_Cliente: 'C001', cod_vendedor: 'V001' },
    { SemanaDelMes: 4, fecha: nowSameDay(), num_nde: 'F-00003', unidades_vendidas: 10, precio_unidad: 3.0, monto_neto: 30, cod_Cliente: 'C003', cod_vendedor: 'V003' },
    { SemanaDelMes: 1, fecha: daysAgo(365), num_nde: 'F-OLD-01', unidades_vendidas: 100, precio_unidad: 1.0, monto_neto: 100, cod_Cliente: 'C001', cod_vendedor: 'V001' },
    { SemanaDelMes: 1, fecha: daysAgo(5), num_nde: 'F-00999', unidades_vendidas: 5, precio_unidad: 1.0, monto_neto: 5, cod_Cliente: 'CXXX', cod_vendedor: 'V001' },
    { SemanaDelMes: 1, fecha: daysAgo(5), num_nde: 'F-00010', unidades_vendidas: 0, precio_unidad: 1.0, monto_neto: 0, cod_Cliente: 'C001', cod_vendedor: 'V001' },
  ],
};

// ---------------------------------------------------------------------------
// Mock del módulo mssql + loader ESM que lo reescribe
// ---------------------------------------------------------------------------
// Estrategia: registramos un loader que apunta cualquier import a 'mssql'
// hacia un shim auto-contenido. El shim expone `globalThis.__PROFIT_TEST__`
// para acceder a los datos de prueba sin necesidad de serializar el closure.

const shimDir = path.join(__dirname, '..', '.mssql-shim');
fs.mkdirSync(shimDir, { recursive: true });

// Shim auto-contenido (sin imports relativos; lee datos desde globalThis).
const shimPath = path.join(shimDir, 'mssql.mjs');
fs.writeFileSync(
  shimPath,
  `
function getData() {
  const g = globalThis.__PROFIT_TEST__;
  if (!g) throw new Error('mock mssql: globalThis.__PROFIT_TEST__ not initialized');
  return g.profitData;
}

function makeRequest() {
  const params = {};
  const req = {
    input(name, _type, value) { params[name] = value; return this; },
    async query(sqlText) {
      const data = getData();
      const upper = (sqlText || '').trim().toUpperCase();
      if (upper.startsWith('SELECT @@VERSION')) {
        return { recordset: [{ version: 'Microsoft SQL Server (mock)', serverName: 'MOCK' }] };
      }
      if (upper.includes('CRM_VENDEDOR') && upper.startsWith('SELECT COUNT')) {
        return { recordset: [{ total: data.CRM_VENDEDOR.length }] };
      }
      if (upper.includes('CRM_CLIENTE') && upper.startsWith('SELECT COUNT')) {
        return { recordset: [{ total: data.CRM_CLIENTE.length }] };
      }
      if (upper.includes('CRM_VENTAS') && upper.startsWith('SELECT COUNT')) {
        return {
          recordset: [{
            total: data.CRM_VENTAS.length,
            min: data.CRM_VENTAS.reduce((a, b) => (a.fecha < b.fecha ? a : b)).fecha,
            max: data.CRM_VENTAS.reduce((a, b) => (a.fecha > b.fecha ? a : b)).fecha,
          }],
        };
      }
      if (upper.includes('FROM AD_DIST.DBO.CRM_VENDEDOR')) {
        return { recordset: data.CRM_VENDEDOR };
      }
      if (upper.includes('FROM AD_DIST.DBO.CRM_CLIENTE')) {
        return { recordset: data.CRM_CLIENTE };
      }
      if (upper.includes('FROM AD_DIST.DBO.CRM_VENTAS')) {
        const fechaInicio = params.fechaInicio;
        const fechaFin = params.fechaFin;
        const filtered = data.CRM_VENTAS.filter((r) => {
          const f = r.fecha instanceof Date ? r.fecha : new Date(r.fecha);
          return f >= fechaInicio && f < fechaFin;
        });
        return { recordset: filtered };
      }
      return { recordset: [] };
    },
  };
  return req;
}

function makePool() {
  return {
    request() { return makeRequest(); },
    async close() { /* noop */ },
  };
}

export class ConnectionPool {
  constructor(_config) { this._config = _config; }
  async connect() { return makePool(); }
}

export const DateTime = function () {};
DateTime.from = () => null;

export default { ConnectionPool, DateTime };
`
);

const loaderPath = path.join(shimDir, 'mssql-loader.mjs');
fs.writeFileSync(
  loaderPath,
  `import { fileURLToPath, pathToFileURL } from 'node:url';
   import path from 'node:path';
   const SHIM_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'mssql.mjs');
   const SHIM_URL = pathToFileURL(SHIM_PATH).href;
   export async function resolve(specifier, context, nextResolve) {
     if (specifier === 'mssql') {
       return { url: SHIM_URL, shortCircuit: true, format: 'module' };
     }
     return nextResolve(specifier, context);
   }`
);

// Inicializamos el contexto global antes de registrar el loader.
globalThis.__PROFIT_TEST__ = { profitData };

register(pathToFileURL(loaderPath).href);

// ---------------------------------------------------------------------------
// Pruebas
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

async function snapshot(label) {
  const counts = {
    usuarios: await prisma.usuario.count(),
    usuarioEmpresas: await prisma.usuarioEmpresa.count(),
    clienteCorporativo: await prisma.clienteCorporativo.count(),
    clienteEmpresa: await prisma.clienteEmpresa.count(),
    ventaCliente: await prisma.ventaCliente.count(),
  };
  console.log(`\n[${label}]`, JSON.stringify(counts, null, 2));
  return counts;
}

async function findSanLuis() {
  // SQLite no soporta `mode: insensitive`, usamos contains plano (las empresas seed son "San Luis ...").
  const empresa = await prisma.empresa.findFirst({
    where: { nombre: { contains: 'San Luis' } },
  });
  if (!empresa) throw new Error('No se encontró empresa San Luis en la BD');
  return empresa;
}

async function run() {
  const empresa = await findSanLuis();
  console.log('Empresa bajo prueba:', empresa.nombre, '(', empresa.id, ')');

  // Limpieza: borramos clientes, ventas y usuarioEmpresa+vendedores creados por sync previa.
  await prisma.$transaction([
    prisma.ventaCliente.deleteMany({ where: { clienteEmpresa: { empresaId: empresa.id } } }),
    prisma.clienteEmpresa.deleteMany({ where: { empresaId: empresa.id } }),
    prisma.clienteCorporativo.deleteMany({
      where: { clientesEmpresa: { every: { empresaId: empresa.id } } },
    }),
    prisma.usuarioEmpresa.deleteMany({
      where: { empresaId: empresa.id, codProfit: { not: null } },
    }),
    prisma.usuario.deleteMany({
      where: {
        AND: [
          { usuarioEmpresas: { some: { codProfit: { not: null }, empresaId: empresa.id } } },
          { usuarioEmpresas: { every: { codProfit: { not: null } } } },
        ],
      },
    }),
  ]);

  await snapshot('DESPUES DE LIMPIEZA');

  // Importamos el servicio ya compilado (dist/) — necesario haber corrido npm run build.
  const service = await import(
    pathToFileURL(path.join(__dirname, '..', 'dist', 'services', 'profitSync.service.js')).href
  );

  console.log('\n--- TEST: testConect ---');
  const diag = await service.testConect(empresa);
  console.log('Diagnostico:', diag);
  if (!diag.ok) throw new Error('Diagnostico fallo');

  console.log('\n--- TEST: syncSellers (corrida 1) ---');
  const s1 = await service.syncSellersForEmpresa(empresa);
  console.log('Sellers 1:', JSON.stringify(s1, null, 2));

  console.log('\n--- TEST: syncSellers (corrida 2 - idempotencia) ---');
  const s2 = await service.syncSellersForEmpresa(empresa);
  console.log('Sellers 2:', JSON.stringify(s2, null, 2));
  if ((s2.stats?.inserted ?? 0) !== 0) throw new Error('Idempotencia vendedores rota');

  console.log('\n--- TEST: syncClientes ---');
  const c1 = await service.syncClientesForEmpresa(empresa);
  console.log('Clientes 1:', JSON.stringify(c1, null, 2));

  console.log('\n--- TEST: syncClientes (corrida 2 - idempotencia) ---');
  const c2 = await service.syncClientesForEmpresa(empresa);
  console.log('Clientes 2:', JSON.stringify(c2, null, 2));
  if ((c2.stats?.inserted ?? 0) !== 0) throw new Error('Idempotencia clientes rota');

  console.log('\n--- TEST: syncVentas ---');
  const v1 = await service.syncVentasForEmpresa(empresa);
  console.log('Ventas 1:', JSON.stringify(v1, null, 2));

  console.log('\n--- TEST: syncVentas (corrida 2 - idempotencia) ---');
  const v2 = await service.syncVentasForEmpresa(empresa);
  console.log('Ventas 2:', JSON.stringify(v2, null, 2));
  if ((v2.stats?.inserted ?? 0) !== 0) throw new Error('Idempotencia ventas rota');

  const finalCounts = await snapshot('DESPUES DE SYNC');

  console.log('\n--- VALIDACIONES ---');
  const checks = [
    ['vendedores insertados (inserted == 4)', s1.stats?.inserted === 4],
    ['clientes validos insertados (inserted == 4)', c1.stats?.inserted === 4],
    ['clientes omitidos (skipped == 2)', c1.stats?.skipped === 2],
    ['facturas unicas insertadas (inserted == 3)', v1.stats?.inserted === 3],
    ['ventas omitidas: 2 (sin cliente + unidades 0)', v1.stats?.skipped === 2],
    ['clienteCorporativo final == 4', finalCounts.clienteCorporativo === 4],
    ['clienteEmpresa final == 4', finalCounts.clienteEmpresa === 4],
    ['ventaCliente final == 3', finalCounts.ventaCliente === 3],
  ];

  for (const [name, ok] of checks) {
    console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  }

  if (checks.every(([, ok]) => ok)) {
    console.log('\n🎉 TODOS LOS TESTS PASARON');
  } else {
    console.log('\n⚠️  Algunos tests no cumplieron las expectativas; revisa arriba.');
    process.exitCode = 1;
  }

  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});

process.on('exit', () => {
  try { fs.rmSync(shimDir, { recursive: true, force: true }); } catch {}
});
