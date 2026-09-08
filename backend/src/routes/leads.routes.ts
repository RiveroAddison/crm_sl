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

const router = Router();

router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);
router.post('/:id/convert', promote);
router.post('/:id/aprobar', approve);
router.post('/:id/rechazar', reject);
router.get('/:id/rechazos', listRechazos);
router.get('/:id/actividades', listActividadesEndpoint);
router.post('/:id/actividades', createActividadEndpoint);

export default router;
