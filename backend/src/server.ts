import 'dotenv/config';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './docs/openapi.js';
import authRouter from './routes/auth.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import leadsRouter from './routes/leads.routes.js';
import pedidosRouter from './routes/pedidos.routes.js';
import prospectosRouter from './routes/prospectos.routes.js';
import visitasRouter from './routes/visitas.routes.js';
import usuariosRouter from './routes/usuarios.routes.js';
import empresasRouter from './routes/empresas.routes.js';
import empresasClientesRouter from './routes/empresasClientes.routes.js';
import profitRouter from './routes/profit.routes.js';
import {
  helmetMiddleware,
  stripInfoHeaders,
  corsMiddleware,
  corsErrorHandler,
  globalRateLimiter,
  logCorsSummary,
  logRateLimitSummary,
} from './utils/index.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

// 1) Cabeceras de seguridad (Helmet) y limpieza de headers informativos
app.use(helmetMiddleware);
app.use(stripInfoHeaders);

app.get('/api/docs.json', (_req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));

// 2) CORS estricto (whitelist desde CORS_ORIGINS)
app.use(corsMiddleware);

// 3) Rate limit global (protege toda la API de abuso basico)
app.use(globalRateLimiter);

// 4) Parseo JSON con limite de payload
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/prospectos', prospectosRouter);
app.use('/api/visitas', visitasRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/empresas', empresasRouter);
app.use('/api/empresas-clientes', empresasClientesRouter);
app.use('/api/profit', profitRouter);

// Middleware final: captura cualquier error de CORS lanzado por el middleware de cors
// y responde 403 con un JSON en lugar del HTML por defecto de Express.
app.use(corsErrorHandler);

app.listen(port, () => {
  logCorsSummary();
  logRateLimitSummary();
  console.log(`API CRM escuchando en http://localhost:${port}`);
});



