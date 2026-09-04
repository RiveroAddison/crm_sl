/**
 * Test HTTP de los endpoints Profit.
 * 1. Login con credenciales master
 * 2. POST /api/auth/context con la empresa
 * 3. POST /api/profit/sync/test
 * 4. POST /api/profit/sync/all
 */

const BASE = 'http://localhost:4500';

async function post(path, body, cookies = '') {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5179',
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: JSON.stringify(body),
  });
  const setCookie = res.headers.get('set-cookie');
  let cookieHeader = cookies;
  if (setCookie) {
    const parts = setCookie.split(/,(?=[^;]+=)/g).map((s) => s.split(';')[0]);
    cookieHeader = [cookies, ...parts].filter(Boolean).join('; ');
  }
  return { status: res.status, data: await res.json(), cookieHeader };
}

async function get(path, cookies = '') {
  const res = await fetch(BASE + path, {
    headers: {
      Origin: 'http://localhost:5179',
      ...(cookies ? { Cookie: cookies } : {}),
    },
  });
  return { status: res.status, data: await res.json() };
}

(async () => {
  console.log('--- LOGIN ---');
  const login = await post('/api/auth/login', { email: 'master@sanluis.com', password: 'admin1234' });
  console.log(JSON.stringify(login.data));
  let cookies = login.cookieHeader;
  const preAuthToken = login.data.data.preAuthToken;

  console.log('\n--- CONTEXT (selecciona empresa) ---');
  const { PrismaClient } = await import('@prisma/client');
  const p = new PrismaClient();
  const empresa = await p.empresa.findFirst({ where: { nombre: { contains: 'San Luis' } } });
  await p.$disconnect();
  console.log('empresaId:', empresa.id);

  const ctx = await post('/api/auth/context', { empresaId: empresa.id, preAuthToken }, cookies);
  console.log(JSON.stringify(ctx.data));
  cookies = ctx.cookieHeader;

  console.log('\n--- /api/profit/status ---');
  const st = await get('/api/profit/status', cookies);
  console.log(JSON.stringify(st.data, null, 2));

  console.log('\n--- /api/profit/sync/test ---');
  const test = await post('/api/profit/sync/test', { empresaId: empresa.id }, cookies);
  console.log(JSON.stringify(test.data, null, 2));

  console.log('\n--- /api/profit/sync/all (intentara conectar a MSSQL real; fallara si no esta accesible) ---');
  const all = await post('/api/profit/sync/all', { empresaId: empresa.id }, cookies);
  console.log(JSON.stringify(all.data, null, 2));

  console.log('\n--- /api/profit/sync/sellers ---');
  const s = await post('/api/profit/sync/sellers', { empresaId: empresa.id }, cookies);
  console.log(JSON.stringify(s.data, null, 2));
})();
