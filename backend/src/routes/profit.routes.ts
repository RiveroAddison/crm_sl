import { Router } from 'express';
import { syncAll, getStatus, testConectDB } from '../controllers/profit.controller.js';

const router = Router();

router.post('/sync/test', testConectDB);
router.post('/sync/all', syncAll);
router.get('/status', getStatus);

export default router;
