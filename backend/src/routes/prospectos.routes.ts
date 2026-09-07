import { Router } from 'express';
import { create, list, remove, updateStage } from '../controllers/prospectos.controller.js';
import { list as listActividades, create as createActividad } from '../controllers/actividadesOportunidad.controller.js';

const router = Router();
router.get('/', list);
router.post('/', create);
router.patch('/:id/etapa', updateStage);
router.delete('/:id', remove);
router.get('/:id/actividades', listActividades);
router.post('/:id/actividades', createActividad);
export default router;
