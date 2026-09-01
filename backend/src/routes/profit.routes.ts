import { Router } from 'express';
import { syncClientes, syncVentas, syncAll, getStatus, testConectDB } from '../controllers/profit.controller.js';

const router = Router();

router.post('/sync/test', testConectDB);
router.post('/sync/clientes', syncClientes);
router.post('/sync/ventas', syncVentas);
router.post('/sync/all', syncAll);
router.get('/status', getStatus);

export default router;
