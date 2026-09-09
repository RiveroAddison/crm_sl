import { Router } from 'express';
import { list, listVendedoresByEmpresa, listVendedoresByRubro, get, create, update, remove } from '../controllers/usuarios.controller.js';
import { requireAuth, requireMasterOrAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, list);
router.get('/vendedores-empresa', requireAuth, listVendedoresByEmpresa);
router.get('/vendedores-rubro', requireAuth, listVendedoresByRubro);
router.get('/:id', requireMasterOrAdmin, get);
router.post('/', requireMasterOrAdmin, create);
router.put('/:id', requireMasterOrAdmin, update);
router.delete('/:id', requireMasterOrAdmin, remove);

export default router;
