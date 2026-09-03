import sql from 'mssql';
import type { Empresa } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

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

export async function syncClientesForEmpresa(empresa: Empresa) {
  // aqui va la logica para sincronizar clientes desde Profit a la base de datos local
  // por ejemplo, leer los clientes desde Profit y luego insertarlos o actualizarlos en la base de datos local
  // puedes usar la función connectionConfig para obtener la configuración de conexión a Profit
  // y luego usar sql.ConnectionPool para conectarte y ejecutar consultas
  // finalmente, puedes usar prisma para insertar o actualizar los clientes en la base de datos local
  return { empresa: empresa.nombre, syncedCount: 0 }; // devuelve un objeto con el nombre de la empresa y la cantidad de clientes sincronizados
}

export async function syncVentasForEmpresa(empresa: Empresa) {
  // aqui va la logica para sincronizar ventas desde Profit a la base de datos local
  // por ejemplo, leer las ventas desde Profit y luego insertarlas o actualizarlas en la base de datos local
  // puedes usar la función connectionConfig para obtener la configuración de conexión a Profit
  // y luego usar sql.ConnectionPool para conectarte y ejecutar consultas
  // finalmente, puedes usar prisma para insertar o actualizar las ventas en la base de datos local
  return { empresa: empresa.nombre, syncedCount: 0 }; // devuelve un objeto con el nombre de la empresa y la cantidad de ventas sincronizadas
}

export async function syncSellersForEmpresa(empresa: Empresa) {
  // aqui va la logica para sincronizar vendedores desde Profit a la base de datos local
  // por ejemplo, leer los vendedores desde Profit y luego insertarlos o actualizarlos en la base de datos local
  // puedes usar la función connectionConfig para obtener la configuración de conexión a Profit
  // y luego usar sql.ConnectionPool para conectarte y ejecutar consultas
  // finalmente, puedes usar prisma para insertar o actualizar los vendedores en la base de datos local
  return { empresa: empresa.nombre, syncedCount: 0 }; // devuelve un objeto con el nombre de la empresa y la cantidad de vendedores sincronizados
}
