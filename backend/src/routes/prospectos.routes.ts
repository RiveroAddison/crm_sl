import { Router } from 'express';
import { create, list, remove, updateStage } from '../controllers/prospectos.controller.js';

const router = Router();
router.get('/', list);
router.post('/', create);
router.patch('/:id/etapa', updateStage);
router.delete('/:id', remove);
export default router;
