import { Router } from 'express';
import {
  list,
  create,
  update,
  remove,
  promote,
  approve,
  reject,
  listRechazos,
  listActividadesEndpoint,
  createActividadEndpoint
} from '../controllers/leads.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, list);
router.post('/', requireAuth, create);
router.patch('/:id', requireAuth, update);
router.delete('/:id', requireAuth, remove);
router.post('/:id/convert', requireAuth, promote);
router.post('/:id/aprobar', requireAuth, approve);
router.post('/:id/rechazar', requireAuth, reject);
router.get('/:id/rechazos', requireAuth, listRechazos);
router.get('/:id/actividades', requireAuth, listActividadesEndpoint);
router.post('/:id/actividades', requireAuth, createActividadEndpoint);

export default router;
