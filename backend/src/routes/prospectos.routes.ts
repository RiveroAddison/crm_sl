import { Router } from 'express';
import { create, list, remove, updateStage } from '../controllers/prospectos.controller.js';
import { list as listActividades, create as createActividad } from '../controllers/actividadesOportunidad.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/', requireAuth, list);
router.post('/', requireAuth, create);
router.patch('/:id/etapa', requireAuth, updateStage);
router.delete('/:id', requireAuth, remove);
router.get('/:id/actividades', requireAuth, listActividades);
router.post('/:id/actividades', requireAuth, createActividad);
export default router;
