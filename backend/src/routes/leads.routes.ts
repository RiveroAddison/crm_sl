import { Router } from 'express';
import { create, list, promote, remove, update } from '../controllers/leads.controller.js';

const router = Router();
router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);
router.post('/:id/convert', promote);
export default router;
