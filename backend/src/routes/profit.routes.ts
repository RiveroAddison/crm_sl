import { Router } from 'express';
import {
  syncAll,
  syncClientes,
  syncSellers,
  syncVentas,
  getStatus,
  testConectDB
} from '../controllers/profit.controller.js';

const router = Router();

// Sincronización (todas requieren rol MASTER o ADMIN y, en su caso, { empresaId }).
router.post('/sync/test', testConectDB);          // diagnóstico sin escritura
router.post('/sync/all', syncAll);                // vendedores -> clientes -> ventas
router.post('/sync/sellers', syncSellers);        // solo vendedores
router.post('/sync/clientes', syncClientes);      // solo clientes
router.post('/sync/ventas', syncVentas);          // solo ventas (últimos 9 meses móviles)
router.get('/status', getStatus);

export default router;
