import { Router } from 'express';
import { list, get, create, update, remove, syncFromGrupo, testConnection } from '../controllers/empresas.controller.js';
import { requireMasterOrAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/sync-from-grupo', requireMasterOrAdmin, syncFromGrupo);
router.get('/', requireMasterOrAdmin, list);
router.get('/:id', requireMasterOrAdmin, get);
router.post('/', requireMasterOrAdmin, create);
router.put('/:id', requireMasterOrAdmin, update);
router.delete('/:id', requireMasterOrAdmin, remove);
router.post('/:id/test-connection', requireMasterOrAdmin, testConnection);

export default router;
